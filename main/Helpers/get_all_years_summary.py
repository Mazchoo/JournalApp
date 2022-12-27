
import random
from pathlib import Path

from django.db.models.functions import ExtractYear

import main.models as models
from main.ContentGeneration.image_utils import getBase64FromPath, getIconFilePath

def getAllImagesInYear(year: str):
    return models.EntryImage.objects.all().filter(
        entry__name__istartswith=f"{year}-"
    )


def getAllEntryYears():
    distinct_years = models.Entry.objects.all().annotate(year=ExtractYear('date')).values('year').distinct()
    return [entry['year'] for entry in distinct_years]


def getRandomImagesFromYear(year: int):
    output_list = []

    year_images = getAllImagesInYear(year)
    images_icon_files = [getIconFilePath(Path(img.file_path)) for img in year_images]
    valid_icons = list(filter(lambda p: p.exists(), images_icon_files))

    if valid_icons:
        selected_icon_paths = random.choices(valid_icons, k=12)
        output_list = [getBase64FromPath(path) for path in selected_icon_paths]
            
    return output_list


def getAllYearSummaryInformation(context: dict):
    context['all_years']  = getAllEntryYears()
    context['icon_paths'] = {}
    for year in context['all_years']:
        context['icon_paths'][year] = getRandomImagesFromYear(year)
