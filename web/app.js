const scanButton = document.querySelector("#scanButton");
const connectButton = document.querySelector("#connectButton");
const disconnectButton = document.querySelector("#disconnectButton");
const uriSelect = document.querySelector("#uriSelect");
const statusBadge = document.querySelector("#statusBadge");
const statusMessage = document.querySelector("#statusMessage");
const connectionText = document.querySelector("#connectionText");
const languageSelect = document.querySelector("#languageSelect");
const blockList = document.querySelector("#blockList");
const scriptStack = document.querySelector("#scriptStack");
const scriptPlaceholder = document.querySelector("#scriptPlaceholder");
const startButton = document.querySelector("#startButton");
const stopButton = document.querySelector("#stopButton");
const clearButton = document.querySelector("#clearButton");

const SNAP_GAP = 8;
const SNAP_THRESHOLD = 32;
const LANGUAGE_KEY = "crazyflieBlocksLanguage";
const SUPPORTED_LANGUAGES = ["en", "fr"];
const DEFAULT_BLOCK_DEFINITIONS = [
  { command: "start", label: { en: "start", fr: "départ" }, style: "start", description: { en: "Start the program from here.", fr: "Démarrer le programme ici." } },
  {
    command: "spin_motors",
    label: { en: "spin fans", fr: "tourner hélices" },
    style: "fan",
    description: { en: "Spin the motors for one second.", fr: "Faire tourner les moteurs pendant une seconde." },
    inputs: [{ name: "duration_seconds", label: { en: "duration sec", fr: "durée s" }, type: "number", value: 1, min: 0.1, max: 50, step: 0.1 }],
  },
  {
    command: "takeoff",
    label: { en: "take off", fr: "décoller" },
    style: "motion",
    description: { en: "Take off and hover briefly.", fr: "Décoller et rester brièvement en vol stationnaire." },
    inputs: [
      { name: "height_m", label: { en: "height m", fr: "hauteur m" }, type: "number", value: 0.3, min: 0.1, max: 1, step: 0.1 },
    ],
  },
  {
    command: "forward",
    label: { en: "fly forward", fr: "avancer" },
    style: "motion",
    description: { en: "Fly the Crazyflie forward 20 centimeters.", fr: "Faire avancer le Crazyflie de 20 centimètres." },
    inputs: [{ name: "distance_cm", label: { en: "distance cm", fr: "distance cm" }, type: "number", value: 20, min: 1, max: 200, step: 1 }],
  },
  {
    command: "right",
    label: { en: "turn right", fr: "tourner à droite" },
    style: "motion",
    description: { en: "Rotate the Crazyflie 90 degrees to the right.", fr: "Faire tourner le Crazyflie de 90 degrés vers la droite." },
    inputs: [{ name: "degrees", label: { en: "angle deg", fr: "angle deg" }, type: "number", value: 90, min: 1, max: 360, step: 1 }],
  },
  {
    command: "move_linear_simple",
    label: { en: "move linear", fr: "trajet linéaire" },
    style: "motion",
    description: { en: "Fly forward 0.5m, turn 180 degrees, fly forward 0.5m.", fr: "Avancer de 0,5 m, tourner de 180 degrés, puis avancer de 0,5 m." },
    inputs: [
      { name: "distance_m", label: { en: "distance m", fr: "distance m" }, type: "number", value: 0.5, min: 0.1, max: 2, step: 0.1 },
      { name: "turn_degrees", label: { en: "turn deg", fr: "rotation deg" }, type: "number", value: 180, min: 1, max: 360, step: 1 },
    ],
  },
  {
    command: "wait",
    label: { en: "wait", fr: "attendre" },
    style: "wait",
    description: { en: "Pause the script for one second.", fr: "Mettre le script en pause pendant une seconde." },
    inputs: [{ name: "duration_seconds", label: { en: "duration sec", fr: "durée s" }, type: "number", value: 1, min: 0.1, max: 10, step: 0.1 }],
  },
  { command: "take_off_simple", label: { en: "take off simple", fr: "décollage simple" }, style: "motion", description: { en: "Take off, hover for 3 seconds, then land.", fr: "Décoller, rester en vol stationnaire pendant 3 secondes, puis atterrir." } },
  {
    command: "move_box_limit",
    label: { en: "move in box limit", fr: "vol en zone limitée" },
    style: "motion",
    description: {
      en: "Fly within a 0.5m box using the flow deck's position estimate (needs a flow deck).",
      fr: "Voler dans une zone de 0,5 m avec l'estimation de position du flow deck (flow deck requis).",
    },
  },
  { command: "land", label: { en: "land", fr: "atterrir" }, style: "stop", description: { en: "Land the Crazyflie safely.", fr: "Faire atterrir le Crazyflie en sécurité." } },
];

