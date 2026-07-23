const scanButton = document.querySelector("#scanButton");
const connectButton = document.querySelector("#connectButton");
const disconnectButton = document.querySelector("#disconnectButton");
const uriSelect = document.querySelector("#uriSelect");
const statusBadge = document.querySelector("#statusBadge");
const statusMessage = document.querySelector("#statusMessage");
const connectionText = document.querySelector("#connectionText");
const blockList = document.querySelector("#blockList");
const scriptStack = document.querySelector("#scriptStack");
const scriptPlaceholder = document.querySelector("#scriptPlaceholder");
const startButton = document.querySelector("#startButton");
const stopButton = document.querySelector("#stopButton");
const clearButton = document.querySelector("#clearButton");

const SNAP_GAP = 8;
const SNAP_THRESHOLD = 32;
const DEFAULT_BLOCK_DEFINITIONS = [
  { command: "start", label: "start", style: "start", description: "Start the program from here." },
  { command: "spin_motors", label: "spin fans 1 sec", style: "fan", description: "Spin the motors for one second." },
  { command: "takeoff", label: "take off", style: "motion", description: "Take off and hover briefly." },
  { command: "forward", label: "fly forward 20 cm", style: "motion", description: "Fly the Crazyflie forward 20 centimeters." },
  { command: "right", label: "turn right 90 deg", style: "motion", description: "Rotate the Crazyflie 90 degrees to the right." },
  { command: "move_linear_simple", label: "move linear simple", style: "motion", description: "Fly forward 0.5m, turn 180 degrees, fly forward 0.5m." },
  { command: "take_off_simple", label: "take off simple", style: "motion", description: "Take off, hover for 3 seconds, then land." },
  { command: "move_box_limit", label: "move in box limit", style: "motion", description: "Fly within a 0.5m box using the flow deck's position estimate (needs a flow deck)." },
  { command: "wait", label: "wait 1 sec", style: "wait", description: "Pause the script for one second." },
  { command: "land", label: "land", style: "stop", description: "Land the Crazyflie safely." },
];

const blocks = [];
let connected = false;
let activeDragBlock = null;
let activeDragPointerId = null;
let dragOffset = { x: 0, y: 0 };
let dragSource = null;
let blockCounter = 0;

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

function setBusy(isBusy) {
  scanButton.disabled = isBusy;
  connectButton.disabled = isBusy;
  disconnectButton.disabled = isBusy;
  startButton.disabled = isBusy || !connected;
  stopButton.disabled = isBusy || !connected;
}

function renderStatus(status) {
  connected = status.connected;
  statusBadge.textContent = status.status;
  statusBadge.className = `status-badge ${status.status}`;
  statusMessage.textContent = status.message;
  connectionText.textContent = getConnectionLabel(status);
  connectionText.title = status.connected && status.uri ? status.uri : "";
  startButton.disabled = !status.connected;
  stopButton.disabled = !status.connected;
  scriptStack.classList.toggle("connected", status.connected);

  if (status.connected && status.uri) {
    ensureUriOption(status.uri);
  }
}

function getConnectionLabel(status) {
  if (status.connected) return "Connected";
  if (status.status === "connecting") return "Connecting";
  if (status.status === "error") return "Connection error";
  return "Disconnected";
}

function ensureUriOption(uri) {
  const hasOption = Array.from(uriSelect.options).some((option) => option.value === uri);
  if (!hasOption) {
    const option = document.createElement("option");
    option.value = uri;
    option.textContent = uri;
    uriSelect.append(option);
  }
  uriSelect.value = uri;
}

function renderDrones(drones) {
  uriSelect.innerHTML = "";
  if (drones.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No Crazyflie found";
    uriSelect.append(option);
    return;
  }

  drones.forEach((drone) => {
    const option = document.createElement("option");
    option.value = drone.uri;
    option.textContent = drone.info ? `${drone.uri} (${drone.info})` : drone.uri;
    if (drone.found) {
      option.selected = true;
    }
    uriSelect.append(option);
  });
}

