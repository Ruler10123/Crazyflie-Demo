const scanButton = document.querySelector("#scanButton");
const connectButton = document.querySelector("#connectButton");
const disconnectButton = document.querySelector("#disconnectButton");
const uriSelect = document.querySelector("#uriSelect");
const statusBadge = document.querySelector("#statusBadge");
const statusMessage = document.querySelector("#statusMessage");
const connectionText = document.querySelector("#connectionText");
const powerText = document.querySelector("#powerText");
const powerRefreshButton = document.querySelector("#powerRefreshButton");
const languageSelect = document.querySelector("#languageSelect");
const blockList = document.querySelector("#blockList");
const scriptStack = document.querySelector("#scriptStack");
const scriptPlaceholder = document.querySelector("#scriptPlaceholder");
const startButton = document.querySelector("#startButton");
const stopButton = document.querySelector("#stopButton");
const clearButton = document.querySelector("#clearButton");

const BLOCK_GAP = 8;
const STACK_ORIGIN_DEFAULT = { x: 24, y: 24 };
const POWER_REFRESH_MS = 10000;
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
    command: "figure_eight",
    label: { en: "figure 8", fr: "huit" },
    style: "motion",
    description: {
      en: "Fly a figure 8: one loop left, then one loop right (needs a flow deck).",
      fr: "Voler en huit : une boucle à gauche, puis une boucle à droite (flow deck requis).",
    },
    inputs: [
      { name: "radius_m", label: { en: "radius m", fr: "rayon m" }, type: "number", value: 0.3, min: 0.1, max: 1, step: 0.05 },
      { name: "velocity_m_s", label: { en: "speed m/s", fr: "vitesse m/s" }, type: "number", value: 0.3, min: 0.1, max: 0.6, step: 0.05 },
      { name: "laps", label: { en: "laps", fr: "tours" }, type: "number", value: 1, min: 1, max: 5, step: 1 },
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
    powerStatus: "Power",
    powerUnavailable: "Unavailable",
    powerReading: "Reading...",
    powerVoltageOnly: "{voltage} V",
    powerLevel: "{level}% ({voltage} V)",
    powerLevelEstimated: "{level}% est. ({voltage} V)",
    refreshPower: "Refresh",
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
    powerStatus: "Alimentation",
    powerUnavailable: "Indisponible",
    powerReading: "Lecture...",
    powerVoltageOnly: "{voltage} V",
    powerLevel: "{level} % ({voltage} V)",
    powerLevelEstimated: "{level} % est. ({voltage} V)",
    refreshPower: "Actualiser",
  },
};

let currentLanguage = getInitialLanguage();

const blocks = [];
// The script is one ordered stack. This array is the source of truth; pixel
// positions are always derived from it by layoutStack(), never the reverse.
const scriptOrder = [];
// Where the top of the stack sits on the canvas; moves when its head is dropped.
const stackOrigin = { ...STACK_ORIGIN_DEFAULT };
let connected = false;
let dragGroup = [];
let dragLayer = null;
let dropIndex = null;
let activeDragPointerId = null;
let dragOffset = { x: 0, y: 0 };
let blockCounter = 0;
let lastStatus = null;
let lastPower = null;
let powerPollId = null;
let powerRequestInFlight = false;

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
  layoutStack(); // relabelling can change block heights
  renderPower(lastPower);
  if (lastStatus) {
    renderStatus(lastStatus);
  } else {
    connectionText.textContent = t("disconnected");
    statusBadge.textContent = t("disconnected");
    statusMessage.textContent = t("readyToScan");
  }
}