const TRANSLATIONS = {
  en: {
    languageLabel: "Language",
    connectDrone: "Connect Drone",
    scan: "Scan",
    readyToScan: "Ready to scan for Crazyflie.",
    droneUri: "Drone URI",
    scanFirst: "Scan first...",
    connect: "Connect",
    disconnect: "Disconnect",
    blocks: "Blocks",
    start: "Start",
    stop: "Stop",
    clear: "Clear",
    dragBlocks: "Drag blocks from the left toolbox.",
    disconnected: "Disconnected",
    connected: "Connected",
    connecting: "Connecting",
    identifying: "Identifying",
    running: "Running",
    error: "Connection error",
    noCrazyflieFound: "No Crazyflie found",
    scanningInterfaces: "Scanning Crazyradio interfaces...",
    scanningAvailability: "Scanning and checking which drones are free...",
    available: "Available",
    inUse: "In use",
    connectedByYou: "Connected (you)",
    availabilityUnknown: "Unknown",
    selectCrazyflieFirst: "Scan and select a Crazyflie URI first.",
    addStartAndCommands: "Add a start block and some commands before running.",
    placeStartBlock: "Place a start block at the top of the script before running.",
    addBlocksBelowStart: "Add blocks below the start block before running.",
    connectBeforeRun: "Connect the Crazyflie before running blocks.",
    connectBeforeStop: "Connect the Crazyflie before stopping.",
    stopping: "Stopping...",
    runningScript: "Running: {commands}",
  },
  fr: {
    languageLabel: "Langue",
    connectDrone: "Connecter le drone",
    scan: "Scanner",
    readyToScan: "Prêt à scanner le Crazyflie.",
    droneUri: "URI du drone",
    scanFirst: "Scanner d'abord...",
    connect: "Connecter",
    disconnect: "Déconnecter",
    blocks: "Blocs",
    start: "Démarrer",
    stop: "Arrêter",
    clear: "Effacer",
    dragBlocks: "Glissez les blocs depuis la boîte à outils de gauche.",
    disconnected: "Déconnecté",
    connected: "Connecté",
    connecting: "Connexion",
    identifying: "Identification",
    running: "Exécution",
    error: "Erreur de connexion",
    noCrazyflieFound: "Aucun Crazyflie trouvé",
    scanningInterfaces: "Scan des interfaces Crazyradio...",
    scanningAvailability: "Scan et vérification des drones disponibles...",
    available: "Disponible",
    inUse: "Utilisé",
    connectedByYou: "Connecté (vous)",
    availabilityUnknown: "Inconnu",
    selectCrazyflieFirst: "Scannez et sélectionnez d'abord une URI Crazyflie.",
    addStartAndCommands: "Ajoutez un bloc de départ et des commandes avant l'exécution.",
    placeStartBlock: "Placez un bloc de départ en haut du script avant l'exécution.",
    addBlocksBelowStart: "Ajoutez des blocs sous le bloc de départ avant l'exécution.",
    connectBeforeRun: "Connectez le Crazyflie avant d'exécuter les blocs.",
    connectBeforeStop: "Connectez le Crazyflie avant d'arrêter.",
    stopping: "Arrêt...",
    runningScript: "Exécution : {commands}",
  },
};

let currentLanguage = getInitialLanguage();

const blocks = [];
let connected = false;
let activeDragBlock = null;
let activeDragPointerId = null;
let dragOffset = { x: 0, y: 0 };
let dragSource = null;
let blockCounter = 0;
let lastStatus = null;

function getInitialLanguage() {
  const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
  if (SUPPORTED_LANGUAGES.includes(savedLanguage)) return savedLanguage;
  return "en";
}

function t(key, replacements = {}) {
  const template = TRANSLATIONS[currentLanguage]?.[key] || TRANSLATIONS.en[key] || key;
  return Object.entries(replacements).reduce((text, [name, value]) => {
    return text.replace(`{${name}}`, value);
  }, template);
}

function localizedText(value) {
  if (value && typeof value === "object") {
    return value[currentLanguage] || value.en || "";
  }
  return value || "";
}

