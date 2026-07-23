from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import traceback
from urllib.parse import urlparse

import cflib.crtp
from cflib.crazyflie import Crazyflie
from cflib.crazyflie.syncCrazyflie import SyncCrazyflie
from function import BLOCK_FUNCTIONS, stop_drone


ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / "web"
CACHE_DIR = ROOT / ".cache" / "cflib"


class DroneState:
    def __init__(self):
        self.lock = threading.Lock()
        self.scf = None
        self.uri = None
        self.status = "disconnected"
        self.message = "Ready to scan for Crazyflie."

    def as_dict(self):
        with self.lock:
            return {
                "status": self.status,
                "uri": self.uri,
                "message": self.message,
                "connected": self.scf is not None,
            }

    def set_status(self, status, message, uri=None):
        with self.lock:
            self.status = status
            self.message = message
            if uri is not None:
                self.uri = uri

    def connect(self, uri):
        with self.lock:
            if self.scf is not None:
                status = {
                    "status": self.status,
                    "uri": self.uri,
                    "message": self.message,
                    "connected": True,
                }
                return {
                    "ok": True,
                    "message": f"Already connected to {self.uri}.",
                    "status": status,
                }
            self.status = "connecting"
            self.message = f"Connecting to {uri}..."
            self.uri = uri

        cf = Crazyflie(rw_cache=str(CACHE_DIR))
        scf = SyncCrazyflie(uri, cf=cf)
        scf.open_link()

        with self.lock:
            self.scf = scf
            self.status = "connected"
            self.message = f"Connected to {uri}."

        return {"ok": True, "message": f"Connected to {uri}.", "status": self.as_dict()}

    def disconnect(self):
        with self.lock:
            scf = self.scf
            uri = self.uri
            self.scf = None
            self.uri = None
            self.status = "disconnected"
            self.message = "Disconnected."

        if scf is not None:
            scf.close_link()

        return {"ok": True, "message": f"Disconnected from {uri}." if uri else "Disconnected.", "status": self.as_dict()}

    def stop(self):
        with self.lock:
            scf = self.scf
            if scf is None:
                self.status = "disconnected"
                self.message = "No Crazyflie is connected."
                return {"ok": True, "message": self.message, "status": self.as_dict()}

        stop_drone(scf)
        self.set_status("connected", "Stopped.")
        return {"ok": True, "message": "Stopped.", "status": self.as_dict()}

    def run_script(self, commands):
        with self.lock:
            scf = self.scf
            if scf is None:
                return {
                    "ok": False,
                    "error": "Connect the Crazyflie before running blocks.",
                    "status": self.as_dict(),
                }
            self.status = "running"
            self.message = "Running block script..."

        try:
            for command in commands:
                function = BLOCK_FUNCTIONS.get(command)
                if function is None:
                    raise ValueError(f"Block is not implemented yet: {command}")
                function(scf)

            stop_drone(scf)
            self.set_status("connected", "Finished running blocks.")
            return {"ok": True, "message": "Finished running blocks.", "status": self.as_dict()}
        except Exception:
            stop_drone(scf)
            raise


STATE = DroneState()
DRIVERS_READY = False
DRIVERS_LOCK = threading.Lock()


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


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/status":
            self.send_json(STATE.as_dict())
            return

        if parsed.path == "/api/scan":
            try:
                drones = scan_interfaces()
                STATE.set_status("disconnected", f"Found {len(drones)} Crazyflie interface(s).")
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
            uri = payload.get("uri")
            if not uri:
                self.send_json({"ok": False, "error": "Missing uri."}, HTTPStatus.BAD_REQUEST)
                return
            try:
                init_drivers_once()
                self.send_json(STATE.connect(uri))
            except Exception as exc:
                STATE.set_status("error", str(exc), uri)
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
            try:
                self.send_json(STATE.disconnect())
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
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Crazyflie Scratch control: http://{host}:{port}")
    print("Keep this terminal open while using the web page.")
    server.serve_forever()


if __name__ == "__main__":
    main()
