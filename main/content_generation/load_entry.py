"""Request information from single entries"""

from main.database_layer.fe_interfaces import EntryContentContext
from main.models import Entry

from main.content_generation.content_factory_models import ContentFactory

from main.database_layer.get_context import (
    get_year_information,
    get_month_information,
    get_all_entry_years,
)
from main.database_layer.fe_interfaces import DayAndMonthNamesContext, DayPageContext
from main.database_layer.date_information import get_day_information


def load_all_content_from_entry(date_slug: str) -> EntryContentContext:
    """For content with a given date slug return content information about the entry."""
    output: dict[str, dict] = {}
    content_list: list[dict] = []

    if entry := Entry.objects.filter(name=date_slug).first():
        content_ids = entry.content.get_queryset()

        for i, content in enumerate(content_ids, start=1):
            model = ContentFactory.get(content.content_type)
            content_obj = model.objects.get(pk=content.content_id)
            view_data = content_obj.view()  # type: ignore
            output[str(content)] = view_data
            content_list.append(
                {
                    "index": i,
                    "type": content.content_type,
                    "data": view_data,
                }
            )

    return {"entry_exists": entry is not None, "content_list": content_list}


def get_day_page_context(
    context: DayAndMonthNamesContext,
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
        **context,  # type: ignore[typeddict-item]
        **year_info,
        **month_info,
        **day_info,
        **all_years_info,
        **entry_content,
    }
