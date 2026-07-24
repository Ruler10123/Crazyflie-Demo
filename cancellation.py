"""Cooperative cancellation shared between the HTTP stop handler and the
running block script.

The stop handler (a different thread than the one running the script) calls
request_stop(); long-running block functions poll stopping() or use the
interruptible sleep() so they bail out instead of running to completion and
overriding the stop with their own setpoints."""
import threading

_stop_event = threading.Event()


def reset():
    """Clear the flag. Call before starting a new run so a previous stop
    does not immediately abort it."""
    _stop_event.clear()


def request_stop():
    """Signal any running block script to abort as soon as possible."""
    _stop_event.set()


def stopping():
    """True if a stop has been requested."""
    return _stop_event.is_set()


def sleep(seconds):
    """Sleep up to `seconds`, waking immediately if a stop is requested.
    Returns True if a stop was requested."""
    return _stop_event.wait(seconds)
