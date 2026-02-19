"""TypedDict definitions for frontend interface outputs from date_information functions."""
# pylint: disable=too-many-ancestors

from datetime import datetime
from typing import Any, TypedDict, Union, Optional

from main.config import IDayNamesOfWeek, IMonthNamesOfYear


class DayAndMonthNamesContext(TypedDict):
    """Output from get_day_and_month_names."""

    full_day_names: IDayNamesOfWeek
    short_day_names: IDayNamesOfWeek
    months_in_year: IMonthNamesOfYear
    year: Optional[int]
    month: Optional[int]


class YearNavigationContext(TypedDict):
    """Navigation info computed from year."""

    year: int
    next_year: int
    prev_year: int


class MonthNavigationContext(TypedDict):
    """Navigation info computed from month."""

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


class DayNavigationContext(TypedDict):
    """Navigation info computed from day."""

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
    """Days in a given span that contain entries."""

    days_with_an_entry: list[int]


class YearEntryInformationContext(TypedDict):
    """Output from get_year_entry_information."""

    icon_paths: dict[str, str]
    nr_entries_per_month: dict[str, int]
    month_last_edited: dict[str, Union[datetime, str]]


class AllEntryYearsContext(TypedDict):
    """Output from get_all_entry_years."""

    all_years: list[int]


class EntryContentContext(TypedDict):
    """Output from load_all_content_from_entry."""

    entry_exists: bool
    content_list: list[dict[str, Any]]


# Full context types - combined for template rendering
class YearInformationContext(DayAndMonthNamesContext, YearNavigationContext):
    """Full context for year page template."""


class MonthInformationContext(YearInformationContext, MonthNavigationContext):
    """Full context for month page template."""


class DayInformationContext(MonthInformationContext, DayNavigationContext):
    """Full context for day page template."""


# Page-level context types - what each page view needs
class HomePageContext(DayAndMonthNamesContext, AllEntryYearsContext):
    """Full context for home page."""

    icon_paths: dict[int, list[str]]


class YearPageContext(YearInformationContext, YearEntryInformationContext):
    """Full context for year page."""


class MonthPageContext(MonthInformationContext, DaysWithEntriesContext):
    """Full context for month page."""


class DayPageContext(DayInformationContext, AllEntryYearsContext, EntryContentContext):
    """Full context for day/edit page."""
