"""Request information from single entries"""

from collections import defaultdict
from typing import Iterable

from django.db.models import Model

from main.content_generation.content_factory_models import ContentFactory
from main.database_layer.date_information import get_day_information
from main.database_layer.fe_interfaces import (
    DayAndMonthNamesContext,
    DayPageContext,
    EntryContentContext,
)
from main.database_layer.get_context import (
    get_all_entry_years,
    get_month_information,
    get_year_information,
)
from main.models import Content, Entry


def load_content_objects(contents: Iterable[Content]) -> dict[str, dict[int, Model]]:
    """Fetch every referenced content row in one query per content type."""
    ids_by_type: dict[str, list[int]] = defaultdict(list)
    for content in contents:
        ids_by_type[content.content_type].append(content.content_id)

    objects: dict[str, dict[int, Model]] = {}
    for content_type, ids in ids_by_type.items():
        query = ContentFactory.get(content_type).objects  # type: ignore[attr-defined]
        if content_type == "mesh":
            query = query.select_related("camera")
        objects[content_type] = query.in_bulk(ids)
    return objects


def load_all_content_from_entry(date_slug: str) -> EntryContentContext:
    """For content with a given date slug return content information about the entry."""
    content_list: list[dict] = []

    entry = Entry.objects.filter(name=date_slug).first()
    if entry is not None:
        contents = list(entry.ordered_content())
        objects_by_type = load_content_objects(contents)

        for i, content in enumerate(contents, start=1):
            content_obj = objects_by_type[content.content_type][content.content_id]
            view_data = content_obj.view()  # type: ignore[attr-defined]
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