function getDefinitions() {
  return Array.isArray(window.BLOCK_DEFINITIONS) ? window.BLOCK_DEFINITIONS : DEFAULT_BLOCK_DEFINITIONS;
}

function getDefinition(command) {
  return getDefinitions().find((definition) => definition.command === command);
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  languageSelect.value = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.title = t(element.dataset.i18nTitle);
  });

  localizeUriSelect();
  updateBlockLanguage();
  if (lastStatus) {
    renderStatus(lastStatus);
  } else {
    connectionText.textContent = t("disconnected");
    statusBadge.textContent = t("disconnected");
    statusMessage.textContent = t("readyToScan");
  }
}

function localizeUriSelect() {
  Array.from(uriSelect.options).forEach((option) => {
    if (option.value === "") {
      option.textContent = option.dataset.emptyLabel ? t(option.dataset.emptyLabel) : t("scanFirst");
    }
  });
}

function updateBlockLanguage() {
  document.querySelectorAll(".block").forEach((block) => {
    const definition = getDefinition(block.dataset.command);
    if (!definition) return;
    const label = block.querySelector(".block-label");
    if (label) label.textContent = localizedText(definition.label);
    block.title = localizedText(definition.description);
    block.querySelectorAll(".block-input-wrap").forEach((wrapper) => {
      const input = wrapper.querySelector(".block-input");
      const unit = wrapper.querySelector(".block-input-unit");
      const inputDefinition = definition.inputs?.find((candidate) => candidate.name === input?.name);
      if (unit && inputDefinition) {
        unit.textContent = localizedText(inputDefinition.label);
      }
    });
  });
}

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

function setBusy(isBusy, allowStop = false) {
  scanButton.disabled = isBusy;
  connectButton.disabled = isBusy;
  disconnectButton.disabled = isBusy;
  startButton.disabled = isBusy || !connected;
  // Keep Stop clickable while a script runs so it can abort the run.
  stopButton.disabled = (isBusy && !allowStop) || !connected;
}

function renderStatus(status) {
  lastStatus = status;
  connected = status.connected;
  statusBadge.textContent = getStatusLabel(status.status);
  statusBadge.className = `status-badge ${status.status}`;
  statusMessage.textContent = localizeStatusMessage(status);
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
  if (status.connected) return t("connected");
  if (status.status === "connecting") return t("connecting");
  if (status.status === "error") return t("error");
  return t("disconnected");
}

function getStatusLabel(status) {
  return t(status) || status;
}

function localizeStatusMessage(status) {
  if (!status || !status.message) return "";
  if (status.message === "Ready to scan for Crazyflie.") return t("readyToScan");
  if (status.message === "No Crazyflie found") return t("noCrazyflieFound");
  return status.message;
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
    option.dataset.emptyLabel = "noCrazyflieFound";
    option.textContent = t("noCrazyflieFound");
    uriSelect.append(option);
    return;
  }

  let firstAvailableSelected = false;
  drones.forEach((drone) => {
    const option = document.createElement("option");
    option.value = drone.uri;
    const label = availabilityLabel(drone.availability);
    const base = drone.info ? `${drone.uri} (${drone.info})` : drone.uri;
    option.textContent = label ? `${base} — ${label}` : base;
    if (drone.availability) {
      option.dataset.availability = drone.availability;
    }
    // Auto-select the first available drone so the obvious choice is preselected.
    if (drone.availability === "available" && !firstAvailableSelected) {
      option.selected = true;
      firstAvailableSelected = true;
    }
    uriSelect.append(option);
  });
}

function availabilityLabel(availability) {
  switch (availability) {
    case "available":
      return t("available");
    case "in_use":
      return t("inUse");
    case "connected":
      return t("connectedByYou");
    case "unknown":
      return t("availabilityUnknown");
    default:
      return "";
  }
}

function renderBlockToolbox() {
  const definitions = getDefinitions();
  blocks.length = 0;
  blockList.innerHTML = "";

  definitions.forEach((definition) => {
    const block = document.createElement("div");
    block.className = `block ${definition.style}`;
    block.draggable = false;
    block.dataset.command = definition.command;
    block.title = localizedText(definition.description);
    block.role = "button";
    block.tabIndex = 0;
    renderBlockContent(block, definition);
    block.addEventListener("pointerdown", startToolboxDrag);
    blockList.append(block);
    blocks.push(block);
  });
}

