from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import atexit
import json
from pathlib import Path
import signal
import sys
import threading
import traceback
from urllib.parse import urlparse

import cflib.crtp
from cflib.crazyflie import Crazyflie
from cflib.crazyflie.log import LogConfig
from cflib.crazyflie.syncCrazyflie import SyncCrazyflie
from cflib.positioning.motion_commander import MotionCommander

import cancellation
from function import BLOCK_FUNCTIONS, identify_drone, stop_drone


ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / "web"
CACHE_DIR = ROOT / ".cache" / "cflib"
CONNECT_TIMEOUT_SECONDS = 15
PROBE_TIMEOUT_SECONDS = 8
POWER_LOG_TIMEOUT_SECONDS = 2
MOTION_COMMANDS = {"takeoff", "forward", "right", "left", "move_linear_simple", "figure_eight"}


def close_link_quietly(scf):
    if scf is None:
        return

    def _close():
        try:
            # Close at the Crazyflie (cf) level, not scf.close_link(): the Sync
            # wrapper no-ops unless the handshake fully completed, so a timed-out
            # or half-open link would otherwise leak the radio driver (keeping the
            # dongle claimed and the drone busy). cf.close_link() closes the driver
            # unconditionally and is idempotent when already closed.
            scf.cf.close_link()
        except Exception:
            pass

    close_thread = threading.Thread(target=_close, daemon=True)
    close_thread.start()
    close_thread.join(CONNECT_TIMEOUT_SECONDS)


class DroneConnection:
    def __init__(self, uri, scf):
        self.lock = threading.Lock()
        self.uri = uri
        self.scf = scf
        self.status = "connected"
        self.message = f"Connected to {uri}."
        self.active_flight = None
        self.active_block_id = None
        self.power = {"available": False, "message": "Not read yet."}

    def as_dict(self):
        with self.lock:
            return {
                "uri": self.uri,
                "status": self.status,
                "message": self.message,
                "connected": self.scf is not None,
                "activeBlockId": self.active_block_id,
                "power": self.power,
            }

    def set_status(self, status, message, active_block_id=None):
        with self.lock:
            self.status = status
            self.message = message
            self.active_block_id = active_block_id


