
import random
import datetime
from os import getcwd
from pathlib import Path
from typing import List

from django.db.models.functions import ExtractYear

import main.models as models
from main.Helpers.image_utils import getBase64FromPath, createImageIcon
from main.Helpers.file_utils import getIconPath, getMediaPath

# ToDo - This should be from a common settings file
NR_IMAGES_TO_DISPLAY = 18


def getCurrentYear():
    ''' Get the year of today. '''
    return datetime.date.today().year


def getAllImagesInYear(year: int):
    ''' Load all database images from a certain year '''
    return models.EntryImage.objects.all().filter(
        entry__name__istartswith=f"{year}-"
    )


def getAllEntryYears(context: dict) -> dict:
    ''' Add all available years to context dictionary '''
    distinct_years = models.Entry.objects.all().annotate(year=ExtractYear('date')).values('year').distinct()
    years = [entry['year'] for entry in distinct_years]
    years.sort()

    context['all_years'] = years if years else [getCurrentYear()]
    return context


def getSelectionOfIcons(valid_images: List[Path]) -> List[Path]:
    selected_image_paths = []
    if len(valid_images) >= NR_IMAGES_TO_DISPLAY:
        selected_image_paths = random.sample(valid_images, k=NR_IMAGES_TO_DISPLAY)
    elif valid_images:
        selected_image_paths = random.choices(valid_images, k=NR_IMAGES_TO_DISPLAY)
    else:
        # ToDo Make missing image a fixed path
        # ToDo get a completely random set of icons for this case
        selected_image_paths = [f"{getcwd()}/static/Image/missing.png"]  # type: ignore
        selected_image_paths *= NR_IMAGES_TO_DISPLAY

    return selected_image_paths


def getValidIconPaths(selected_img_paths: List[Path]) -> List[Path]:
    valid_icon_paths = []
    icon_paths = [getIconPath(path) for path in selected_img_paths]
    for icon_path, path in zip(icon_paths, selected_img_paths):
        if icon_path.exists() or createImageIcon(path):
            valid_icon_paths.append(icon_path)
        else:
            valid_icon_paths.append(Path(f"{getcwd()}/static/Image/missing_icon.png"))

    return valid_icon_paths


def getRandomImagesFromYear(year: int) -> List[str]:
    ''' Find images from a year if they exist. '''
    year_images = getAllImagesInYear(year)
    image_files = [Path(getMediaPath(Path(img.file_path))) for img in year_images]
    valid_images = list(filter(lambda p: p.exists(), image_files))

    selected_img_paths = getSelectionOfIcons(valid_images)
    valid_icon_paths = getValidIconPaths(selected_img_paths)
    return [getBase64FromPath(p) for p in valid_icon_paths]


def getAllYearSummaryInformation(context: dict):
    ''' Get information about stored years. '''
    context = getAllEntryYears(context)
    context['icon_paths'] = {}
    for year in context['all_years']:
        context['icon_paths'][year] = getRandomImagesFromYear(year)
