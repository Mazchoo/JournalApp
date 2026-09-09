"""Convert strings representing dates to concrete date helpers"""

from datetime import datetime
import re
from typing import Tuple, Optional

from main.config import DateConstants
from main.utils.date import get_month_name


def get_valid_date_from_slug(slug: str) -> Optional[datetime]:
    """If date slug represents really date in integers, return it, else return None"""
    date_match = re.search(r"(\d{4})\-0?(\d+)\-0?(\d+)", slug)

    if not date_match:
        return None

    year, month, day = date_match.group(1), date_match.group(2), date_match.group(3)

    try:
        year, month, day = int(year), int(month), int(day)
        slug_date = datetime(year, month, day)
    except ValueError:
        return None

    return slug_date


def convert_date_to_url_tuple(
    year: int, month: int, day: int
) -> Optional[Tuple[str, str, str]]:
    """Convert year, month, and day integers to a URL tuple of strings."""
    if month < 1 or month > len(DateConstants.month_names):
        return None
    return (str(year), get_month_name(month), str(day))
