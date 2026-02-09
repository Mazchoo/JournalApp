"""Implementation of deleting an entry"""

from pathlib import Path
from os import listdir
from shutil import move
from typing import List

from django.http import JsonResponse

from Journal.settings import ENTRY_FOLDER
from main.models import Entry, Content
from main.forms import DeleteEntryForm
from main.content_generation.content_factory_models import ContentFactory
from main.utils.file_io import (
    get_stored_media_folder,
    remove_empty_parent_folders,
    path_has_image_extension,
)


def delete_entry_content(entry: Entry):
    """Delete an entry from the database"""
    delete_content_ids = entry.content.get_queryset()
    Content.objects.filter(id__in=delete_content_ids).delete()

    for model in ContentFactory.all_content_models():
        model.objects.filter(entry=entry.name).delete()


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
    form = DeleteEntryForm(post_data)

    if not form.is_valid():
        return JsonResponse({"error": form.errors})

    entry = form.cleaned_data["entry"]
    delete_entry_content(entry)
    move_files_from_entry(entry)
    entry.delete()

    success_message = "It's gone!"
    return JsonResponse({"success": success_message})