class DroneState:
    def __init__(self):
        self.lock = threading.Lock()
        self.connections = {}
        self.status = "disconnected"
        self.message = "Ready to scan for Crazyflie."

    def connected_items(self):
        with self.lock:
            return list(self.connections.items())

    def connected_uris(self):
        with self.lock:
            return list(self.connections.keys())

    def primary_connection(self):
        with self.lock:
            return next(iter(self.connections.values()), None)

    def as_dict(self):
        with self.lock:
            connections = list(self.connections.values())
            drones = [connection.as_dict() for connection in connections]
            primary = drones[0] if drones else None
            status = self.status
            message = self.message

        if drones:
            statuses = [drone["status"] for drone in drones]
            if "running" in statuses:
                status = "running"
            elif "identifying" in statuses:
                status = "identifying"
            elif "connecting" in statuses:
                status = "connecting"
            elif "error" in statuses:
                status = "error"
            else:
                status = "connected"
            message = self.format_group_message(drones)

        return {
            "status": status,
            "uri": primary["uri"] if primary else None,
            "uris": [drone["uri"] for drone in drones],
            "message": message,
            "connected": bool(drones),
            "connectedCount": len(drones),
            "drones": drones,
            "activeBlockIds": sorted(
                {
                    drone["activeBlockId"]
                    for drone in drones
                    if drone.get("activeBlockId") is not None
                }
            ),
            "power": primary["power"] if primary else {"available": False, "message": "Not connected."},
        }

    def format_group_message(self, drones):
        if len(drones) == 1:
            return drones[0]["message"]
        running = sum(1 for drone in drones if drone["status"] == "running")
        if running:
            return f"Running block script on {running}/{len(drones)} drone(s)."
        return f"Connected to {len(drones)} drone(s): {', '.join(drone['uri'] for drone in drones)}."

    def set_status(self, status, message, uri=None):
        if uri is not None:
            connection = self.get_connection(uri)
            if connection is not None:
                connection.set_status(status, message)
        with self.lock:
            self.status = status
            self.message = message

    def get_connection(self, uri):
        with self.lock:
            return self.connections.get(uri)

    def connect(self, uri):
        if uri in self.connected_uris():
            self.disconnect(uri)

        self.set_status("connecting", f"Connecting to {uri}...")

        cf = Crazyflie(rw_cache=str(CACHE_DIR))
        scf = SyncCrazyflie(uri, cf=cf)

        error_box = []

        def _open():
            try:
                scf.open_link()
            except Exception as exc:
                error_box.append(exc)

        open_thread = threading.Thread(target=_open, daemon=True)
        open_thread.start()
        open_thread.join(CONNECT_TIMEOUT_SECONDS)

        if open_thread.is_alive():
            close_link_quietly(scf)
            message = (
                f"Could not connect to {uri} within {CONNECT_TIMEOUT_SECONDS}s. "
                "It is most likely already in use by another user's radio "
                "(check Scan for its availability). If not, power-cycle the "
                "Crazyflie and re-seat the Crazyradio dongle, then try again."
            )
            self.set_status("error", message, uri)
            raise TimeoutError(message)

        if error_box:
            close_link_quietly(scf)
            raise error_box[0]

        connection = DroneConnection(uri, scf)
        connection.set_status("identifying", f"Connected to {uri}. Identifying...")
        with self.lock:
            self.connections[uri] = connection
            self.status = "identifying"
            self.message = f"Connected to {uri}. Identifying..."

        try:
            cancellation.reset()
            identify_drone(scf)
        except Exception:
            close_link_quietly(scf)
            with self.lock:
                self.connections.pop(uri, None)
                self.status = "error"
                self.message = f"Connected to {uri}, but identify failed."
            raise

        connection.set_status("connected", f"Connected to {uri}. Identify complete.")
        self.set_status("connected", f"Connected to {uri}. Identify complete.", uri)

        return {"ok": True, "message": self.message, "status": self.as_dict()}

    def disconnect(self, uri=None):
        with self.lock:
            if uri is None:
                removed = list(self.connections.items())
                self.connections.clear()
            else:
                connection = self.connections.pop(uri, None)
                removed = [(uri, connection)] if connection is not None else []

            if not self.connections:
                self.status = "disconnected"
                self.message = "Disconnected."

        for _uri, connection in removed:
            if connection is not None:
                close_link_quietly(connection.scf)

        if uri is not None and not removed:
            message = f"{uri} was not connected."
        elif uri is not None:
            message = f"Disconnected from {uri}."
        else:
            message = "Disconnected."
        return {"ok": True, "message": message, "status": self.as_dict()}

    def stop(self):
        items = self.connected_items()
        if not items:
            self.set_status("disconnected", "No Crazyflie is connected.")
            return {"ok": True, "message": self.message, "status": self.as_dict()}

        # Tell the running script to bail out of its loops, then land gracefully.
        # flight.land() lets MotionCommander manage its own background setpoint
        # thread during the descent, rather than overriding it with a raw stop.
        cancellation.request_stop()
        for _uri, connection in items:
            with connection.lock:
                flight = connection.active_flight
                scf = connection.scf
            if flight is not None:
                flight.land()
            elif scf is not None:
                stop_drone(scf)
            connection.set_status("connected", "Stopped.")
        self.set_status("connected", "Stopped.")
        return {"ok": True, "message": "Stopped.", "status": self.as_dict()}

    def run_script(self, commands):
        items = self.connected_items()
        if not items:
            return {
                "ok": False,
                "error": "Connect the Crazyflie before running blocks.",
                "status": self.as_dict(),
            }

        cancellation.reset()
        self.set_status("running", f"Running block script on {len(items)} drone(s)...")

        results = {}
        errors = {}
        threads = []

        def _run_one(uri, connection):
            try:
                results[uri] = self.run_script_for_connection(connection, commands)
            except Exception as exc:
                errors[uri] = exc

        for uri, connection in items:
            thread = threading.Thread(target=_run_one, args=(uri, connection), daemon=True)
            thread.start()
            threads.append(thread)

        for thread in threads:
            thread.join()

        if errors:
            message = "; ".join(f"{uri}: {exc}" for uri, exc in errors.items())
            self.set_status("error", message)
            return {"ok": False, "error": message, "results": results, "status": self.as_dict()}

        self.set_status("connected", f"Finished running blocks on {len(results)} drone(s).")
        return {"ok": True, "message": self.message, "results": results, "status": self.as_dict()}

    def run_script_for_connection(self, connection, commands):
        with connection.lock:
            scf = connection.scf
        if scf is None:
            raise RuntimeError(f"{connection.uri} is not connected.")

        flight = ScriptFlightSession(scf)
        with connection.lock:
            connection.active_flight = flight
        connection.set_status("running", "Running block script...")
        try:
            for entry in commands:
                if cancellation.stopping():
                    break
                command, args, meta = normalize_command_entry(entry)
                function = BLOCK_FUNCTIONS.get(command)
                if function is None:
                    raise ValueError(f"Block is not implemented yet: {command}")
                connection.set_status(
                    "running",
                    f"Running {format_command_for_status(command, args)}...",
                    meta.get("sourceId"),
                )
                if command == "takeoff":
                    flight.takeoff(args)
                elif command in MOTION_COMMANDS:
                    function(scf, **args, mc=flight.ensure_flying())
                elif command == "land":
                    flight.land()
                else:
                    function(scf, **args)

            if cancellation.stopping():
                flight.land()
                connection.set_status("connected", "Stopped.")
                return {"ok": True, "message": "Stopped."}

            flight.land()
            stop_drone(scf)
            connection.set_status("connected", "Finished running blocks.")
            return {"ok": True, "message": "Finished running blocks."}
        except Exception:
            flight.land()
            stop_drone(scf)
            connection.set_status("error", traceback.format_exc())
            raise
        finally:
            with connection.lock:
                connection.active_flight = None

    def read_power(self, uri=None):
        if uri is not None:
            connection = self.get_connection(uri)
            if connection is None:
                return {"available": False, "message": "Not connected."}
            return self.read_power_for_connection(connection)

        items = self.connected_items()
        if not items:
            return {"available": False, "message": "Not connected."}

        powers = {}
        for uri, connection in items:
            powers[uri] = self.read_power_for_connection(connection)
        return powers[items[0][0]]

    def read_all_power(self):
        powers = {}
        for uri, connection in self.connected_items():
            powers[uri] = self.read_power_for_connection(connection)
        return powers

    def read_power_for_connection(self, connection):
        with connection.lock:
            scf = connection.scf
            if scf is None:
                connection.power = {"available": False, "message": "Not connected."}
                return connection.power

        try:
            power = read_power_log(scf)
        except Exception as exc:
            power = {"available": False, "message": str(exc)}

        with connection.lock:
            connection.power = power
        return power