function renderBlockToolbox() {
  const definitions = Array.isArray(window.BLOCK_DEFINITIONS) ? window.BLOCK_DEFINITIONS : DEFAULT_BLOCK_DEFINITIONS;
  blocks.length = 0;
  blockList.innerHTML = "";

  definitions.forEach((definition) => {
    const button = document.createElement("button");
    button.className = `block ${definition.style}`;
    button.draggable = false;
    button.dataset.command = definition.command;
    button.title = definition.description || "";
    button.type = "button";
    button.textContent = definition.label;
    button.addEventListener("pointerdown", startToolboxDrag);
    blockList.append(button);
    blocks.push(button);
  });
}

scanButton.addEventListener("click", async () => {
  setBusy(true);
  statusMessage.textContent = "Scanning Crazyradio interfaces...";
  try {
    const payload = await requestJson("/api/scan");
    renderDrones(payload.drones);
    renderStatus(payload.status);
  } catch (error) {
    renderStatus({ status: "error", message: error.message, connected: false, uri: null });
  } finally {
    setBusy(false);
  }
});

connectButton.addEventListener("click", async () => {
  const uri = uriSelect.value;
  if (!uri) {
    renderStatus({ status: "error", message: "Scan and select a Crazyflie URI first.", connected: false, uri: null });
    return;
  }

  setBusy(true);
  statusMessage.textContent = `Connecting to ${uri}...`;
  try {
    const payload = await requestJson("/api/connect", {
      method: "POST",
      body: JSON.stringify({ uri }),
    });
    renderStatus(payload.status);
  } catch (error) {
    renderStatus({ status: "error", message: error.message, connected: false, uri });
  } finally {
    setBusy(false);
  }
});

disconnectButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    const payload = await requestJson("/api/disconnect", { method: "POST" });
    renderStatus(payload.status);
  } catch (error) {
    renderStatus({ status: "error", message: error.message, connected: false, uri: null });
  } finally {
    setBusy(false);
  }
});

function makeScriptBlock(sourceBlock) {
  const block = sourceBlock.cloneNode(true);
  block.id = `script-block-${blockCounter}`;
  block.classList.add("script-block");
  block.style.position = "absolute";
  block.style.left = "24px";
  block.style.top = "24px";
  block.draggable = false;
  block.disabled = false;
  block.dataset.scriptId = String(blockCounter);
  blockCounter += 1;

  const removeButton = document.createElement("span");
  removeButton.className = "remove-block";
  removeButton.textContent = "x";
  removeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    block.remove();
    updatePlaceholder();
  });

  block.append(removeButton);
  block.addEventListener("pointerdown", startScriptBlockDrag);
  return block;
}

function updatePlaceholder() {
  const hasBlocks = scriptStack.querySelector(".script-block") !== null;
  scriptPlaceholder.hidden = hasBlocks;
}

function getSnappedPosition(block, x, y) {
  const existingBlocks = Array.from(scriptStack.querySelectorAll(".script-block")).filter((candidate) => candidate !== block);
  let best = { x, y, distance: Infinity, snapSide: null, target: null };

  const blockWidth = block.offsetWidth;
  const blockLeft = x;
  const blockRight = x + blockWidth;

  existingBlocks.forEach((candidate) => {
    const rect = candidate.getBoundingClientRect();
    const stackRect = scriptStack.getBoundingClientRect();
    const candidateX = rect.left - stackRect.left;
    const candidateY = rect.top - stackRect.top;
    const candidateWidth = rect.width;
    const candidateLeft = candidateX;
    const candidateRight = candidateX + candidateWidth;

    const overlap = Math.min(blockRight, candidateRight) - Math.max(blockLeft, candidateLeft);
    const horizontalMatch = overlap > Math.min(blockWidth, candidateWidth) * 0.4;
    const edgeNear = Math.abs(blockLeft - candidateRight) < SNAP_THRESHOLD || Math.abs(blockRight - candidateLeft) < SNAP_THRESHOLD;
    if (!horizontalMatch && !edgeNear) return;

    const bottomY = candidateY + rect.height + SNAP_GAP;
    const topY = candidateY - block.offsetHeight - SNAP_GAP;
    const bottomDistance = Math.abs(bottomY - y);
    const topDistance = Math.abs(topY - y);

    if (bottomDistance < best.distance && bottomDistance < SNAP_THRESHOLD) {
      best = { x: candidateX, y: bottomY, distance: bottomDistance, snapSide: "bottom", target: candidate };
    }
    if (topDistance < best.distance && topDistance < SNAP_THRESHOLD) {
      best = { x: candidateX, y: topY, distance: topDistance, snapSide: "top", target: candidate };
    }
  });

  if (best.target) {
    showSnapPreview(best.target, best.snapSide);
    return best;
  }

  hideSnapPreview();
  return { x, y };
}

