"""Get context for all years summary"""

import random
import datetime
from os import getcwd
from pathlib import Path
from typing import List
from functools import lru_cache

from django.db.models.functions import ExtractYear

from main.models import Entry, EntryImage
from main.Helpers.image_utils import get_base64_from_image, create_image_icon
from main.Helpers.file_utils import get_icon_file_path, get_base_entry_path

# ToDo - This should be from a common settings file
NR_IMAGES_TO_DISPLAY = 18
MISSING_IMAGE = "/static/Image/missing_icon.png"


def get_current_year():
    """Get the year of today."""
    return datetime.date.today().year


def get_all_images_in_year(year: int):
    """Load all database images from a certain year"""
    return EntryImage.objects.all().filter(entry__name__istartswith=f"{year}-")


def get_all_entry_years(context: dict) -> dict:
    """Add all available years to context dictionary"""
    distinct_years = (
        Entry.objects.all().annotate(year=ExtractYear("date")).values("year").distinct()
    )
    years = [entry["year"] for entry in distinct_years]
    years.sort()

    context["all_years"] = years if years else [get_current_year()]
    return context


def get_selection_of_icons(valid_images: List[Path]) -> List[Path]:
    """Get a list of paths to icon files represenitng a random selection of one year"""
    selected_image_paths = []
    if len(valid_images) >= NR_IMAGES_TO_DISPLAY:
        selected_image_paths = random.sample(valid_images, k=NR_IMAGES_TO_DISPLAY)
    elif valid_images:
        selected_image_paths = random.choices(valid_images, k=NR_IMAGES_TO_DISPLAY)
    else:
        selected_image_paths = [Path(f"{getcwd()}{MISSING_IMAGE}")]
        selected_image_paths *= NR_IMAGES_TO_DISPLAY

    return selected_image_paths


def get_valid_icon_paths(selected_img_paths: List[Path]) -> List[Path]:
    """Get a list of all icon paths"""
    valid_icon_paths = []
    icon_paths = [get_icon_file_path(path) for path in selected_img_paths]
    for icon_path, path in zip(icon_paths, selected_img_paths):
        if icon_path.exists() or create_image_icon(path):
            valid_icon_paths.append(icon_path)
        else:
            valid_icon_paths.append(Path(f"{getcwd()}{MISSING_IMAGE}"))

    return valid_icon_paths


def get_random_images_from_year(year: int) -> List[str]:
    """Find images from a year if they exist."""
    year_images = get_all_images_in_year(year)
    image_files = [
        Path(get_base_entry_path(Path(img.file_path))) for img in year_images
    ]
    valid_images = list(filter(lambda p: p.exists(), image_files))

    selected_img_paths = get_selection_of_icons(valid_images)
    valid_icon_paths = get_valid_icon_paths(selected_img_paths)
    return [get_base64_from_image(p) for p in valid_icon_paths]


@lru_cache(maxsize=1)
def get_all_year_summary_information(context: dict):
    """Get information about stored years."""
    context = get_all_entry_years(context)
    context["icon_paths"] = {}
    for year in context["all_years"]:
        context["icon_paths"][year] = get_random_images_from_year(year)
