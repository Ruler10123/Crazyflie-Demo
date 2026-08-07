# Crazyflie Blocks Operation Guide

This guide explains how to start the project, connect to a Crazyflie drone, and run simple flight commands from the browser-based block interface.

> Safety note: for the first test, remove the propellers if possible, or place the Crazyflie on a flat, open surface and keep hands away from the propellers. When you press `Connect`, the system briefly spins the motors to identify the drone.

## 1. System Architecture

![Crazyflie Blocks execution architecture](images/run-architecture.svg)

The project has three main parts:

- `server.py`: the local Python backend. It starts the web server and controls the Crazyflie through `cflib`.
- `web/`: the Scratch-like block interface. Open `http://127.0.0.1:8765` in a browser.
- Crazyradio + Crazyflie: the computer must have the Crazyradio USB dongle plugged in, and the Crazyflie must be powered on.

## 2. Hardware Setup

![Hardware setup](images/hardware-setup.svg)

Check the following before starting:

- The Crazyradio USB dongle is plugged into the computer.
- The Crazyflie is charged and powered on.
- The Crazyflie is on a flat table or floor with clear space around it.
- `figure 8` and `move in box limit` require a Flow deck.
- The computer running `server.py` must be the same computer with the Crazyradio plugged in.

## 3. First-Time Setup

On a new computer, install the Python dependency once:

```bash
cd Crazyflie-Demo
python3 -m pip install --user --upgrade pip
python3 -m pip install --user cflib
```

If your system does not allow upgrading pip, run only:

```bash
python3 -m pip install --user cflib
```

On Windows, use:

```powershell
cd Crazyflie-Demo
py -m pip install --user cflib
py server.py
```

## 4. Start the Controller

Run this from the project folder:

```bash
cd Crazyflie-Demo
python3 server.py
```

After the server starts, open this URL in a browser:

```text
http://127.0.0.1:8765
```

If the terminal says Crazyradio or Crazyflie cannot be found, check that the dongle is plugged in, the Crazyflie is powered on, and no other program is using the Crazyradio, such as Crazyflie Client, another Python script, or a ROS node.

## 5. Connect to the Drone

![Web connection flow](images/web-flow.svg)

In the `Connect Drone` tab on the left side of the web page:

1. Press `Scan` to search for nearby Crazyflies.
2. In the `Drone URI` dropdown, choose an available URI, for example `radio://0/80/2M/E7E7E7E7E7`.
3. Press `Connect`.
4. Wait until the status shows connected. After a successful connection, the Crazyflie briefly spins its motors as an identify pulse.
5. To end the link, press `Disconnect`.

Status meanings:

- `Available`: ready to connect.
- `In use`: likely connected to another computer or program.
- `Connected (you)`: connected by this web backend.
- `Unknown`: when one drone is already connected, the system avoids probing other URIs, so their availability may be unknown.

## 6. Run Blocks

After connecting:

1. Switch to the `Blocks` tab on the left.
2. Drag the `start` block into the script area on the right.
3. Attach action blocks under `start`.
4. Press the green flag `Start` button in the top-right corner.
5. Press the red `Stop` button if you need to stop immediately.
6. Press `Clear` to remove the current script.

Recommended first test:

1. `start`
2. `spin fans`, with duration set to `1`

After the motor test works, try a basic flight script:

1. `start`
2. `take off`, with height set to `0.3`
3. `wait`, with duration set to `1`
4. `land`

## 7. UI Operation

![Crazyflie Blocks UI map](images/ui-map.svg)

### A. Connection Status and Brand Area

The top-left area shows the current state, such as `Disconnected`, `Connected`, `Running`, or an error message. Check this first during operation to confirm whether the drone is connected.

### B. `Connect Drone` Tab

This is the main drone connection area:

