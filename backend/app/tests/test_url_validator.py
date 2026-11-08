import asyncio

import pytest

from app.core.config import settings
from app.services.url_validator import validate_upstream_url


@pytest.fixture(autouse=True)
def prod_mode(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")


@pytest.mark.parametrize(
    "url",
    [
        "http://example.com/x",                    # not https
        "https://localhost/x",                     # loopback
        "https://127.0.0.1/x",                     # loopback
        "https://169.254.169.254/latest/meta-data",  # cloud metadata
        "https://10.0.0.5/x",                      # private range
        "https://user:pass@example.com/x",         # credentials in URL
        "ftp://example.com/x",                     # wrong scheme
    ],
)
def test_blocked(url):
    with pytest.raises(ValueError):
        asyncio.run(validate_upstream_url(url))