function localizeUriSelect() {
  const connectedUri = lastStatus?.connected ? lastStatus.uri : null;
  Array.from(uriSelect.options).forEach((option) => {
    if (option.value === "") {
      option.textContent = option.dataset.emptyLabel ? t(option.dataset.emptyLabel) : t("scanFirst");
      return;
    }
    const availability = option.value === connectedUri ? "connected" : option.dataset.scanAvailability;
    applyOptionLabel(option, availability);
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
  powerRefreshButton.disabled = isBusy || !connected;
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
  powerRefreshButton.disabled = !status.connected;
  scriptStack.classList.toggle("connected", status.connected);

  refreshUriOptions(status.connected ? status.uri : null);
  if (status.power) {
    renderPower(status.power);
  } else if (!status.connected) {
    renderPower(null);
  }
  syncPowerPolling(status.connected);
}

function renderPower(power) {
  lastPower = power;
  if (!power || power.available === false) {
    powerText.textContent = t("powerUnavailable");
    powerText.title = power?.message || "";
    return;
  }

  const voltage = typeof power.voltage === "number" ? power.voltage.toFixed(2) : null;
  const level = typeof power.batteryLevel === "number" ? Math.round(power.batteryLevel) : null;

  if (level !== null && voltage !== null) {
    powerText.textContent = t(power.estimated ? "powerLevelEstimated" : "powerLevel", { level, voltage });
  } else if (voltage !== null) {
    powerText.textContent = t("powerVoltageOnly", { voltage });
  } else if (level !== null) {
    powerText.textContent = `${level}%`;
  } else {
    powerText.textContent = t("powerUnavailable");
  }
  powerText.title = power.message || "";
}

function syncPowerPolling(isConnected) {
  if (!isConnected) {
    if (powerPollId !== null) {
      clearInterval(powerPollId);
      powerPollId = null;
    }
    return;
  }

  if (powerPollId === null) {
    refreshPower();
    powerPollId = setInterval(refreshPower, POWER_REFRESH_MS);
  }
}

async function refreshPower() {
  if (!connected || powerRequestInFlight) return;
  powerRequestInFlight = true;
  powerText.textContent = t("powerReading");
  try {
    const payload = await requestJson("/api/power");
    renderPower(payload.power);
    if (payload.status) {
      lastStatus = payload.status;
    }
  } catch (error) {
    renderPower({ available: false, message: error.message });
  } finally {
    powerRequestInFlight = false;
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

// Rewrites every option's label from its stable `base` text plus the
// availability that applies right now, since the label set at scan time
// goes stale the moment a connection changes (e.g. connect/disconnect).
function refreshUriOptions(connectedUri) {
  if (connectedUri && !Array.from(uriSelect.options).some((option) => option.value === connectedUri)) {
    const option = document.createElement("option");
    option.value = connectedUri;
    option.dataset.base = connectedUri;
    uriSelect.append(option);
  }

  Array.from(uriSelect.options).forEach((option) => {
    if (option.value === "") return;
    const availability = option.value === connectedUri ? "connected" : option.dataset.scanAvailability;
    applyOptionLabel(option, availability);
  });

  if (connectedUri) uriSelect.value = connectedUri;
}

function applyOptionLabel(option, availability) {
  const base = option.dataset.base || option.value;
  const label = availabilityLabel(availability);
  option.textContent = label ? `${base} — ${label}` : base;
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
    option.dataset.base = drone.info ? `${drone.uri} (${drone.info})` : drone.uri;
    if (drone.availability) {
      option.dataset.scanAvailability = drone.availability;
    }
    applyOptionLabel(option, drone.availability);
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

async function runScan() {
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
}

scanButton.addEventListener("click", runScan);

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
  block.draggable = false;
  block.dataset.scriptId = String(blockCounter);
  blockCounter += 1;

  const removeButton = document.createElement("span");
  removeButton.className = "remove-block";
  removeButton.textContent = "x";
  removeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    removeScriptBlock(block);
  });

  block.append(removeButton);
  block.addEventListener("pointerdown", startScriptBlockDrag);
  return block;
}

// Removes one block only; the rest of the stack closes the gap.
function removeScriptBlock(block) {
  const index = scriptOrder.indexOf(block);
  if (index !== -1) scriptOrder.splice(index, 1);
  block.remove();
  layoutStack();
  updatePlaceholder();
}

function updatePlaceholder() {
  scriptPlaceholder.hidden = scriptOrder.length > 0;
}

// Rewrites every block position from scriptOrder. Pass a gap index/height to
// open a slot for the block being dragged; returns where that slot landed.
function layoutStack(gapIndex = null, gapHeight = 0) {
  let top = stackOrigin.y;
  let gapTop = null;

  scriptOrder.forEach((block, index) => {
    if (index === gapIndex) {
      gapTop = top;
      top += gapHeight + BLOCK_GAP;
    }
    block.style.left = `${stackOrigin.x}px`;
    block.style.top = `${top}px`;
    top += block.offsetHeight + BLOCK_GAP;
  });

  if (gapIndex === scriptOrder.length) gapTop = top;
  return gapTop;
}

// The stack sits wherever its head was dropped, kept inside the canvas.
function setStackOrigin(x, y, width) {
  stackOrigin.x = Math.max(0, Math.min(x, scriptStack.clientWidth - width));
  stackOrigin.y = Math.max(0, y);
}

function groupHeight(list) {
  if (list.length === 0) return 0;
  return list.reduce((total, block) => total + block.offsetHeight + BLOCK_GAP, 0) - BLOCK_GAP;
}

// The only viewport-to-stack conversions: keep scroll offsets out of callers.
function stackY(clientY) {
  return clientY - scriptStack.getBoundingClientRect().top - scriptStack.clientTop + scriptStack.scrollTop;
}

function stackX(clientX) {
  return clientX - scriptStack.getBoundingClientRect().left - scriptStack.clientLeft + scriptStack.scrollLeft;
}

function getInsertionIndex(clientY) {
  const y = stackY(clientY);
  let index = scriptOrder.findIndex((block) => y < block.offsetTop + block.offsetHeight / 2);
  if (index === -1) index = scriptOrder.length;

  // start heads the script, so nothing may be inserted above it.
  if (dragGroup[0]?.dataset.command === "start") return 0;
  if (scriptOrder[0]?.dataset.command === "start") return Math.max(1, index);
  return index;
}

function startToolboxDrag(event) {
  if (event.button !== 0 || dragLayer) return;
  if (event.target.closest("input")) return;

  const source = event.currentTarget;
  const sourceRect = source.getBoundingClientRect();
  beginDrag([makeScriptBlock(source)], event, {
    x: event.clientX - sourceRect.left,
    y: event.clientY - sourceRect.top,
  });
}

function startScriptBlockDrag(event) {
  if (event.button !== 0 || dragLayer) return;
  if (event.target.classList.contains("remove-block")) return;
  if (event.target.closest("input")) return;

  const block = event.currentTarget;
  const index = scriptOrder.indexOf(block);
  if (index === -1) return;

  const blockRect = block.getBoundingClientRect();
  const offset = {
    x: event.clientX - blockRect.left,
    y: event.clientY - blockRect.top,
  };

  // Grabbing a block takes everything below it, so the stack above closes up.
  const group = scriptOrder.splice(index);
  layoutStack();
  beginDrag(group, event, offset);
}

// Both drag paths funnel here: the group rides in a fixed layer on <body> so it
// is never clipped by the canvas and can be dragged off it to delete.
function beginDrag(group, event, offset) {
  dragGroup = group;
  dragOffset = offset;
  dropIndex = null;
  activeDragPointerId = event.pointerId;

  dragLayer = document.createElement("div");
  dragLayer.className = "drag-layer";
  // Match the canvas so blocks keep the width they will have once dropped.
  dragLayer.style.width = `${scriptStack.clientWidth}px`;

  // Attach first: offsetHeight is 0 for a detached element.
  document.body.append(dragLayer);

  let top = 0;
  group.forEach((block) => {
    block.classList.add("floating-block");
    block.style.left = "0px";
    dragLayer.append(block);
    block.style.top = `${top}px`;
    top += block.offsetHeight + BLOCK_GAP;
  });

  // Seed the drop target from the initial position: a press-and-release with no
  // movement must put the group back, not discard it.
  moveActiveDragBlock(event);

  document.addEventListener("pointermove", moveActiveDragBlock);
  document.addEventListener("pointerup", endActiveDragBlock);
  document.addEventListener("pointercancel", endActiveDragBlock);
  event.preventDefault();
}

function moveDragLayer(event) {
  dragLayer.style.left = `${event.clientX - dragOffset.x}px`;
  dragLayer.style.top = `${event.clientY - dragOffset.y}px`;
}

function moveActiveDragBlock(event) {
  if (!dragLayer || event.pointerId !== activeDragPointerId) return;
  moveDragLayer(event);

  if (!isPointInStage(event)) {
    dropIndex = null;
    layoutStack();
    hideSnapPreview();
    scriptStack.classList.remove("drag-over");
    return;
  }

  dropIndex = getInsertionIndex(event.clientY);
  const height = groupHeight(dragGroup);
  showSnapPreview(layoutStack(dropIndex, height), height);
  scriptStack.classList.add("drag-over");
}

function showSnapPreview(top, height) {
  hideSnapPreview();
  // Nothing to slot between when the canvas is empty: the group defines its own
  // position, so the drag layer alone shows where it will land.
  if (top === null || scriptOrder.length === 0) return;

  const preview = document.createElement("div");
  preview.className = "snap-preview";
  preview.style.left = `${stackOrigin.x}px`;
  preview.style.top = `${top}px`;
  preview.style.width = `${dragGroup[0].offsetWidth}px`;
  preview.style.height = `${height}px`;
  scriptStack.append(preview);
}

function hideSnapPreview() {
  scriptStack.querySelectorAll(".snap-preview").forEach((preview) => preview.remove());
}

function endActiveDragBlock(event) {
  if (!dragLayer || event.pointerId !== activeDragPointerId) return;

  document.removeEventListener("pointermove", moveActiveDragBlock);
  document.removeEventListener("pointerup", endActiveDragBlock);
  document.removeEventListener("pointercancel", endActiveDragBlock);
  hideSnapPreview();

  if (dropIndex === null) {
    // Dropped outside the canvas: discard the whole dragged group.
    dragGroup.forEach((block) => block.remove());
  } else {
    // Dropping the head of the stack moves the whole stack to that spot.
    if (dropIndex === 0) {
      const layerRect = dragLayer.getBoundingClientRect();
      setStackOrigin(stackX(layerRect.left), stackY(layerRect.top), dragGroup[0].offsetWidth);
    }
    scriptOrder.splice(dropIndex, 0, ...dragGroup);
    dragGroup.forEach((block) => block.classList.remove("floating-block"));
    // Append in stack order so DOM order matches script order.
    scriptOrder.forEach((block) => scriptStack.append(block));
    layoutStack();
  }

  dragLayer.remove();
  dragLayer = null;
  dragGroup = [];
  dropIndex = null;
  activeDragPointerId = null;
  scriptStack.classList.remove("drag-over");
  updatePlaceholder();
}

function isPointInStage(event) {
  const rect = scriptStack.getBoundingClientRect();
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}

clearButton.addEventListener("click", () => {
  scriptOrder.forEach((block) => block.remove());
  scriptOrder.length = 0;
  Object.assign(stackOrigin, STACK_ORIGIN_DEFAULT);
  updatePlaceholder();
});

async function runCurrentScript() {
  if (!connected) {
    renderStatus({ status: "error", message: t("connectBeforeRun"), connected: false, uri: null });
    return;
  }

  if (scriptOrder.length === 0) {
    statusMessage.textContent = t("addStartAndCommands");
    return;
  }

  // start heads the stack, so the script is everything after it.
  if (scriptOrder[0].dataset.command !== "start") {
    statusMessage.textContent = t("placeStartBlock");
    return;
  }

  const script = scriptOrder.slice(1).map(getScriptCommand).filter(Boolean);
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

powerRefreshButton.addEventListener("click", refreshPower);

languageSelect.addEventListener("change", () => {
  currentLanguage = SUPPORTED_LANGUAGES.includes(languageSelect.value) ? languageSelect.value : "en";
  localStorage.setItem(LANGUAGE_KEY, currentLanguage);
  applyLanguage();
});

// Block heights depend on label wrapping, and a narrower canvas can push the
// stack origin out of bounds.
window.addEventListener("resize", () => {
  if (scriptOrder.length > 0) {
    setStackOrigin(stackOrigin.x, stackOrigin.y, scriptOrder[0].offsetWidth);
  }
  layoutStack();
});

renderBlockToolbox();
applyLanguage();

requestJson("/api/status")
  .then(renderStatus)
  .catch((error) => {
    renderStatus({ status: "error", message: error.message, connected: false, uri: null });
  })
  .finally(runScan);
