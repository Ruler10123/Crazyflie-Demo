const scanButton = document.querySelector("#scanButton");
const connectButton = document.querySelector("#connectButton");
const disconnectButton = document.querySelector("#disconnectButton");
const uriSelect = document.querySelector("#uriSelect");
const statusBadge = document.querySelector("#statusBadge");
const statusMessage = document.querySelector("#statusMessage");
const connectionText = document.querySelector("#connectionText");
const stageTitle = document.querySelector("#stageTitle");
const blocks = Array.from(document.querySelectorAll(".block"));
const scriptStack = document.querySelector("#scriptStack");
const scriptPlaceholder = document.querySelector("#scriptPlaceholder");
const runButton = document.querySelector("#runButton");
const clearButton = document.querySelector("#clearButton");

let connected = false;
let draggedBlock = null;
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
    option.textContent = drone.uri;
    uriSelect.append(option);
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
  block.draggable = true;
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
  bindScriptDrag(block);
  return block;
}

function addBlockToScript(sourceBlock, beforeBlock = null) {
  const block = makeScriptBlock(sourceBlock);
  if (beforeBlock) {
    scriptStack.insertBefore(block, beforeBlock);
  } else {
    scriptStack.append(block);
  }
  updatePlaceholder();
}

function updatePlaceholder() {
  const hasBlocks = scriptStack.querySelector(".script-block") !== null;
  scriptPlaceholder.hidden = hasBlocks;
}

function getBlockAfter(pointerY) {
  const scriptBlocks = Array.from(scriptStack.querySelectorAll(".script-block:not(.dragging)"));
  return scriptBlocks.reduce(
    (closest, block) => {
      const box = block.getBoundingClientRect();
      const offset = pointerY - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, block };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, block: null },
  ).block;
}

function bindScriptDrag(block) {
  block.addEventListener("dragstart", () => {
    draggedBlock = block;
    block.classList.add("dragging");
  });

  block.addEventListener("dragend", () => {
    block.classList.remove("dragging");
    draggedBlock = null;
    updatePlaceholder();
  });
}

blocks.forEach((block) => {
  block.addEventListener("dragstart", (event) => {
    draggedBlock = block;
    event.dataTransfer.setData("text/plain", block.dataset.command);
    event.dataTransfer.effectAllowed = "copy";
  });

  block.addEventListener("dragend", () => {
    draggedBlock = null;
  });

  block.addEventListener("click", () => {
    addBlockToScript(block);
  });
});

scriptStack.addEventListener("dragover", (event) => {
  event.preventDefault();
  const afterBlock = getBlockAfter(event.clientY);
  if (draggedBlock && draggedBlock.classList.contains("script-block")) {
    if (afterBlock) {
      scriptStack.insertBefore(draggedBlock, afterBlock);
    } else {
      scriptStack.append(draggedBlock);
    }
  }
  scriptStack.classList.add("drag-over");
});

scriptStack.addEventListener("dragleave", () => {
  scriptStack.classList.remove("drag-over");
});

scriptStack.addEventListener("drop", (event) => {
  event.preventDefault();
  scriptStack.classList.remove("drag-over");
  if (!draggedBlock || draggedBlock.classList.contains("script-block")) {
    updatePlaceholder();
    return;
  }

  addBlockToScript(draggedBlock, getBlockAfter(event.clientY));
});

clearButton.addEventListener("click", () => {
  scriptStack.querySelectorAll(".script-block").forEach((block) => block.remove());
  updatePlaceholder();
});

runButton.addEventListener("click", async () => {
  const script = Array.from(scriptStack.querySelectorAll(".script-block")).map((block) => block.dataset.command);
  if (!connected) {
    renderStatus({ status: "error", message: "Connect the Crazyflie before running blocks.", connected: false, uri: null });
    return;
  }
  if (script.length === 0) {
    statusMessage.textContent = "Add at least one block first.";
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

requestJson("/api/status")
  .then(renderStatus)
  .catch((error) => {
    renderStatus({ status: "error", message: error.message, connected: false, uri: null });
  });
