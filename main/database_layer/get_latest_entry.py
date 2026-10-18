"""Get latest entry from database"""

from typing import Tuple, Optional

from main.models import Entry

from main.database_layer.date_slugs import convert_date_to_url_tuple


def get_latest_entry_tuple() -> Optional[Tuple[str, str, str]]:
    """Return year/month/day tuple of latest entry or None if no entries"""
    latest = Entry.objects.order_by("-last_edited").first()
    if latest is None:
        return None
    return convert_date_to_url_tuple(latest.year, latest.month, latest.day)
