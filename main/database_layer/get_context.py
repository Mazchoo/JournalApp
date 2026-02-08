"""High level provision of date and entry information for different views"""

from main.database_layer.fe_interfaces import (
    HomePageContext,
    YearPageContext,
    MonthPageContext,
    DayPageContext,
)
from main.database_layer.date_information import (
    get_day_information,
    get_month_information,
    get_year_information,
    get_days_with_entries_in_month,
)
from main.database_layer.get_year_entry_data import get_year_entry_information
from main.database_layer.get_all_years_summary import (
    get_all_year_summary_information,
    get_all_entry_years,
)
from main.content_generation.load_entry import load_all_content_from_entry


def get_home_page_context(
    context: dict,
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
    context: dict,
    year: int,
) -> YearPageContext:
    """Build context for year page."""
    year_info = get_year_information(year)
    year_entry_info = get_year_entry_information(year)

    return {
        **context,
        **year_info,
        **year_entry_info,
    }


def get_month_page_context(
    context: dict,
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
        **context,
        **year_info,
        **month_info,
        **days_info,
    }


def get_day_page_context(
    context: dict,
    year: int,
    month: str,
    day: int,
) -> DayPageContext:
    """Build context for day/edit page."""
    year_info = get_year_information(year)
    month_info = get_month_information(year, month)
    day_info = get_day_information(year, day, month_info)
    all_years_info = get_all_entry_years()
    entry_content = load_all_content_from_entry(day_info["date_slug"])

    return {
        **context,
        **year_info,
        **month_info,
        **day_info,
        **all_years_info,
        **entry_content,
    }