STATE = DroneState()
DRIVERS_READY = False
DRIVERS_LOCK = threading.Lock()
SHUTTING_DOWN = False


def init_drivers_once():
    global DRIVERS_READY
    with DRIVERS_LOCK:
        if not DRIVERS_READY:
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            cflib.crtp.init_drivers(enable_debug_driver=False)
            DRIVERS_READY = True


def scan_interfaces():
    init_drivers_once()
    found = cflib.crtp.scan_interfaces()
    return [{"uri": uri, "info": str(info)} for uri, info in found]


def probe_uri(uri):
    """Test whether a drone is free and read power if possible.

    A drone already linked to another radio still ACKs scan pings, so the only
    reliable availability test is a full CRTP handshake: it completes on a free
    drone and fails/times out on a busy one. Does not call identify_drone, so no
    motors are spun -- the open+read+close is non-disruptive to a free drone."""
    cf = Crazyflie(rw_cache=str(CACHE_DIR))
    scf = SyncCrazyflie(uri, cf=cf)

    error_box = []

    def _open():
        try:
            scf.open_link()
        except Exception as exc:
            error_box.append(exc)

    open_thread = threading.Thread(target=_open, daemon=True)
    open_thread.start()
    open_thread.join(PROBE_TIMEOUT_SECONDS)

    if open_thread.is_alive() or error_box:
        close_link_quietly(scf)
        return {"availability": "in_use", "power": None}

    try:
        power = read_power_log(scf)
    except Exception as exc:
        power = {"available": False, "message": str(exc)}
    close_link_quietly(scf)
    return {"availability": "available", "power": power}


def scan_with_availability():
    """Discover reachable drones, then label each available / in_use."""
    drones = scan_interfaces()
    connected = {
        uri: connection.as_dict()
        for uri, connection in STATE.connected_items()
    }

    for drone in drones:
        if connected:
            # Connected radios are busy holding links, so avoid probe attempts
            # while any drone is already linked.
            if drone["uri"] in connected:
                drone["availability"] = "connected"
                drone["power"] = connected[drone["uri"]].get("power")
            else:
                drone["availability"] = "unknown"
        else:
            probe = probe_uri(drone["uri"])
            drone["availability"] = probe["availability"]
            if probe["power"] is not None:
                drone["power"] = probe["power"]

    return drones


