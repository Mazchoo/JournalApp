"""Helpers to add date information for navigation"""

from datetime import datetime

from main.models import Entry
from main.config import DateConstants

from main.database_layer.fe_interfaces import (
    DayAndMonthNamesContext,
    YearNavigationContext,
    MonthNavigationContext,
    DayNavigationContext,
    DaysWithEntriesContext,
)


def get_day_and_month_names() -> DayAndMonthNamesContext:
    """Return names of days and months."""
    return {
        "full_day_names": DateConstants.day_names,
        "short_day_names": DateConstants.day_names_short,
        "months_in_year": DateConstants.month_names,
        "year": None,
        "month": None,
    }


def get_year_information(year: int) -> YearNavigationContext:
    """Return navigation information for a year."""
    return {
        "year": year,
        "next_year": year + 1,
        "prev_year": year - 1,
    }


def get_month_information(year: int, month: str) -> MonthNavigationContext:
    """Return navigation information for a month."""
    month_names = DateConstants.month_names
    day_names = DateConstants.day_names

    month_ind = month_names.index(month) + 1

    # One based indices
    next_month_ind = month_ind + 1 if month_ind < 12 else 1
    next_month_year = year if month_ind < 12 else year + 1
    prev_month_ind = month_ind - 1 if month_ind > 1 else 12
    prev_month_year = year if month_ind > 1 else year - 1

    delta_curr_to_next_month = datetime(next_month_year, next_month_ind, 1) - datetime(
        year, month_ind, 1
    )
    nr_days_in_month = delta_curr_to_next_month.days
    delta_prev_to_curr_month = datetime(year, month_ind, 1) - datetime(
        prev_month_year, prev_month_ind, 1
    )
    nr_days_in_last_month = delta_prev_to_curr_month.days

    first_day_name = datetime(year, month_ind, 1).strftime("%A")
    last_day_name = datetime(year, month_ind, nr_days_in_month).strftime("%A")

    first_day_ind = day_names.index(first_day_name)
    preceding_days = [nr_days_in_last_month - i for i in range(first_day_ind)]
    last_day_ind = day_names.index(last_day_name)

    return {
        "month": month,
        "next_month": month_names[next_month_ind - 1],
        "next_month_year": next_month_year,
        "prev_month": month_names[prev_month_ind - 1],
        "prev_month_year": prev_month_year,
        "preceding_days": list(reversed(preceding_days)),
        "trailing_days": [i + 1 for i in range(6 - last_day_ind)],
        "days_in_month": list(range(1, nr_days_in_month + 1)),
        "nr_days_in_prev_month": nr_days_in_last_month,
        "min_day_to_max_day": list(range(1, 32)),
    }


def get_day_information(
    year: int, day: int, month_info: MonthNavigationContext
) -> DayNavigationContext:
    """Return navigation information for a day."""
    month_names = DateConstants.month_names
    month = month_info["month"]
    month_ind = month_names.index(month) + 1

    day_str = ("0" + str(day))[-2:]
    month_str = ("0" + str(month_ind))[-2:]
    date_slug = f"{year}-{month_str}-{day_str}"

    if day != 11 and day % 10 == 1:
        suffix = "st"
    elif day != 12 and day % 10 == 2:
        suffix = "nd"
    elif day != 13 and day % 10 == 3:
        suffix = "rd"
    else:
        suffix = "th"

    days_in_month = month_info["days_in_month"]
    nr_days_in_prev_month = month_info["nr_days_in_prev_month"]

    next_day = day + 1 if day < len(days_in_month) else 1
    next_day_month = month_ind if next_day != 1 else month_ind + 1
    next_day_month = next_day_month if next_day_month < 13 else 1
    next_day_year = year if next_day != 1 or next_day_month != 1 else year + 1

    prev_day = day - 1 if day > 1 else nr_days_in_prev_month
    prev_day_month = month_ind if day > 1 else month_ind - 1
    prev_day_month = prev_day_month if prev_day_month > 0 else 12
    prev_day_year = year if not (prev_day == 31 and prev_day_month == 12) else year - 1

    return {
        "day": day,
        "date_slug": date_slug,
        "day_suffix": suffix,
        "next_day": next_day,
        "next_day_month": month_names[next_day_month - 1],
        "next_day_year": next_day_year,
        "prev_day": prev_day,
        "prev_day_month": month_names[prev_day_month - 1],
        "prev_day_year": prev_day_year,
        "day_name": datetime(year, month_ind, day).strftime("%A"),
    }


def get_days_with_entries_in_month(
    year: int, month: str, next_month: str, next_month_year: int
) -> DaysWithEntriesContext:
    """Return list of days in month that have entries."""
    month_names = DateConstants.month_names
    month_ind = month_names.index(month) + 1
    next_month_ind = month_names.index(next_month) + 1

    first_day = datetime(year, month_ind, 1)
    last_day = datetime(next_month_year, next_month_ind, 1)

    entries = (
        Entry.objects.all()
        .filter(date__date__gte=first_day)
        .filter(date__date__lt=last_day)
    )

    return {"days_with_an_entry": [entry.date.day for entry in entries]}
