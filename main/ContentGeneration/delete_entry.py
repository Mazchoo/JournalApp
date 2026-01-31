"""Implementation of deleting an entry"""

from pathlib import Path
from os import listdir
from shutil import move
from typing import List

from django.http import JsonResponse

from Journal.settings import ENTRY_FOLDER
from main.models import Entry, Content
from main.ContentGeneration.content_factory_models import CONTENT_MODELS
from main.Helpers.file_utils import (
    get_stored_media_folder,
    remove_empty_parent_folders,
    path_has_image_extension,
)


def delete_entry_content(entry: Entry):
    """Delete an entry from the database"""
    delete_content_ids = entry.content.get_queryset()
    Content.objects.filter(id__in=delete_content_ids).delete()

    for Model in CONTENT_MODELS.values():
        Model.objects.filter(entry=entry.name).delete()


def move_files_out_of_folder(files: List[Path]):
    """Move files from dated folder to main entry folder"""
    destination_folder = Path(ENTRY_FOLDER)

    for file in files:
        if not file.exists() or file.is_dir():
            continue

        if path_has_image_extension(file):
            file.unlink()
        else:
            destination_path = destination_folder / file.name
            move(str(file), str(destination_path))


def move_files_from_entry(entry: Entry):
    """Move files from entry's date folder to base folder"""
    image_folder = Path(get_stored_media_folder(entry.name))
    if not image_folder.exists():
        return

    files = listdir(str(image_folder))
    paths_to_move_files = [image_folder / file for file in files]

    move_files_out_of_folder(paths_to_move_files)
    remove_empty_parent_folders(image_folder)


def delete_entry_and_content(post_data):
    """Clear out content from entry's date folder and update database"""
    if "name" not in post_data:
        return JsonResponse({"error": "No name in post data"})

    name = post_data["name"]
    entry = Entry.objects.filter(name=name)

    if not entry.exists():
        return JsonResponse({"error": f"Invalid entry {name}"})

    entry = entry[0]
    delete_entry_content(entry)
    move_files_from_entry(entry)
    entry.delete()

    success_message = "It's gone!"
    return JsonResponse({"success": success_message})
