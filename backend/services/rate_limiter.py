import os
import time
from collections import defaultdict

DAILY_LIMIT = int(os.environ.get("DAILY_RATE_LIMIT", "50"))

LOCAL_IPS = {"127.0.0.1", "::1", "localhost"}

_requests: dict[str, list[float]] = defaultdict(list)


def _cleanup(ip: str):
    now = time.time()
    cutoff = now - 86400
    _requests[ip] = [t for t in _requests[ip] if t > cutoff]


def is_local(ip: str) -> bool:
    return ip in LOCAL_IPS or ip.startswith("192.168.") or ip.startswith("10.")


def check_and_increment(ip: str) -> tuple[bool, int]:
    if is_local(ip):
        return True, DAILY_LIMIT

    _cleanup(ip)
    remaining = DAILY_LIMIT - len(_requests[ip])

    if remaining <= 0:
        return False, 0

    _requests[ip].append(time.time())
    return True, remaining - 1


def get_remaining(ip: str) -> int:
    if is_local(ip):
        return DAILY_LIMIT
    _cleanup(ip)
    return max(0, DAILY_LIMIT - len(_requests[ip]))
