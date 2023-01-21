
from django.http import HttpResponse
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
    destination_folder = Path(f"{getcwd()}/Images")

    for file in files:
        if not file.exists() or file.is_dir():
            continue

        if pathHasImageTag(file):
            file.unlink()
        else:
            destination_path = destination_folder/file.name
            move(str(file), str(destination_path))


def moveImagesOutOfADeleteFolder(entry: models.Entry):
    image_folder = Path(getStoredImageFolder(entry.name))
    if not image_folder.exists():
        return

    files = listdir(str(image_folder))
    files = [image_folder/file for file in files]
    
    moveFilesOutOfFolder(files)
    removeEmptyParentFolders(image_folder)


def deleteEntryAndContent(post_data):
    if "name" not in post_data:
        return HttpResponse(f'No name in post data', content_type='text/plain')

    name = post_data["name"]
    entry = models.Entry.objects.filter(name=name)

    if not entry.exists():
        return HttpResponse(f'Invalid entry {name}', content_type='text/plain')

    entry = entry[0]
    deleteEntryContent(entry)
    moveImagesOutOfADeleteFolder(entry)
    entry.delete()

    success_message = "It's gone! Reload the page to delete your local copy."
    return HttpResponse(success_message, content_type='text/plain')
