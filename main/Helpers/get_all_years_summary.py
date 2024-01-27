
import random
import datetime
from os import getcwd
from pathlib import Path
from typing import List

from django.db.models.functions import ExtractYear

import main.models as models
from main.Helpers.image_utils import getBase64FromPath
from main.Helpers.file_utils import getIconFilePath

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


def getRandomImagesFromYear(year: int) -> List[str]:
    ''' Find images from a year if they exist. '''
    year_images = getAllImagesInYear(year)
    images_icon_files = [getIconFilePath(Path(img.file_path)) for img in year_images]
    valid_icons = list(filter(lambda p: p.exists(), images_icon_files))

    selected_icon_paths = []
    if len(valid_icons) >= NR_IMAGES_TO_DISPLAY:
        selected_icon_paths = random.sample(valid_icons, k=NR_IMAGES_TO_DISPLAY)
    elif valid_icons:
        selected_icon_paths = random.choices(valid_icons, k=NR_IMAGES_TO_DISPLAY)
    else:
        # ToDo get a completely random set of icons for this case
        selected_icon_paths = [f"{getcwd()}/static/Image/missing_icon.png"]  # type: ignore
        selected_icon_paths *= NR_IMAGES_TO_DISPLAY

    return [getBase64FromPath(path) for path in selected_icon_paths]


def getAllYearSummaryInformation(context: dict):
    ''' Get information about stored years. '''
    context = getAllEntryYears(context)
    context['icon_paths'] = {}
    for year in context['all_years']:
        context['icon_paths'][year] = getRandomImagesFromYear(year)
