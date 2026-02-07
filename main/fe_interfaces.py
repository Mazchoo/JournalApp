"""TypedDict definitions for frontend interface outputs from date_information functions."""

from typing import TypedDict


class YearInformationContext(TypedDict):
    """Information related to given year in calendar"""

    year: int
    next_year: int
    prev_year: int


class MonthInformationContext(YearInformationContext):
    """Information related to given month in calendar"""

    month: str
    next_month: str
    next_month_year: int
    prev_month: str
    prev_month_year: int
    preceding_days: list[int]
    trailing_days: list[int]
    days_in_month: list[int]
    nr_days_in_prev_month: int
    min_day_to_max_day: list[int]


class DayInformationContext(MonthInformationContext):
    """Information related to given day in calendar"""

    day: int
    date_slug: str
    day_suffix: str
    next_day: int
    next_day_month: str
    next_day_year: int
    prev_day: int
    prev_day_month: str
    prev_day_year: int
    day_name: str


class DaysWithEntriesContext(TypedDict):
    """Days in a given span that contain entries"""

    days_with_an_entry: list[int]


class DayAndMonthNamesContext(TypedDict):
    """Output added by add_day_and_month_names."""

    full_day_names: list[str]
    short_day_names: list[str]
    months_in_year: list[str]
