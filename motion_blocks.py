import threading
import time

from cflib.crazyflie.log import LogConfig
from cflib.positioning.motion_commander import MotionCommander

DEFAULT_HEIGHT = 0.5
BOX_LIMIT = 0.5


def clamp_number(value, minimum, maximum, fallback):
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = fallback
    return max(minimum, min(number, maximum))


def move_linear_simple(scf, distance_m=0.5, turn_degrees=180, mc=None):
    distance_m = clamp_number(distance_m, 0.1, 2.0, 0.5)
    turn_degrees = clamp_number(turn_degrees, 1.0, 360.0, 180.0)
    if mc is not None:
        time.sleep(1)
        mc.forward(distance_m)
        time.sleep(1)
        mc.turn_left(turn_degrees)
        time.sleep(1)
        mc.forward(distance_m)
        time.sleep(1)
        return

    with MotionCommander(scf, default_height=DEFAULT_HEIGHT) as mc:
        time.sleep(1)
        mc.forward(distance_m)
        time.sleep(1)
        mc.turn_left(turn_degrees)
        time.sleep(1)
        mc.forward(distance_m)
        time.sleep(1)


def take_off_simple(scf):
    with MotionCommander(scf, default_height=DEFAULT_HEIGHT):
        time.sleep(3)


def move_box_limit(scf, duration_seconds=10.0):
    deck_attached_event = threading.Event()

    def _on_deck_param(_, value_str):
        if int(value_str):
            deck_attached_event.set()

    scf.cf.param.add_update_callback(group="deck", name="bcFlow2", cb=_on_deck_param)
    time.sleep(1)
    if not deck_attached_event.wait(timeout=5):
        raise RuntimeError("move_box_limit needs a flow deck for position estimates, none detected.")

    position_estimate = [0.0, 0.0]

    def _on_position(_timestamp, data, _logconf):
        position_estimate[0] = data["stateEstimate.x"]
        position_estimate[1] = data["stateEstimate.y"]

    logconf = LogConfig(name="Position", period_in_ms=10)
    logconf.add_variable("stateEstimate.x", "float")
    logconf.add_variable("stateEstimate.y", "float")
    scf.cf.log.add_config(logconf)
    logconf.data_received_cb.add_callback(_on_position)

    logconf.start()
    try:
        with MotionCommander(scf, default_height=DEFAULT_HEIGHT) as mc:
            body_x_cmd = 0.2
            body_y_cmd = 0.1
            max_vel = 0.2

            end_time = time.monotonic() + duration_seconds
            while time.monotonic() < end_time:
                if position_estimate[0] > BOX_LIMIT:
                    body_x_cmd = -max_vel
                elif position_estimate[0] < -BOX_LIMIT:
                    body_x_cmd = max_vel
                if position_estimate[1] > BOX_LIMIT:
                    body_y_cmd = -max_vel
                elif position_estimate[1] < -BOX_LIMIT:
                    body_y_cmd = max_vel

                mc.start_linear_motion(body_x_cmd, body_y_cmd, 0)
                time.sleep(0.1)
    finally:
        logconf.stop()
