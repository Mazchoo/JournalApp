"""Helpers for working with dates and month names"""

from datetime import datetime

from main.config import DateConstants


def get_month_name(month_index: int) -> str:
    """Get the month name from a one based month index."""
    return DateConstants.month_names[month_index - 1]


def date_exists(year: int, month: str = "January", day: int = 1) -> bool:
    """Return if day, month, year represents a real date."""
    month_names = DateConstants.month_names
    month_ind = month_names.index(month) + 1

    try:
        datetime(year, month_ind, day)
    except ValueError:
        return False

    return True
