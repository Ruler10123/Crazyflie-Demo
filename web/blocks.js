const BLOCK_DEFINITIONS = [
  {
    command: "start",
    label: "start",
    style: "start",
    description: "Start the program from here.",
  },
  {
    command: "spin_motors",
    label: "spin fans 1 sec",
    style: "fan",
    description: "Spin the motors for one second.",
  },
  {
    command: "takeoff",
    label: "take off",
    style: "motion",
    description: "Take off and hover briefly.",
  },
  {
    command: "forward",
    label: "fly forward 20 cm",
    style: "motion",
    description: "Fly the Crazyflie forward 20 centimeters.",
  },
  {
    command: "right",
    label: "turn right 90 deg",
    style: "motion",
    description: "Rotate the Crazyflie 90 degrees to the right.",
  },
  {
    command: "wait",
    label: "wait 1 sec",
    style: "wait",
    description: "Pause the script for one second.",
  },
  {
    command: "land",
    label: "land",
    style: "stop",
    description: "Land the Crazyflie safely.",
  },
];
