"""High level provision of date and entry information for different views"""

from typing import Optional

from main.database_layer.fe_interfaces import (
    DayAndMonthNamesContext,
    HomePageContext,
    YearPageContext,
    MonthPageContext,
)
from main.database_layer.date_information import (
    get_day_and_month_names,
    get_month_information,
    get_year_information,
    get_days_with_entries_in_month,
)
from main.database_layer.get_year_entry_data import get_year_entry_information
from main.database_layer.get_all_years_summary import (
    get_all_year_summary_information,
    get_all_entry_years,
)
from main.content_generation.request_forms import MonthNameForm


def put_day_and_month_names_into_context(
    **kwargs,
) -> Optional[DayAndMonthNamesContext]:
    """Put general date information from slug into context. Returns None if month is invalid."""
    if "month" in kwargs:
        form = MonthNameForm({"month": kwargs["month"]})
        if not form.is_valid():
            return None
    context = get_day_and_month_names()
    context.update(kwargs)  # type: ignore[typeddict-item]
    return context


def get_home_page_context(
    context: DayAndMonthNamesContext,
) -> HomePageContext:
    """Build context for home page."""
    all_years_info = get_all_entry_years()
    icon_paths = get_all_year_summary_information(tuple(all_years_info["all_years"]))

    return {
        **context,
        **all_years_info,
        "icon_paths": icon_paths,
    }


def get_year_page_context(
    context: DayAndMonthNamesContext,
    year: int,
) -> YearPageContext:
    """Build context for year page."""
    year_info = get_year_information(year)
    year_entry_info = get_year_entry_information(year)

    return {
        **context,  # type: ignore[typeddict-item]
        **year_info,
        **year_entry_info,
    }


def get_month_page_context(
    context: DayAndMonthNamesContext,
    year: int,
    month: str,
) -> MonthPageContext:
    """Build context for month page."""
    year_info = get_year_information(year)
    month_info = get_month_information(year, month)
    days_info = get_days_with_entries_in_month(
        year, month, month_info["next_month"], month_info["next_month_year"]
    )

    return {
        **context,  # type: ignore[typeddict-item]
        **year_info,
        **month_info,
        **days_info,
    }
