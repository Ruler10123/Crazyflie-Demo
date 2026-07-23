from cflib.crazyflie import Crazyflie
from cflib.crazyflie.syncCrazyflie import SyncCrazyflie
import cflib.crtp

channels = [60, 80, 75, 115, 120]
BASE_URI_PATTERN = "radio://0/{}/2M/E7E7E7E7E7"


def scan_channels(channels, cache_dir="./cache"):
    cflib.crtp.init_drivers()
    for channel in channels:
        uri = BASE_URI_PATTERN.format(channel)
        print(f"Trying {uri}")
        try:
            cf = Crazyflie(rw_cache=cache_dir)
            with SyncCrazyflie(uri, cf=cf):
                print(f"SUCCESS! Connected on channel {channel}")
                return uri, channel
        except Exception as e:
            print(f"Failed: {e}")
    return None, None


def main():
    uri, channel = scan_channels(channels)
    if uri is None:
        print("No Crazyflie found on configured channels.")
    else:
        print(f"Crazyflie found on channel {channel}: {uri}")


if __name__ == "__main__":
    main()