def read_power_log(scf):
    try:
        data = read_log_values(scf, ["pm.vbat", "pm.batteryLevel", "pm.state"])
    except Exception:
        data = read_log_values(scf, ["pm.vbat"])
    voltage = data.get("pm.vbat")
    level = data.get("pm.batteryLevel")
    estimated = False

    if level is None and voltage is not None:
        level = estimate_battery_percent(voltage)
        estimated = True

    return {
        "available": voltage is not None or level is not None,
        "voltage": voltage,
        "batteryLevel": level,
        "estimated": estimated,
        "state": data.get("pm.state"),
        "message": "Power data available." if voltage is not None or level is not None else "No power log data.",
    }


def read_log_values(scf, variables):
    event = threading.Event()
    result = {}
    error_box = []
    config = LogConfig(name="Power", period_in_ms=100)

    for variable in variables:
        config.add_variable(variable)

    def _data_received(_timestamp, data, _logconf):
        result.update(data)
        event.set()

    try:
        scf.cf.log.add_config(config)
        config.data_received_cb.add_callback(_data_received)
        config.start()
        if not event.wait(POWER_LOG_TIMEOUT_SECONDS):
            error_box.append(TimeoutError("Timed out while reading power log."))
    finally:
        try:
            config.stop()
            config.delete()
        except Exception:
            pass
        try:
            config.data_received_cb.remove_callback(_data_received)
        except Exception:
            pass

    if error_box:
        raise error_box[0]
    return result


def estimate_battery_percent(voltage):
    try:
        voltage = float(voltage)
    except (TypeError, ValueError):
        return None
    return round(max(0.0, min(100.0, (voltage - 3.2) / (4.2 - 3.2) * 100.0)))


def normalize_command_entry(entry):
    if isinstance(entry, str):
        return entry, {}, {}
    if not isinstance(entry, dict):
        raise ValueError("Each command must be a string or object.")

    command = entry.get("command")
    if not isinstance(command, str) or not command:
        raise ValueError("Each command object needs a command name.")

    args = entry.get("args", {})
    if args is None:
        args = {}
    if not isinstance(args, dict):
        raise ValueError(f"Command args must be an object: {command}")

    meta = {}
    source_id = entry.get("sourceId")
    if source_id is not None:
        meta["sourceId"] = str(source_id)

    return command, args, meta


def format_command_for_status(command, args):
    if not args:
        return command
    values = ", ".join(f"{key}: {value}" for key, value in args.items())
    return f"{command} ({values})"


class ScriptFlightSession:
    def __init__(self, scf):
        self.scf = scf
        self.mc = None
        # Guards self.mc: the stop handler runs on a different thread than the
        # script and may call land() while the script owns the mc.
        self._lock = threading.Lock()

    def ensure_flying(self, height_m=0.3):
        if self.mc is None:
            mc = MotionCommander(self.scf, default_height=clamp_script_number(height_m, 0.1, 1.0, 0.3))
            mc.take_off()
            with self._lock:
                self.mc = mc
        return self.mc

    def takeoff(self, args):
        height_m = clamp_script_number(args.get("height_m"), 0.1, 1.0, 0.3)
        if self.mc is None:
            mc = MotionCommander(self.scf, default_height=height_m)
            mc.take_off(height_m)
            with self._lock:
                self.mc = mc
        return self.mc

    def land(self):
        with self._lock:
            mc = self.mc
            self.mc = None
        if mc is not None:
            mc.land()


def clamp_script_number(value, minimum, maximum, fallback):
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = fallback
    return max(minimum, min(number, maximum))


def startup_radio_preflight():
    try:
        drones = scan_interfaces()
    except Exception as exc:
        print("Crazyradio preflight failed.")
        print(f"Reason: {exc}")
        print("Close other Crazyflie/Python/ROS programs, unplug/replug the dongle, then scan again.")
        return

    if drones:
        print(f"Crazyradio preflight found {len(drones)} Crazyflie interface(s).")
    else:
        print("Crazyradio preflight found no Crazyflie interfaces yet.")
        print("Make sure the Crazyflie is powered on, then use Scan in the web page.")


def shutdown_cleanly(signum, _frame):
    global SHUTTING_DOWN
    if SHUTTING_DOWN:
        sys.exit(128 + signum)
    SHUTTING_DOWN = True
    STATE.disconnect()
    sys.exit(128 + signum)


