window.BLOCK_DEFINITIONS = [
  {
    command: "start",
    label: { en: "start", fr: "départ" },
    style: "event",
    description: { en: "Start the program from here.", fr: "Démarrer le programme ici." },
  },
  {
    command: "spin_motors",
    label: { en: "spin fans", fr: "tourner hélices" },
    style: "fan",
    description: { en: "Spin the motors for one second.", fr: "Faire tourner les moteurs pendant une seconde." },
    inputs: [
      { name: "duration_seconds", label: { en: "duration sec", fr: "durée s" }, type: "number", value: 1, min: 0.1, step: 0.1 },
    ],
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
    inputs: [
      { name: "distance_cm", label: { en: "distance cm", fr: "distance cm" }, type: "number", value: 20, min: 1, max: 200, step: 1 },
    ],
  },
  {
    command: "right",
    label: { en: "turn right", fr: "tourner à droite" },
    style: "motion",
    description: { en: "Rotate the Crazyflie 90 degrees to the right.", fr: "Faire tourner le Crazyflie de 90 degrés vers la droite." },
    inputs: [
      { name: "degrees", label: { en: "angle deg", fr: "angle deg" }, type: "number", value: 90, min: 1, max: 360, step: 1 },
    ],
  },
  {
    command: "left",
    label: { en: "turn left", fr: "tourner à gauche" },
    style: "motion",
    description: { en: "Rotate the Crazyflie 90 degrees to the left.", fr: "Faire tourner le Crazyflie de 90 degrés vers la gauche." },
    inputs: [
      { name: "degrees", label: { en: "angle deg", fr: "angle deg" }, type: "number", value: 90, min: 1, max: 360, step: 1 },
    ],
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
    command: "take_off_simple",
    label: { en: "take off simple", fr: "décollage simple" },
    style: "motion",
    description: { en: "Take off, hover for 3 seconds, then land.", fr: "Décoller, rester en vol stationnaire pendant 3 secondes, puis atterrir." },
  },
  {
    command: "move_box_limit",
    label: { en: "move in box limit", fr: "vol en zone limitée" },
    style: "motion",
    description: {
      en: "Fly within a 0.5m box using the flow deck's position estimate (needs a flow deck).",
      fr: "Voler dans une zone de 0,5 m avec l'estimation de position du flow deck (flow deck requis).",
    },
  },
  {
    command: "wait",
    label: { en: "wait", fr: "attendre" },
    style: "wait",
    description: { en: "Pause the script for one second.", fr: "Mettre le script en pause pendant une seconde." },
    inputs: [
      { name: "duration_seconds", label: { en: "duration sec", fr: "durée s" }, type: "number", value: 1, min: 0.1, max: 10, step: 0.1 },
    ],
  },
  {
    command: "repeat",
    label: { en: "repeat", fr: "répéter" },
    style: "control",
    description: {
      en: "Repeat the blocks placed inside this C block.",
      fr: "Répéter les blocs placés dans ce bloc C.",
    },
    container: true,
    inputs: [
      { name: "times", label: { en: "times", fr: "fois" }, type: "number", value: 2, min: 1, step: 1 },
    ],
  },
  {
    command: "land",
    label: { en: "land", fr: "atterrir" },
    style: "stop",
    description: { en: "Land the Crazyflie safely.", fr: "Faire atterrir le Crazyflie en sécurité." },
  },
];