function startToolboxDrag(event) {
  if (event.button !== 0) return;
  const source = event.currentTarget;
  const sourceRect = source.getBoundingClientRect();
  dragSource = source;

  const block = makeScriptBlock(source);
  block.classList.add("floating-block", "dragging");
  block.style.position = "fixed";
  block.style.left = `${sourceRect.left}px`;
  block.style.top = `${sourceRect.top}px`;
  block.style.width = `${sourceRect.width}px`;
  block.style.opacity = "0.92";
  document.body.append(block);

  activeDragBlock = block;
  activeDragPointerId = event.pointerId;
  dragOffset = {
    x: event.clientX - sourceRect.left,
    y: event.clientY - sourceRect.top,
  };
  document.addEventListener("pointermove", moveActiveDragBlock);
  document.addEventListener("pointerup", endActiveDragBlock);
  document.addEventListener("pointercancel", endActiveDragBlock);
  event.preventDefault();
}

function startScriptBlockDrag(event) {
  if (event.button !== 0) return;
  if (event.target.classList.contains("remove-block")) return;

  const block = event.currentTarget;
  activeDragBlock = block;
  activeDragPointerId = event.pointerId;
  dragOffset = {
    x: event.clientX - block.getBoundingClientRect().left,
    y: event.clientY - block.getBoundingClientRect().top,
  };
  block.classList.add("dragging");
  document.addEventListener("pointermove", moveActiveDragBlock);
  document.addEventListener("pointerup", endActiveDragBlock);
  document.addEventListener("pointercancel", endActiveDragBlock);
  event.preventDefault();
}

function moveActiveDragBlock(event) {
  if (!activeDragBlock || event.pointerId !== activeDragPointerId) return;
  const rect = scriptStack.getBoundingClientRect();

  if (dragSource) {
    activeDragBlock.style.left = `${event.clientX - dragOffset.x}px`;
    activeDragBlock.style.top = `${event.clientY - dragOffset.y}px`;

    if (isPointInStage(event)) {
      const rawX = event.clientX - rect.left - dragOffset.x;
      const rawY = event.clientY - rect.top - dragOffset.y;
      const boundedX = Math.max(0, Math.min(rawX, rect.width - activeDragBlock.offsetWidth));
      const boundedY = Math.max(0, Math.min(rawY, rect.height - activeDragBlock.offsetHeight));
      getSnappedPosition(activeDragBlock, boundedX, boundedY);
      scriptStack.classList.add("drag-over");
    } else {
      hideSnapPreview();
      scriptStack.classList.remove("drag-over");
    }
    return;
  }

  const rawX = event.clientX - rect.left - dragOffset.x;
  const rawY = event.clientY - rect.top - dragOffset.y;
  const boundedX = Math.max(0, Math.min(rawX, rect.width - activeDragBlock.offsetWidth));
  const boundedY = Math.max(0, Math.min(rawY, rect.height - activeDragBlock.offsetHeight));
  const snapped = getSnappedPosition(activeDragBlock, boundedX, boundedY);
  activeDragBlock.style.left = `${snapped.x}px`;
  activeDragBlock.style.top = `${snapped.y}px`;
}

function showSnapPreview(targetBlock, side) {
  hideSnapPreview();
  if (!targetBlock || !side || !activeDragBlock) return;

  const preview = document.createElement("div");
  preview.className = "snap-preview";
  preview.dataset.snapTarget = targetBlock.dataset.scriptId;
  preview.dataset.snapSide = side;

  const targetRect = targetBlock.getBoundingClientRect();
  const stackRect = scriptStack.getBoundingClientRect();
  const left = targetRect.left - stackRect.left;
  const top = targetRect.top - stackRect.top;

  preview.style.left = `${left}px`;
  preview.style.width = `${targetRect.width}px`;
  preview.style.height = `${activeDragBlock.offsetHeight}px`;
  preview.style.top = side === "bottom" ? `${top + targetRect.height + 4}px` : `${top - activeDragBlock.offsetHeight - 4}px`;
  scriptStack.append(preview);
}

