"""Business dates use the demo's configured timezone; event instants remain UTC."""

import os
from datetime import datetime
from zoneinfo import ZoneInfo


def business_today():
    return datetime.now(ZoneInfo(os.getenv("BUSINESS_TIMEZONE", "America/Sao_Paulo"))).date()
