import asyncio
import ipaddress
import socket
from urllib.parse import urlparse

from app.core.config import settings


def _is_blocked(ip: ipaddress._BaseAddress) -> bool:
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    # Not globally routable: private, loopback, link-local (cloud metadata), CGNAT, reserved
    return (not ip.is_global) or ip.is_multicast


async def validate_upstream_url(url: str) -> str:
    """Raises ValueError if the URL is unsafe. Returns the URL if OK."""
    is_prod = settings.app_env == "production"
    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must start with http:// or https://")
    if is_prod and parsed.scheme != "https":
        raise ValueError("HTTPS is required in production")
    if not parsed.hostname:
        raise ValueError("URL has no hostname")
    if parsed.username or parsed.password:
        raise ValueError("Credentials inside the URL are not allowed")

    port = parsed.port or (443 if parsed.scheme == "https" else 80)

    try:
        infos = await asyncio.get_running_loop().getaddrinfo(
            parsed.hostname, port, type=socket.SOCK_STREAM
        )
    except socket.gaierror:
        raise ValueError("Hostname cannot be resolved")

    if is_prod:
        for info in infos:
            ip = ipaddress.ip_address(info[4][0].split("%")[0])
            if _is_blocked(ip):
                raise ValueError("URL points to a private or internal address")

    return url