function hideSnapPreview() {
  scriptStack.querySelectorAll(".snap-preview").forEach((preview) => preview.remove());
}

function endActiveDragBlock(event) {
  if (!activeDragBlock || event.pointerId !== activeDragPointerId) return;

  document.removeEventListener("pointermove", moveActiveDragBlock);
  document.removeEventListener("pointerup", endActiveDragBlock);
  document.removeEventListener("pointercancel", endActiveDragBlock);
  hideSnapPreview();

  if (!isPointInStage(event)) {
    activeDragBlock.remove();
  } else if (dragSource) {
    const rect = scriptStack.getBoundingClientRect();
    const rawX = event.clientX - rect.left - dragOffset.x;
    const rawY = event.clientY - rect.top - dragOffset.y;
    const boundedX = Math.max(0, Math.min(rawX, rect.width - activeDragBlock.offsetWidth));
    const boundedY = Math.max(0, Math.min(rawY, rect.height - activeDragBlock.offsetHeight));
    const snapped = getSnappedPosition(activeDragBlock, boundedX, boundedY);
    hideSnapPreview();

    activeDragBlock.classList.remove("floating-block", "dragging");
    activeDragBlock.style.position = "absolute";
    activeDragBlock.style.width = "";
    activeDragBlock.style.left = `${snapped.x}px`;
    activeDragBlock.style.top = `${snapped.y}px`;
    activeDragBlock.style.opacity = "1";
    scriptStack.append(activeDragBlock);
  } else {
    activeDragBlock.style.opacity = "1";
    activeDragBlock.classList.remove("dragging");
  }

  scriptStack.classList.remove("drag-over");
  activeDragBlock = null;
  activeDragPointerId = null;
  dragSource = null;
  updatePlaceholder();
}

function isPointInStage(event) {
  const rect = scriptStack.getBoundingClientRect();
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}

clearButton.addEventListener("click", () => {
  scriptStack.querySelectorAll(".script-block").forEach((block) => block.remove());
  updatePlaceholder();
});

async function runCurrentScript() {
  if (!connected) {
    renderStatus({ status: "error", message: "Connect the Crazyflie before running blocks.", connected: false, uri: null });
    return;
  }

  const blocksInStack = Array.from(scriptStack.querySelectorAll(".script-block"));
  if (blocksInStack.length === 0) {
    statusMessage.textContent = "Add a start block and some commands before running.";
    return;
  }

  const sortedBlocks = blocksInStack.slice().sort((a, b) => {
    return parseInt(a.style.top || "0", 10) - parseInt(b.style.top || "0", 10);
  });

  const startIndex = sortedBlocks.findIndex((block) => block.dataset.command === "start");
  if (startIndex === -1) {
    statusMessage.textContent = "Place a start block at the top of the script before running.";
    return;
  }

  const script = sortedBlocks.slice(startIndex + 1).map((block) => block.dataset.command).filter(Boolean);
  if (script.length === 0) {
    statusMessage.textContent = "Add blocks below the start block before running.";
    return;
  }

  setBusy(true);
  statusMessage.textContent = `Running: ${script.join(" -> ")}`;
  try {
    const payload = await requestJson("/api/run_script", {
      method: "POST",
      body: JSON.stringify({ commands: script }),
    });
    renderStatus(payload.status);
  } catch (error) {
    renderStatus({ status: "error", message: error.message, connected, uri: uriSelect.value });
  } finally {
    setBusy(false);
  }
}

startButton.addEventListener("click", runCurrentScript);

stopButton.addEventListener("click", async () => {
  if (!connected) {
    renderStatus({ status: "error", message: "Connect the Crazyflie before stopping.", connected: false, uri: null });
    return;
  }

  setBusy(true);
  statusMessage.textContent = "Stopping...";
  try {
    const payload = await requestJson("/api/stop", { method: "POST" });
    renderStatus(payload.status);
  } catch (error) {
    renderStatus({ status: "error", message: error.message, connected, uri: uriSelect.value });
  } finally {
    setBusy(false);
  }
});

renderBlockToolbox();

requestJson("/api/status")
  .then(renderStatus)
  .catch((error) => {
    renderStatus({ status: "error", message: error.message, connected: false, uri: null });
  });
