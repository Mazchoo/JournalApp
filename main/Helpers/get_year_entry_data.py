import random
from pathlib import Path

import main.models as models
from main.Helpers.image_utils import getBase64FromPath, createImageIcon
from main.Helpers.file_utils import getMediaPath, get_icon_file_path


def getMonthStrings(i: int, context: dict):
    month = ("0" + str(i))[-2:]
    month_name = context["months_in_year"][i - 1]
    return month, month_name


def getAllEntriesInMonth(year: int, month: str):
    return models.Entry.objects.all().filter(name__istartswith=f"{year}-{month}")


def getAllImagesInMonth(year: int, month: str):
    return models.EntryImage.objects.all().filter(
        entry__name__istartswith=f"{year}-{month}-"
    )


def getAllVideosInMonth(year: int, month: str):
    return models.EntryVideo.objects.all().filter(
        entry__name__istartswith=f"{year}-{month}-"
    )


def getIconForEachMonth(context: dict, year: int):
    output_dict = {}

    for i in range(1, 13):
        month, month_name = getMonthStrings(i, context)

        month_images = getAllImagesInMonth(year, month)
        month_videos = getAllVideosInMonth(year, month)

        image_files = [Path(getMediaPath(Path(img.file_path))) for img in month_images]
        image_files.extend(
            [Path(getMediaPath(Path(vid.file_path))) for vid in month_videos]
        )
        valid_images = list(filter(lambda p: p.exists(), image_files))

        if valid_images:
            selected_image = valid_images[random.randint(0, len(valid_images) - 1)]
            selected_icon_path = get_icon_file_path(selected_image)

            if selected_icon_path.exists() or createImageIcon(selected_image):
                output_dict[month_name] = getBase64FromPath(selected_icon_path)

    return output_dict


def getNrEntiresForEachYear(context: dict, year: int):
    output_dict = {}

    for i in range(1, 13):
        month, month_name = getMonthStrings(i, context)
        entries = getAllEntriesInMonth(year, month)

        output_dict[month_name] = len(entries)

    return output_dict


def getLastTimeEntriesWereUpdated(context: dict, year: int):
    output_dict = {}

    for i in range(1, 13):
        month, month_name = getMonthStrings(i, context)
        entries = getAllEntriesInMonth(year, month)

        last_update = (
            max([entry.last_edited for entry in entries]) if entries else "never"
        )
        output_dict[month_name] = last_update

    return output_dict


def getYearEntryInformation(context: dict):
    year = context["year"]
    context["icon_paths"] = getIconForEachMonth(context, year)
    context["nr_entries_per_month"] = getNrEntiresForEachYear(context, year)
    context["month_last_edited"] = getLastTimeEntriesWereUpdated(context, year)