1. `Scan`: scans for Crazyflies visible to the Crazyradio.
2. `Drone URI`: selects the drone to connect to.
3. `Connect`: connects to the selected drone. The motors briefly spin after a successful connection.
4. `Disconnect`: disconnects the current drone.
5. `Refresh`: refreshes battery information after connection.

The normal sequence is `Scan` -> choose `Drone URI` -> `Connect`.

### C. `Blocks` Tab

Press `2 Blocks` at the top of the left sidebar to open the block toolbox. Blocks are grouped by category:

- `Events`: contains `start`.
- `Motion`: takeoff, forward movement, turns, figure 8, and other movement commands.
- `Fan`: motor testing.
- `Control`: repeat logic.
- `Wait`: delay commands.

Drag blocks from the left toolbox to the script workspace on the right to build a program.

### D. Script Workspace

The large area on the right is the script workspace. Rules:

- The top block must be `start`.
- Action blocks must be attached below `start`.
- A `repeat` block must contain at least one block.
- Number fields can be clicked and edited directly, such as height, distance, duration, and angle.

### E. `Start` / `Stop` / `Clear`

The three control buttons are in the top-right corner:

- Green flag `Start`: runs the current script.
- Red square `Stop`: stops the current action and tries to land or stop the motors.
- Gray trash can `Clear`: clears the current workspace blocks.

If anything looks wrong during flight, press `Stop` first.

### F. Language Switch

The top-right language buttons switch between `EN` and `FR`. The UI currently supports English and French.

### G. Log and Status Messages

The `Log` area on the left shows scan, connection, execution, and error messages. If an action fails, check the Log first, then check the terminal running `server.py`.

## 8. Common Blocks

| Block | Function | Notes |
| --- | --- | --- |
| `spin fans` | Spins the motors at low thrust | Remove propellers for the first test |
| `take off` | Takes off to a target height | Height is clamped to a conservative range |
| `fly forward` | Flies forward by a distance in centimeters | Default is 20 cm |
| `turn right` / `turn left` | Rotates by a target angle | Default is 90 degrees |
| `move linear` | Moves forward, turns, then moves forward again | Uses MotionCommander |
| `figure 8` | Flies a figure-eight path | Requires a Flow deck |
| `move in box limit` | Flies within a bounded area | Requires a Flow deck |
| `wait` | Pauses for a number of seconds | Maximum is 10 seconds |
| `repeat` | Repeats the blocks inside it | Must contain at least one block |
| `land` | Lands and stops | Recommended at the end of flight scripts |

## 9. Quick Connection Check

If the web page cannot scan the drone, run this in a terminal:

```bash
cd Crazyflie-Demo
python3 drone_check.py
```

The script tries these common channels:

- `60`
- `80`
- `75`
- `115`
- `120`

If you see `SUCCESS! Connected on channel ...`, the basic Crazyradio and Crazyflie connection is working.

## 10. Troubleshooting

### Scan Cannot Find the Crazyflie

- Make sure the Crazyflie is powered on.
- Unplug and replug the Crazyradio USB dongle.
- Move the Crazyflie closer to the Crazyradio.
- Close Crazyflie Client or any other program using the Crazyradio.
- Restart `python3 server.py`.

### Connect Times Out or Shows In Use

- The Crazyflie may already be connected to another computer.
- Close other programs that use the Crazyradio.
- Unplug and replug the Crazyradio.
- Power-cycle the Crazyflie, then press `Scan` again.

### Start Does Nothing

- Make sure `Connect` succeeded.
- The top block in the script area must be `start`.
- A `repeat` block must contain at least one block.
- Check that the terminal does not show a Python exception.

### `figure 8` or `move in box limit` Fails

These blocks require a Flow deck. If no Flow deck is installed, the backend refuses to run them to avoid flying without position estimation.

## 11. Shut Down

When finished:

1. Press `Stop` in the web page and confirm the drone has stopped.
2. Press `Disconnect`.
3. Power off the Crazyflie.
4. Return to the terminal and press `Ctrl+C` to stop `server.py`.
