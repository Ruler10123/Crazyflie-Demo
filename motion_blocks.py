import time

from cflib.positioning.motion_commander import MotionCommander

DEFAULT_HEIGHT = 0.5


def clamp_number(value, minimum, maximum, fallback):
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = fallback
    return max(minimum, min(number, maximum))


def move_linear_simple(scf, distance_m=0.5, turn_degrees=180):
    distance_m = clamp_number(distance_m, 0.1, 2.0, 0.5)
    turn_degrees = clamp_number(turn_degrees, 1.0, 360.0, 180.0)
    with MotionCommander(scf, default_height=DEFAULT_HEIGHT) as mc:
        time.sleep(1)
        mc.forward(distance_m)
        time.sleep(1)
        mc.turn_left(turn_degrees)
        time.sleep(1)
        mc.forward(distance_m)
        time.sleep(1)