function renderBlockContent(block, definition) {
  block.textContent = "";

  const label = document.createElement("span");
  label.className = "block-label";
  label.textContent = localizedText(definition.label);
  block.append(label);

  if (!Array.isArray(definition.inputs)) return;

  definition.inputs.forEach((inputDefinition) => {
    const wrapper = document.createElement("label");
    wrapper.className = "block-input-wrap";

    const input = document.createElement("input");
    input.className = "block-input";
    input.type = "text";
    input.inputMode = "decimal";
    input.name = inputDefinition.name;
    input.value = inputDefinition.value;
    input.dataset.defaultValue = inputDefinition.value;
    if (inputDefinition.min !== undefined) input.min = inputDefinition.min;
    if (inputDefinition.max !== undefined) input.max = inputDefinition.max;
    if (inputDefinition.step !== undefined) input.step = inputDefinition.step;

    const unit = document.createElement("span");
    unit.className = "block-input-unit";
    unit.textContent = localizedText(inputDefinition.label);

    wrapper.append(input, unit);
    block.append(wrapper);
  });
}

scanButton.addEventListener("click", async () => {
  setBusy(true);
  statusMessage.textContent = t("scanningAvailability");
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
    renderStatus({ status: "error", message: t("selectCrazyflieFirst"), connected: false, uri: null });
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
  if (event.target.closest("input")) return;
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
  if (event.target.closest("input")) return;

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
    renderStatus({ status: "error", message: t("connectBeforeRun"), connected: false, uri: null });
    return;
  }

  const blocksInStack = Array.from(scriptStack.querySelectorAll(".script-block"));
  if (blocksInStack.length === 0) {
    statusMessage.textContent = t("addStartAndCommands");
    return;
  }

  const sortedBlocks = blocksInStack.slice().sort((a, b) => {
    return parseInt(a.style.top || "0", 10) - parseInt(b.style.top || "0", 10);
  });

  const startIndex = sortedBlocks.findIndex((block) => block.dataset.command === "start");
  if (startIndex === -1) {
    statusMessage.textContent = t("placeStartBlock");
    return;
  }

  const script = sortedBlocks.slice(startIndex + 1).map(getScriptCommand).filter(Boolean);
  if (script.length === 0) {
    statusMessage.textContent = t("addBlocksBelowStart");
    return;
  }

  setBusy(true, true);
  statusMessage.textContent = t("runningScript", { commands: script.map(formatScriptCommand).join(" -> ") });
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

function getScriptCommand(block) {
  const command = block.dataset.command;
  if (!command) return null;

  const args = {};
  block.querySelectorAll(".block-input").forEach((input) => {
    const fallback = Number(input.dataset.defaultValue || 0);
    const value = parseBlockNumber(input.value);
    args[input.name] = Number.isFinite(value) ? value : fallback;
  });

  if (Object.keys(args).length === 0) return command;
  return { command, args };
}

function parseBlockNumber(value) {
  if (typeof value !== "string") return Number(value);
  const normalized = value
    .trim()
    .replace(/[０-９]/g, (char) => String(char.charCodeAt(0) - 0xff10))
    .replace(/．/g, ".")
    .replace(/－/g, "-");
  return Number(normalized);
}

function formatScriptCommand(entry) {
  const command = typeof entry === "string" ? entry : entry.command;
  const definition = getDefinition(command);
  const label = localizedText(definition?.label) || command;
  if (typeof entry === "string") return label;
  const values = Object.values(entry.args || {});
  if (values.length === 0) return label;
  return `${label}(${values.join(", ")})`;
}

startButton.addEventListener("click", runCurrentScript);

stopButton.addEventListener("click", async () => {
  if (!connected) {
    renderStatus({ status: "error", message: t("connectBeforeStop"), connected: false, uri: null });
    return;
  }

  setBusy(true);
  statusMessage.textContent = t("stopping");
  try {
    const payload = await requestJson("/api/stop", { method: "POST" });
    renderStatus(payload.status);
  } catch (error) {
    renderStatus({ status: "error", message: error.message, connected, uri: uriSelect.value });
  } finally {
    setBusy(false);
  }
});

languageSelect.addEventListener("change", () => {
  currentLanguage = SUPPORTED_LANGUAGES.includes(languageSelect.value) ? languageSelect.value : "en";
  localStorage.setItem(LANGUAGE_KEY, currentLanguage);
  applyLanguage();
});

renderBlockToolbox();
applyLanguage();

requestJson("/api/status")
  .then(renderStatus)
  .catch((error) => {
    renderStatus({ status: "error", message: error.message, connected: false, uri: null });
  });
