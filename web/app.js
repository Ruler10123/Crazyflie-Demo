const scanButton = document.querySelector("#scanButton");
const connectButton = document.querySelector("#connectButton");
const disconnectButton = document.querySelector("#disconnectButton");
const uriSelect = document.querySelector("#uriSelect");
const statusBadge = document.querySelector("#statusBadge");
const statusMessage = document.querySelector("#statusMessage");
const connectionText = document.querySelector("#connectionText");
const stageTitle = document.querySelector("#stageTitle");
const blocks = [];
const scriptStack = document.querySelector("#scriptStack");
const scriptPlaceholder = document.querySelector("#scriptPlaceholder");
const stageArea = document.querySelector("#stageArea");
const workspaceArea = document.querySelector("#workspaceArea");
const runButton = document.querySelector("#runButton");
const clearButton = document.querySelector("#clearButton");
const blockList = document.querySelector("#blockList");

const SNAP_GAP = 8;
const SNAP_THRESHOLD = 32;

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
  runButton.disabled = isBusy || !connected;
}

function renderStatus(status) {
  connected = status.connected;
  statusBadge.textContent = status.status;
  statusBadge.className = `status-badge ${status.status}`;
  statusMessage.textContent = status.message;
  connectionText.textContent = status.connected ? status.uri : "Disconnected";
  stageTitle.textContent = status.connected ? "Ready for blocks" : "Connect your Crazyflie first";
  runButton.disabled = !status.connected;
  scriptStack.classList.toggle("connected", status.connected);
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
  if (!Array.isArray(BLOCK_DEFINITIONS)) return;
  blocks.length = 0;
  blockList.innerHTML = "";

  BLOCK_DEFINITIONS.forEach((definition) => {
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

function addBlockToScript(sourceBlock, x = 24, y = 24) {
  const block = makeScriptBlock(sourceBlock);
  block.style.left = `${x}px`;
  block.style.top = `${y}px`;
  scriptStack.append(block);
  updatePlaceholder();
}

function updatePlaceholder() {
  const hasBlocks = scriptStack.querySelector(".script-block") !== null;
  scriptPlaceholder.hidden = hasBlocks;
}

function getWorkspacePosition(event) {
  const rect = scriptStack ? scriptStack.getBoundingClientRect() : null;
  if (!rect) {
    return { x: 24, y: 24 };
  }

  const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width - 80));
  const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height - 40));
  return { x, y };
}

function getSnappedPosition(block, x, y) {
  const existingBlocks = Array.from(scriptStack.querySelectorAll('.script-block')).filter((candidate) => candidate !== block);
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

    if (!horizontalMatch && !edgeNear) {
      return;
    }

    const bottomY = candidateY + rect.height + SNAP_GAP;
    const topY = candidateY - block.offsetHeight - SNAP_GAP;
    const bottomDistance = Math.abs(bottomY - y);
    const topDistance = Math.abs(topY - y);

    if (bottomDistance < best.distance && bottomDistance < SNAP_THRESHOLD) {
      best = { x: candidateX, y: bottomY, distance: bottomDistance, snapSide: 'bottom', target: candidate };
    }
    if (topDistance < best.distance && topDistance < SNAP_THRESHOLD) {
      best = { x: candidateX, y: topY, distance: topDistance, snapSide: 'top', target: candidate };
    }
  });

  if (best.target) {
    showSnapPreview(best.target, best.side);
    return best;
  }

  hideSnapPreview();
  return { x, y };
}

function startToolboxDrag(event) {
  if (event.button !== 0) return;
  const source = event.currentTarget;
  dragSource = source;
  const block = makeScriptBlock(source);
  const position = getWorkspacePosition(event);
  block.style.left = `${position.x}px`;
  block.style.top = `${position.y}px`;
  block.style.opacity = "0.8";
  block.classList.add("dragging");
  scriptStack.append(block);
  activeDragBlock = block;
  activeDragPointerId = event.pointerId;
  dragOffset = {
    x: event.clientX - block.getBoundingClientRect().left,
    y: event.clientY - block.getBoundingClientRect().top,
  };
  block.setPointerCapture(activeDragPointerId);
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
  block.setPointerCapture(activeDragPointerId);
  document.addEventListener("pointermove", moveActiveDragBlock);
  document.addEventListener("pointerup", endActiveDragBlock);
  document.addEventListener("pointercancel", endActiveDragBlock);
  event.preventDefault();
}

function moveActiveDragBlock(event) {
  if (!activeDragBlock || event.pointerId !== activeDragPointerId) return;
  const rect = scriptStack ? scriptStack.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
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

  const preview = document.createElement('div');
  preview.className = 'snap-preview';
  preview.dataset.snapTarget = targetBlock.dataset.scriptId;
  preview.dataset.snapSide = side;
  const targetRect = targetBlock.getBoundingClientRect();
  const stackRect = scriptStack.getBoundingClientRect();

  const left = targetRect.left - stackRect.left;
  const top = targetRect.top - stackRect.top;
  if (side === 'bottom') {
    preview.style.left = `${left}px`;
    preview.style.top = `${top + targetRect.height + 4}px`;
    preview.style.width = `${targetRect.width}px`;
    preview.style.height = `${activeDragBlock.offsetHeight}px`;
  } else if (side === 'top') {
    preview.style.left = `${left}px`;
    preview.style.top = `${top - activeDragBlock.offsetHeight - 4}px`;
    preview.style.width = `${targetRect.width}px`;
    preview.style.height = `${activeDragBlock.offsetHeight}px`;
  } else {
    return;
  }

  preview.style.opacity = '0.45';
  scriptStack.append(preview);
}

function hideSnapPreview() {
  scriptStack.querySelectorAll('.snap-preview').forEach((preview) => preview.remove());
}

function endActiveDragBlock(event) {
  if (!activeDragBlock || event.pointerId !== activeDragPointerId) return;
  activeDragBlock.releasePointerCapture(activeDragPointerId);
  document.removeEventListener('pointermove', moveActiveDragBlock);
  document.removeEventListener('pointerup', endActiveDragBlock);
  document.removeEventListener('pointercancel', endActiveDragBlock);
  hideSnapPreview();
  if (!isPointInStage(event)) {
    activeDragBlock.remove();
  } else {
    activeDragBlock.style.opacity = '1';
    activeDragBlock.classList.remove('dragging');
  }
  activeDragBlock = null;
  activeDragPointerId = null;
  dragSource = null;
  updatePlaceholder();
}

function isPointInStage(event) {
  const rect = scriptStack ? scriptStack.getBoundingClientRect() : null;
  if (!rect) return false;
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}






clearButton.addEventListener("click", () => {
  scriptStack.querySelectorAll(".script-block").forEach((block) => block.remove());
  updatePlaceholder();
});

runButton.addEventListener("click", async () => {
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
    renderStatus({ status: "error", message: error.message, connected, uri: connectionText.textContent });
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
