window.BLOCK_DEFINITIONS = [
  {
    command: "start",
    label: "start",
    style: "start",
    description: "Start the program from here.",
  },
  {
    command: "spin_motors",
    label: "spin fans",
    style: "fan",
    description: "Spin the motors for one second.",
    inputs: [
      { name: "duration_seconds", label: "sec", type: "number", value: 1, min: 0.1, max: 1.5, step: 0.1 },
    ],
  },
  {
    command: "takeoff",
    label: "take off",
    style: "motion",
    description: "Take off and hover briefly.",
    inputs: [
      { name: "duration_seconds", label: "sec", type: "number", value: 2, min: 0.2, max: 4, step: 0.1 },
      { name: "thrust", label: "thrust", type: "number", value: 12000, min: 10001, max: 18000, step: 100 },
    ],
  },
  {
    command: "forward",
    label: "fly forward",
    style: "motion",
    description: "Fly the Crazyflie forward 20 centimeters.",
    inputs: [
      { name: "distance_cm", label: "cm", type: "number", value: 20, min: 1, max: 200, step: 1 },
    ],
  },
  {
    command: "right",
    label: "turn right",
    style: "motion",
    description: "Rotate the Crazyflie 90 degrees to the right.",
    inputs: [
      { name: "degrees", label: "deg", type: "number", value: 90, min: 1, max: 360, step: 1 },
    ],
  },
  {
    command: "move_linear_simple",
    label: "move linear",
    style: "motion",
    description: "Fly forward 0.5m, turn 180 degrees, fly forward 0.5m.",
    inputs: [
      { name: "distance_m", label: "m", type: "number", value: 0.5, min: 0.1, max: 2, step: 0.1 },
      { name: "turn_degrees", label: "deg", type: "number", value: 180, min: 1, max: 360, step: 1 },
    ],
  },
  {
    command: "wait",
    label: "wait",
    style: "wait",
    description: "Pause the script for one second.",
    inputs: [
      { name: "duration_seconds", label: "sec", type: "number", value: 1, min: 0.1, max: 10, step: 0.1 },
    ],
  },
  {
    command: "land",
    label: "land",
    style: "stop",
    description: "Land the Crazyflie safely.",
  },
];
