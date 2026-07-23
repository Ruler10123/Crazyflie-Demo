import time

import cflib.crtp
from cflib.crazyflie import Crazyflie
from cflib.crazyflie.log import LogConfig
from cflib.crazyflie.syncCrazyflie import SyncCrazyflie
from cflib.utils import uri_helper
from cflib.utils.reset_estimator import reset_estimator

def spin_motors(scf, thrust=12000, duration_seconds=1.0):
    scf.cf.supervisor.send_arming_request(True)
    thrust = max(10001, min(int(thrust), 18000))
    end_time = time.monotonic() + min(duration_seconds, 1.5)
    while time.monotonic() < end_time:
        scf.cf.commander.send_setpoint(0.0, 0.0, 0.0, thrust)
        time.sleep(0.05)
    scf.cf.commander.send_setpoint(0.0, 0.0, 0.0, 0)
    time.sleep(0.1)


def wait(scf, duration_seconds=1.0):
    time.sleep(duration_seconds)


def takeoff(scf, thrust=12000, duration_seconds=2.0):
    thrust = max(10001, min(int(thrust), 18000))
    end_time = time.monotonic() + min(duration_seconds, 4.0)
    while time.monotonic() < end_time:
        scf.cf.commander.send_setpoint(0.0, 0.0, 0.0, thrust)
        time.sleep(0.05)
    scf.cf.commander.send_setpoint(0.0, 0.0, 0.0, 9000)
    time.sleep(0.2)


def forward(scf, duration_seconds=1.0, thrust=9000, pitch=0.2):
    end_time = time.monotonic() + duration_seconds
    while time.monotonic() < end_time:
        scf.cf.commander.send_setpoint(0.0, pitch, 0.0, thrust)
        time.sleep(0.05)
    scf.cf.commander.send_setpoint(0.0, 0.0, 0.0, thrust)
    time.sleep(0.2)


def right(scf, duration_seconds=1.0, yaw_rate=-0.5, thrust=9000):
    end_time = time.monotonic() + duration_seconds
    while time.monotonic() < end_time:
        scf.cf.commander.send_setpoint(0.0, 0.0, yaw_rate, thrust)
        time.sleep(0.05)
    scf.cf.commander.send_setpoint(0.0, 0.0, 0.0, thrust)
    time.sleep(0.2)


def land(scf):
    scf.cf.commander.send_stop_setpoint()
    scf.cf.commander.send_notify_setpoint_stop()
    time.sleep(0.1)


BLOCK_FUNCTIONS = {
    "spin_motors": spin_motors,
    "wait": wait,
    "takeoff": takeoff,
    "forward": forward,
    "right": right,
    "land": land,
}
