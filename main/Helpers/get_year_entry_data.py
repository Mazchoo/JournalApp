
import random
from pathlib import Path

import main.models as models
from main.ContentGeneration.image_utils import (getIconFilePath, loadImageDirectly, 
                                                addEncodingTypeToBase64)


def getIconForEachYear(context: dict):
    year = context["year"]
    output_dict = {}
    
    for i in range(1, 12):
        month = ("0" + str(i))[-2:]
        month_name = context["months_in_year"][i - 1]

        month_images = models.EntryImage.objects.all().filter(
            entry__name__istartswith=f"{year}-{month}-"
        )
        images_icon_files = [getIconFilePath(Path(img.file_path)) for img in month_images]
        valid_icons = list(filter(lambda p: p.exists(), images_icon_files))

        if valid_icons:
            selected_icon_path = valid_icons[random.randint(0, len(valid_icons) - 1)]
            b64_string, ecoding_type = loadImageDirectly(selected_icon_path)
            output_dict[month_name] = addEncodingTypeToBase64(b64_string, ecoding_type)
            
    context['icon_paths'] = output_dict


def getNrEntiresForEachYear(context: dict):
    year = context["year"]
    output_dict = {}

    for i in range(1, 12):
        month = ("0" + str(i))[-2:]
        month_name = context["months_in_year"][i - 1]
        entries = models.Entry.objects.all().filter(name__istartswith=f"{year}-{month}")
        
        output_dict[month_name] = len(entries)
    
    context['nr_entries_per_month'] = output_dict
