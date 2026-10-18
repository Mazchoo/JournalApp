"""Queries to get an entry from a date or date range"""

import random
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Union

from django.db.models import Count, Max

from main.config import NR_ATTEMPTS_TO_SELECT_IMAGE
from main.database_layer.fe_interfaces import YearEntryInformationContext
from main.models import Entry, EntryImage, EntryMesh, EntryVideo
from main.utils.date import get_month_name
from main.utils.image import get_base64_from_image, lazy_create_image_icon
from main.utils.file_io import get_base_entry_path, get_icon_file_path

MonthStats = dict[int, tuple[int, datetime]]


def get_month_entry_stats(year: int) -> MonthStats:
    """Return {month_index: (entry_count, last_edited)} in one query."""
    rows = (
        Entry.objects.in_year(year)
        .order_by()
        .values("month")
        .annotate(count=Count("name"), last_edited=Max("last_edited"))
    )
    return {row["month"]: (row["count"], row["last_edited"]) for row in rows}


def media_file_paths_by_month(year: int) -> dict[int, list[Path]]:
    """Image, video, and mesh paths for a year, grouped by month.

    Three queries, one per content type. Each returns file paths only.
    """
    paths: dict[int, list[Path]] = defaultdict(list)
    for model in (EntryImage, EntryVideo, EntryMesh):
        rows = model.objects.filter(entry__year=year).values_list(
            "entry__month", "file_path"
        )
        for month, file_path in rows:
            paths[month].append(Path(get_base_entry_path(Path(file_path))))
    return paths


def get_icon_for_each_month(year: int) -> dict[str, str]:
    """Get a base64 dictionary of icon files for each month in a year."""
    output_dict: dict[str, str] = {}
    paths_by_month = media_file_paths_by_month(year)

    for month in range(1, 13):
        month_name = get_month_name(month)
        image_files = paths_by_month.get(month, [])
        last_ind = len(image_files) - 1

        if not image_files:
            continue

        for _ in range(NR_ATTEMPTS_TO_SELECT_IMAGE):
            selected_image = image_files[random.randint(0, last_ind)]
            selected_icon_path = get_icon_file_path(selected_image)

            if lazy_create_image_icon(selected_image):
                output_dict[month_name] = get_base64_from_image(selected_icon_path)
                break

    return output_dict


def get_nr_entries_for_each_month(stats: MonthStats) -> dict[str, int]:
    """Get a dict for each month and a count for each month."""
    output_dict: dict[str, int] = {}

    for month in range(1, 13):
        month_name = get_month_name(month)
        output_dict[month_name] = stats[month][0] if month in stats else 0

    return output_dict


def get_last_time_entries_were_updated(
    stats: MonthStats,
) -> dict[str, Union[datetime, str]]:
    """Return the month mapped to latest time it was edited."""
    output_dict: dict[str, Union[datetime, str]] = {}

    for month in range(1, 13):
        month_name = get_month_name(month)
        output_dict[month_name] = stats[month][1] if month in stats else "never"

    return output_dict


def get_year_entry_information(year: int) -> YearEntryInformationContext:
    """Return year entry information."""
    stats = get_month_entry_stats(year)
    return {
        "icon_paths": get_icon_for_each_month(year),
        "nr_entries_per_month": get_nr_entries_for_each_month(stats),
        "month_last_edited": get_last_time_entries_were_updated(stats),
    }
