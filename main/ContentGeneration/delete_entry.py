
from django.http import JsonResponse
from pathlib import Path
from os import listdir, getcwd
from shutil import move
from typing import List

import main.models as models
from main.ContentGeneration.content_factory_models import CONTENT_MODELS
from main.Helpers.file_utils import (getStoredImageFolder, removeEmptyParentFolders,
                                     pathHasImageTag)


def deleteEntryContent(entry: models.Entry):
    delete_content_ids = entry.content.get_queryset()
    models.Content.objects.filter(id__in=delete_content_ids).delete()

    for Model in CONTENT_MODELS.values():
        Model.objects.filter(entry=entry.name).delete()


def moveFilesOutOfFolder(files: List[Path]):
    destination_folder = Path(f"{getcwd()}/Entries")

    for file in files:
        if not file.exists() or file.is_dir():
            continue

        if pathHasImageTag(file):
            file.unlink()
        else:
            destination_path = destination_folder / file.name
            move(str(file), str(destination_path))


def moveImagesOutOfADeleteFolder(entry: models.Entry):
    image_folder = Path(getStoredImageFolder(entry.name))
    if not image_folder.exists():
        return

    files = listdir(str(image_folder))
    paths_to_move_files = [image_folder / file for file in files]

    moveFilesOutOfFolder(paths_to_move_files)
    removeEmptyParentFolders(image_folder)


def deleteEntryAndContent(post_data):
    if "name" not in post_data:
        return JsonResponse({"error": "No name in post data"})

    name = post_data["name"]
    entry = models.Entry.objects.filter(name=name)

    if not entry.exists():
        return JsonResponse({"error": f"Invalid entry {name}"})

    entry = entry[0]
    deleteEntryContent(entry)
    moveImagesOutOfADeleteFolder(entry)
    entry.delete()

    success_message = "It's gone!"
    return JsonResponse({"success": success_message})
