"""Get latest entry from database"""

from typing import Tuple, Optional

from main.models import Entry

from main.database_layer.date_slugs import convert_date_to_url_tuple


def get_latest_entry_tuple() -> Optional[Tuple[str, str, str]]:
    """Return year/month/day tuple of latest entry or None if no entries"""
    output = None
    all_entities = Entry.objects.all()

    if all_entities:
        output = convert_date_to_url_tuple(all_entities.latest("last_edited").date)

    return output
