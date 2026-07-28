import math
import time

from cflib.crazyflie.log import LogConfig
from cflib.positioning.motion_commander import MotionCommander

import cancellation

DEFAULT_HEIGHT = 0.5
BOX_LIMIT = 0.5
FLOW_DECK_PARAMS = ("deck.bcFlow2", "deck.bcFlow")


def clamp_number(value, minimum, maximum, fallback):
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = fallback
    return max(minimum, min(number, maximum))


def flow_deck_attached(scf):
    """True if the firmware reports a Flow deck (v2 or v1) on the expansion port.

    Reads the cached parameter rather than registering an update callback: cflib
    only fires param callbacks while it fetches values right after open_link(),
    which happens at connect time, long before any block script runs."""
    for name in FLOW_DECK_PARAMS:
        try:
            if int(scf.cf.param.get_value(name)):
                return True
        except (KeyError, ValueError, TypeError):
            # Param is absent from this firmware's TOC, so that deck revision
            # is simply not present. A link failure still propagates.
            continue
    return False


def require_flow_deck(scf, block_name):
    if not flow_deck_attached(scf):
        raise RuntimeError(f"{block_name} needs a flow deck for position hold, none detected.")


def move_linear_simple(scf, distance_m=0.5, turn_degrees=180, mc=None):
    distance_m = clamp_number(distance_m, 0.1, 2.0, 0.5)
    turn_degrees = clamp_number(turn_degrees, 1.0, 360.0, 180.0)
    def _steps(mc):
        if cancellation.sleep(1):
            return
        mc.forward(distance_m)
        if cancellation.sleep(1) or cancellation.stopping():
            return
        mc.turn_left(turn_degrees)
        if cancellation.sleep(1) or cancellation.stopping():
            return
        mc.forward(distance_m)
        cancellation.sleep(1)

    if mc is not None:
        _steps(mc)
        return

    with MotionCommander(scf, default_height=DEFAULT_HEIGHT) as mc:
        _steps(mc)


def _circle_arc(mc, start_circle, radius_m, velocity_m_s):
    """Fly one full circle. Returns True if a stop was requested mid-arc.

    MotionCommander.circle_left/right are not used directly: they block on a
    bare time.sleep(), so a stop would not be seen until the arc finished."""
    flight_time = 2 * math.pi * radius_m / velocity_m_s
    start_circle(radius_m, velocity_m_s)
    stopped = cancellation.sleep(flight_time)
    mc.stop()
    return stopped


def figure_eight(scf, radius_m=0.3, velocity_m_s=0.3, laps=1, mc=None):
    radius_m = clamp_number(radius_m, 0.1, 1.0, 0.3)
    velocity_m_s = clamp_number(velocity_m_s, 0.1, 0.6, 0.3)
    laps = int(clamp_number(laps, 1, 5, 1))

    require_flow_deck(scf, "figure_eight")

    def _steps(mc):
        for _ in range(laps):
            if _circle_arc(mc, mc.start_circle_left, radius_m, velocity_m_s):
                return
            if _circle_arc(mc, mc.start_circle_right, radius_m, velocity_m_s):
                return

    if mc is not None:
        _steps(mc)
        return

    with MotionCommander(scf, default_height=DEFAULT_HEIGHT) as mc:
        _steps(mc)


def take_off_simple(scf):
    with MotionCommander(scf, default_height=DEFAULT_HEIGHT):
        cancellation.sleep(3)


def move_box_limit(scf, duration_seconds=10.0):
    require_flow_deck(scf, "move_box_limit")

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
            while time.monotonic() < end_time and not cancellation.stopping():
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
