# Crazyflie Blocks

A local Scratch-like web controller for Crazyflie. The browser shows the block UI, and the Python backend talks to the drone through `cflib`.

## Requirements

- Python 3
- Crazyradio USB dongle
- Crazyflie drone

The computer running `server.py` must be the computer with Crazyradio plugged in.

## Setup On A New Computer

Do this once after copying or cloning the project to a different computer:

```bash
cd Crazyflie-Demo
python3 -m pip install --user --upgrade pip
python3 -m pip install --user cflib
```

This installs `cflib` into the current user's Python environment. No `.venv` is required.

## Start

After setup, start the web controller with:

```bash
cd Crazyflie-Demo
python3 server.py
```

Open:

```text
http://127.0.0.1:8765
```

## First Flow

1. Plug in Crazyradio.
2. Power on the Crazyflie.
3. Click `Scan`.
4. Select the Crazyflie URI.
5. Click `Connect`. The Crazyflie will briefly spin its motors to identify itself.
6. Drag blocks into the script area.
7. Click `Run`.

`spin fans 1 sec` sends a short low-thrust motor test. For the first test, remove the propellers or keep the drone flat and clear of hands.

Connecting also sends a shorter low-thrust identify pulse. Keep the Crazyflie flat and clear of hands before connecting.

Blocks with numbers include editable fields. The backend clamps values to conservative ranges before sending commands to the Crazyflie.

## Notes

- `pip install cflib` may fail if `pip` is not on PATH. Use `python3 -m pip install --user cflib`.
- If `python3 -m pip install --user --upgrade pip` fails because of system Python restrictions, try only `python3 -m pip install --user cflib`.
- On Windows, use `py -m pip install --user cflib` and start with `py server.py`.
