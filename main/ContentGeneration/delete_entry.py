
from django.http import HttpResponse
from pathlib import Path
from os import listdir, getcwd, rmdir
from shutil import move
from typing import List

import main.models as models
from main.Helpers.image_utils import getImageFolder


def deleteEntryContent(entry: models.Entry):
    delete_content_ids = entry.content.get_queryset()
    models.Content.objects.filter(id__in=delete_content_ids).delete()

    for Model in models.CONTENT_MODELS.values():
        Model.objects.filter(entry=entry.name).delete()

reserved_image_tags = ["_icon", "_resized"]

def pathHasImageTag(path: Path):
    for tag in reserved_image_tags:
        if path.stem.rfind(tag) == len(path.stem) - len(tag):
            return True
    return False

def moveFilesOutOfFolder(files: List[Path]):
    destination_folder = Path(f"{getcwd()}/Images")

    for file in files:
        if not file.exists() or file.is_dir():
            continue

        is_tagged = pathHasImageTag(file)

        if is_tagged:
            file.unlink()
        else:
            destination_path = destination_folder/f"{file.stem}{file.suffix}"
            move(str(file), str(destination_path))


def removeEmptyParentFolders(folder: Path):
    if not folder.is_dir():
        return
    
    rmdir(str(folder))
    
    parent_folder = folder.parent
    if listdir(str(parent_folder)) == []:
        removeEmptyParentFolders(parent_folder)


def moveImagesOutOfADeleteFolder(entry: models.Entry):
    image_folder = Path(getImageFolder(entry.name))
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
    entry = models.Entry.objects.all().filter(name=name)

    if not entry.exists():
        return HttpResponse(f'Invalid entry {name}', content_type='text/plain')

    entry = entry[0]
    deleteEntryContent(entry)
    moveImagesOutOfADeleteFolder(entry)
    entry.delete()

    return HttpResponse("It's gone! Reload the page to delete your local copy.", content_type='text/plain')
