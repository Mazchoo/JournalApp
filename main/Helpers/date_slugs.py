"""Convert strings representing dates to concrete date helpers"""
from datetime import datetime
import re
from typing import Tuple, Optional

from main.Helpers.date_contants import DateConstants


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


def convert_date_to_url_tuple(date: datetime) -> Tuple[str, str, str]:
    """Convert date time to tuple of strings"""
    return (str(date.year), date.strftime("%B"), str(date.day))


def date_exists(context) -> bool:
    """Return if day, month, year in context represents a real date"""
    # ToDo - use better type instead of context
    day = context["day"] if "day" in context else 1

    month = context["month"] if "month" in context else "January"
    month_names = DateConstants.month_names
    month_ind = month_names.index(month) + 1

    year = context["year"]

    try:
        datetime(year, month_ind, day)
    except ValueError:
        return False

    return True
