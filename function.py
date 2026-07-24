import time

import cancellation
from motion_blocks import move_box_limit, move_linear_simple, take_off_simple


def clamp_number(value, minimum, maximum, fallback):
    try:
        number = float(normalize_number(value))
    except (TypeError, ValueError):
        number = fallback
    return max(minimum, min(number, maximum))


def normalize_number(value):
    if not isinstance(value, str):
        return value
    return value.translate(str.maketrans("０１２３４５６７８９．－", "0123456789.-")).strip()


def stop_drone(scf):
    scf.cf.commander.send_stop_setpoint()
    scf.cf.commander.send_notify_setpoint_stop()


def spin_motors(scf, thrust=12000, duration_seconds=1.0):
    thrust = int(clamp_number(thrust, 10001, 18000, 12000))
    duration_seconds = clamp_number(duration_seconds, 0.1, 50.0, 1.0)
    # Firmware locks thrust until it sees a zero-thrust setpoint; without this
    # unlock the first (nonzero) packet is ignored and the motors never spin.
    scf.cf.commander.send_setpoint(0.0, 0.0, 0.0, 0)
    time.sleep(0.1)
    end_time = time.monotonic() + duration_seconds
    while time.monotonic() < end_time and not cancellation.stopping():
        scf.cf.commander.send_setpoint(0.0, 0.0, 0.0, thrust)
        if cancellation.sleep(0.05):
            break
    scf.cf.commander.send_setpoint(0.0, 0.0, 0.0, 0)
    time.sleep(0.1)


def identify_drone(scf):
    spin_motors(scf, thrust=12000, duration_seconds=0.5)
    stop_drone(scf)


def wait(scf, duration_seconds=1.0):
    duration_seconds = clamp_number(duration_seconds, 0.1, 10.0, 1.0)
    cancellation.sleep(duration_seconds)


def takeoff(scf, thrust=12000, duration_seconds=2.0, height_m=0.3):
    thrust = int(clamp_number(thrust, 10001, 18000, 12000))
    duration_seconds = clamp_number(duration_seconds, 0.2, 4.0, 2.0)
    end_time = time.monotonic() + duration_seconds
    while time.monotonic() < end_time and not cancellation.stopping():
        scf.cf.commander.send_setpoint(0.0, 0.0, 0.0, thrust)
        if cancellation.sleep(0.05):
            break
    scf.cf.commander.send_setpoint(0.0, 0.0, 0.0, 9000)
    time.sleep(0.2)


def forward(scf, distance_cm=20, duration_seconds=None, thrust=9000, pitch=0.2, mc=None):
    distance_cm = clamp_number(distance_cm, 1.0, 200.0, 20.0)
    if mc is not None:
        mc.forward(distance_cm / 100.0)
        return

    if duration_seconds is None:
        duration_seconds = distance_cm / 20.0
    duration_seconds = clamp_number(duration_seconds, 0.1, 10.0, 1.0)
    thrust = int(clamp_number(thrust, 8000, 14000, 9000))
    pitch = clamp_number(pitch, 0.05, 0.5, 0.2)
    end_time = time.monotonic() + duration_seconds
    while time.monotonic() < end_time and not cancellation.stopping():
        scf.cf.commander.send_setpoint(0.0, pitch, 0.0, thrust)
        if cancellation.sleep(0.05):
            break
    scf.cf.commander.send_setpoint(0.0, 0.0, 0.0, thrust)
    time.sleep(0.2)


def right(scf, degrees=90, duration_seconds=None, yaw_rate=-0.5, thrust=9000, mc=None):
    degrees = clamp_number(degrees, 1.0, 360.0, 90.0)
    if mc is not None:
        mc.turn_right(degrees)
        return

    if duration_seconds is None:
        duration_seconds = degrees / 90.0
    duration_seconds = clamp_number(duration_seconds, 0.1, 4.0, 1.0)
    yaw_rate = -abs(clamp_number(yaw_rate, 0.1, 2.0, 0.5))
    thrust = int(clamp_number(thrust, 8000, 14000, 9000))
    end_time = time.monotonic() + duration_seconds
    while time.monotonic() < end_time and not cancellation.stopping():
        scf.cf.commander.send_setpoint(0.0, 0.0, yaw_rate, thrust)
        if cancellation.sleep(0.05):
            break
    scf.cf.commander.send_setpoint(0.0, 0.0, 0.0, thrust)
    time.sleep(0.2)


def land(scf):
    stop_drone(scf)
    time.sleep(0.1)


BLOCK_FUNCTIONS = {
    "identify_drone": identify_drone,
    "spin_motors": spin_motors,
    "wait": wait,
    "takeoff": takeoff,
    "forward": forward,
    "right": right,
    "land": land,
    "move_linear_simple": move_linear_simple,
    "take_off_simple": take_off_simple,
    "move_box_limit": move_box_limit,
}
