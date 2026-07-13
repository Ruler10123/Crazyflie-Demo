from cflib.crazyflie import Crazyflie
from cflib.crazyflie.syncCrazyflie import SyncCrazyflie
import cflib.crtp

cflib.crtp.init_drivers()

channels = [60, 80, 75, 115, 120]

for ch in channels:
    uri = f"radio://0/{ch}/2M/E7E7E7E7E7"
    print(f"Trying {uri}")

    try:
        with SyncCrazyflie(uri, cf=Crazyflie(rw_cache="./cache")):
            print(f"SUCCESS! Connected on channel {ch}")
            break
    except Exception as e:
        print(f"Failed: {e}")