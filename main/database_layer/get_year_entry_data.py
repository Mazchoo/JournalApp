"""Queries to get an entry from a date or date range"""

import random
from datetime import datetime
from pathlib import Path
from typing import Tuple, Union

from main.config import DateConstants
from main.database_layer.fe_interfaces import YearEntryInformationContext
from main.models import Entry, EntryImage, EntryVideo
from main.utils.image import get_base64_from_image, create_image_icon
from main.utils.file_io import get_base_entry_path, get_icon_file_path


def get_month_strings(month_index: int) -> Tuple[str, str]:
    """Get month information folder name and month name."""
    month = ("0" + str(month_index))[-2:]
    month_name = DateConstants.month_names[month_index - 1]
    return month, month_name


def get_all_entries_in_month(year: int, month: str) -> list[Entry]:
    """Return all entries from a specified month."""
    return list(Entry.objects.all().filter(name__istartswith=f"{year}-{month}"))


def get_all_images_in_month(year: int, month: str) -> list[EntryImage]:
    """Return all image entries from a specified month."""
    return list(
        EntryImage.objects.all().filter(entry__name__istartswith=f"{year}-{month}-")
    )


def get_all_videos_in_month(year: int, month: str) -> list[EntryVideo]:
    """Return all video entries from a specified month."""
    return list(
        EntryVideo.objects.all().filter(entry__name__istartswith=f"{year}-{month}-")
    )


def get_icon_for_each_month(year: int) -> dict[str, str]:
    """Get a base64 dictionary of icon files for each month in a year."""
    output_dict: dict[str, str] = {}

    for i in range(1, 13):
        month, month_name = get_month_strings(i)

        month_images = get_all_images_in_month(year, month)
        month_videos = get_all_videos_in_month(year, month)

        image_files = [
            Path(get_base_entry_path(Path(img.file_path))) for img in month_images
        ]
        image_files.extend(
            [Path(get_base_entry_path(Path(vid.file_path))) for vid in month_videos]
        )
        valid_images = list(filter(lambda p: p.exists(), image_files))

        if valid_images:
            selected_image = valid_images[random.randint(0, len(valid_images) - 1)]
            selected_icon_path = get_icon_file_path(selected_image)

            if selected_icon_path.exists() or create_image_icon(selected_image):
                output_dict[month_name] = get_base64_from_image(selected_icon_path)

    return output_dict


def get_nr_entries_for_each_month(year: int) -> dict[str, int]:
    """Get a dict for each month and a count for each month."""
    output_dict: dict[str, int] = {}

    for i in range(1, 13):
        month, month_name = get_month_strings(i)
        entries = get_all_entries_in_month(year, month)

        output_dict[month_name] = len(entries)

    return output_dict


def get_last_time_entries_were_updated(year: int) -> dict[str, Union[datetime, str]]:
    """Return the month mapped to latest time it was edited."""
    output_dict: dict[str, Union[datetime, str]] = {}

    for i in range(1, 13):
        month, month_name = get_month_strings(i)
        entries = get_all_entries_in_month(year, month)

        last_update: Union[datetime, str] = (
            max(entry.last_edited for entry in entries) if entries else "never"
        )
        output_dict[month_name] = last_update

    return output_dict


def get_year_entry_information(year: int) -> YearEntryInformationContext:
    """Return year entry information."""
    return {
        "icon_paths": get_icon_for_each_month(year),
        "nr_entries_per_month": get_nr_entries_for_each_month(year),
        "month_last_edited": get_last_time_entries_were_updated(year),
    }
