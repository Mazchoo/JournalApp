"""Implementation of deleting an entry"""

from pathlib import Path
from os import listdir
from shutil import move
from typing import List, Optional

from django.http import JsonResponse

from main.models import Entry, Content
from main.forms import DeleteEntryForm
from main.utils.errors import form_errors_message
from main.content_generation.content_factory_models import ContentFactory
from main.config import ImageConstants
from main.utils.file_io import (
    get_base_entry_path,
    get_stored_media_folder,
    is_media_content_file,
    remove_empty_parent_folders,
    remove_icon_file,
    path_has_image_reserved_tag,
)


def delete_entry_content(entry: Entry):
    """Delete an entry from the database"""
    delete_content_ids = entry.content.get_queryset()
    Content.objects.filter(id__in=delete_content_ids).delete()

    for model in ContentFactory.all_content_models():
        model.objects.filter(entry=entry.name).delete()


def _is_ignored_media_file(file: Path, ignore_file_names: List[str]) -> bool:
    """True if the file or a reserved-tag companion of it should stay put."""
    if file.name in ignore_file_names:
        return True

    return any(
        file.stem == f"{Path(ignored_name).stem}{tag}"
        for ignored_name in ignore_file_names
        for tag in ImageConstants.reserved_image_tags
    )


def move_files_out_of_folder(
    files: List[Path], ignore_file_names: Optional[List[str]] = None
):
    """Move media files from dated folder to main entry folder."""
    ignore_names = [Path(name).name for name in (ignore_file_names or [])]

    for file in files:
        if not file.exists() or file.is_dir():
            continue

        if _is_ignored_media_file(file, ignore_names):
            continue

        if path_has_image_reserved_tag(file):
            file.unlink()
        elif is_media_content_file(file):
            remove_icon_file(file)
            destination_path = Path(get_base_entry_path(file.name))
            move(str(file), str(destination_path))


def remove_files_from_entry(
    entry: Entry, ignore_file_names: Optional[List[str]] = None
):
    """Move files from entry's date folder to base folder"""
    if (stored_folder := get_stored_media_folder(entry.name)) is None:
        return

    image_folder = Path(stored_folder)
    if not image_folder.exists():
        return

    files = listdir(str(image_folder))
    paths_to_move_files = [image_folder / file for file in files]

    move_files_out_of_folder(paths_to_move_files, ignore_file_names)
    remove_empty_parent_folders(image_folder)


def delete_entry_and_content(post_data: dict) -> JsonResponse:
    """Clear out content from entry's date folder and update database"""
    form = DeleteEntryForm({"entry": post_data.get("entry")})

    if not form.is_valid():
        return JsonResponse({"error": form_errors_message(form.errors)})

    entry = form.cleaned_data["entry"]
    delete_entry_content(entry)
    remove_files_from_entry(entry)
    entry.delete()

    success_message = "It's gone!"
    return JsonResponse({"success": success_message})
