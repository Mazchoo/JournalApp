
import random
from os import getcwd
from pathlib import Path

from django.db.models.functions import ExtractYear

import main.models as models
from main.Helpers.image_utils import getBase64FromPath
from main.Helpers.file_utils import getIconFilePath

NR_IMAGES_TO_DISPLAY = 18

def getAllImagesInYear(year: str):
    return models.EntryImage.objects.all().filter(
        entry__name__istartswith=f"{year}-"
    )


def getAllEntryYears():
    distinct_years = models.Entry.objects.all().annotate(year=ExtractYear('date')).values('year').distinct()
    years = [entry['year'] for entry in distinct_years]
    years.sort()
    return years


def getRandomImagesFromYear(year: int):

    year_images = getAllImagesInYear(year)
    images_icon_files = [getIconFilePath(Path(img.file_path)) for img in year_images]
    valid_icons = list(filter(lambda p: p.exists(), images_icon_files))

    selected_icon_paths = []
    if len(valid_icons) >= NR_IMAGES_TO_DISPLAY:
        selected_icon_paths = random.sample(valid_icons, k=NR_IMAGES_TO_DISPLAY)
    elif valid_icons:
        selected_icon_paths = random.choices(valid_icons, k=NR_IMAGES_TO_DISPLAY)
    else:
        selected_icon_paths = [f"{getcwd()}/Journal/static/Image/missing_icon.JPG"]
        selected_icon_paths *= NR_IMAGES_TO_DISPLAY
        
    output_list = [getBase64FromPath(path) for path in selected_icon_paths]
            
    return output_list


def getAllYearSummaryInformation(context: dict):
    context['all_years']  = getAllEntryYears()
    context['icon_paths'] = {}
    for year in context['all_years']:
        context['icon_paths'][year] = getRandomImagesFromYear(year)