def install_shutdown_handlers():
    for signal_name in ("SIGTERM", "SIGHUP"):
        signum = getattr(signal, signal_name, None)
        if signum is not None:
            signal.signal(signum, shutdown_cleanly)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def end_headers(self):
        # SimpleHTTPRequestHandler sends Last-Modified but no Cache-Control, so
        # browsers are free to guess a freshness lifetime and serve app.js /
        # blocks.js from cache without revalidating. Edits then never show up
        # until a hard reload. This is a local dev server; never cache.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def handle_one_request(self):
        try:
            super().handle_one_request()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            # The page was reloaded or closed while we were still writing.
            # Routine, and the error response we would try to send has nowhere
            # to go, so log one line instead of a traceback per aborted request.
            self.log_message("client disconnected before the response was sent")
            self.close_connection = True

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/status":
            self.send_json(STATE.as_dict())
            return

        if parsed.path == "/api/power":
            try:
                powers = STATE.read_all_power()
                primary_power = next(iter(powers.values()), {"available": False, "message": "Not connected."})
                self.send_json({"ok": True, "power": primary_power, "powers": powers, "status": STATE.as_dict()})
            except Exception as exc:
                self.send_json(
                    {
                        "ok": False,
                        "error": str(exc),
                        "trace": traceback.format_exc(),
                        "status": STATE.as_dict(),
                    },
                    HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return

        if parsed.path == "/api/scan":
            try:
                drones = scan_with_availability()
                available = sum(1 for drone in drones if drone.get("availability") == "available")
                if STATE.as_dict()["connected"] is False:
                    STATE.set_status(
                        "disconnected",
                        f"Found {len(drones)} drone(s), {available} available.",
                    )
                self.send_json({"ok": True, "drones": drones, "status": STATE.as_dict()})
            except Exception as exc:
                self.send_json(
                    {
                        "ok": False,
                        "error": str(exc),
                        "trace": traceback.format_exc(),
                        "status": STATE.as_dict(),
                    },
                    HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return

        if parsed.path == "/":
            self.path = "/index.html"

        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/connect":
            payload = self.read_json()
            uris = payload.get("uris")
            if uris is None:
                uri = payload.get("uri")
                uris = [uri] if uri else []
            if not isinstance(uris, list) or not all(isinstance(uri, str) and uri for uri in uris):
                self.send_json({"ok": False, "error": "Missing uri."}, HTTPStatus.BAD_REQUEST)
                return
            try:
                init_drivers_once()
                result = None
                for uri in uris:
                    result = STATE.connect(uri)
                self.send_json(result or {"ok": True, "status": STATE.as_dict()})
            except Exception as exc:
                STATE.set_status("error", str(exc))
                self.send_json(
                    {
                        "ok": False,
                        "error": str(exc),
                        "trace": traceback.format_exc(),
                        "status": STATE.as_dict(),
                    },
                    HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return

        if parsed.path == "/api/disconnect":
            payload = self.read_json()
            uri = payload.get("uri")
            try:
                self.send_json(STATE.disconnect(uri))
            except Exception as exc:
                self.send_json(
                    {"ok": False, "error": str(exc), "status": STATE.as_dict()},
                    HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return

        if parsed.path == "/api/stop":
            try:
                self.send_json(STATE.stop())
            except Exception as exc:
                STATE.set_status("error", str(exc))
                self.send_json(
                    {"ok": False, "error": str(exc), "trace": traceback.format_exc(), "status": STATE.as_dict()},
                    HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return

        if parsed.path == "/api/run_script":
            payload = self.read_json()
            commands = payload.get("commands", [])
            if not isinstance(commands, list):
                self.send_json({"ok": False, "error": "commands must be a list."}, HTTPStatus.BAD_REQUEST)
                return
            try:
                self.send_json(STATE.run_script(commands))
            except Exception as exc:
                STATE.set_status("error", str(exc))
                self.send_json(
                    {
                        "ok": False,
                        "error": str(exc),
                        "trace": traceback.format_exc(),
                        "status": STATE.as_dict(),
                    },
                    HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return

        self.send_error(HTTPStatus.NOT_FOUND)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def send_json(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    host = "127.0.0.1"
    port = 8765
    atexit.register(STATE.disconnect)
    install_shutdown_handlers()
    startup_radio_preflight()
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Crazyflie Scratch control: http://{host}:{port}")
    print("Keep this terminal open while using the web page.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        STATE.disconnect()


if __name__ == "__main__":
    main()
