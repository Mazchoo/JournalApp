"""Helpers to move files between paths"""

from typing import Union
from pathlib import Path
from os import listdir, rmdir, mkdir
from shutil import move

from main.config import ImageConstants, VideoConstants

from Journal.settings import ENTRY_FOLDER, MISSING_ICON_IMAGE


def remove_empty_parent_folders(folder: Path):
    """Remove entry folders with no contents"""
    if not folder.is_dir():
        return

    rmdir(str(folder))

    parent_folder = folder.parent
    if listdir(str(parent_folder)) == []:
        remove_empty_parent_folders(parent_folder)


def path_has_image_extension(path: Path) -> bool:
    """Image path is a recognised image extention"""
    for tag in ImageConstants.reserved_image_tags:
        ending_position = path.stem.rfind(tag)
        if ending_position >= 0 and ending_position == len(path.stem) - len(tag):
            return True
    return False


def make_parent_folders(target_folder: Path):
    """Keep making parent folders until it exists"""
    if target_folder.exists():
        return

    if not target_folder.parent.exists():
        make_parent_folders(target_folder.parent)

    mkdir(str(target_folder))


def get_base_entry_path(file_name: Union[str, Path]) -> str:
    """Get path of object in entry folder"""
    return f"{ENTRY_FOLDER}/{file_name}"


# ToDo - generate icon path on file creation
def get_icon_file_path(image_file_path: Path) -> Path:
    """Get icon file path from image file path"""
    if image_file_path == MISSING_ICON_IMAGE:
        return image_file_path  # Already suitable to be an icon

    extention = ".jpg" if image_file_path.suffix == ".mp4" else image_file_path.suffix
    icon_file_name = f"{image_file_path.stem}_icon{extention}"
    month = image_file_path.parent.parent.stem
    year = image_file_path.parent.parent.parent.stem
    return Path(f"{ENTRY_FOLDER}/icons/{year}/{month}/{icon_file_name}")


def get_stored_media_folder(date_pattern: str) -> str:
    """Get folder path from date pattern"""
    year, month, day = date_pattern.split("-")
    return f"{ENTRY_FOLDER}/{year}/{month}/{day}"


def get_stored_media_path(file_name: str, date_pattern: str) -> str:
    """Get path of file entry folder"""
    return f"{get_stored_media_folder(date_pattern)}/{file_name}"


def make_image_path_relative(file_name: str) -> str:
    """Remove entry folder from the beginning of file path"""
    if file_name.startswith(ENTRY_FOLDER):
        file_name = file_name[len(ENTRY_FOLDER) :]
    return file_name


def get_resized_filename(file_path: Path) -> Path:
    """Get resized image path from original file path"""
    extention = (
        f".{VideoConstants.save_image_extention}"
        if file_path.suffix == ".mp4"
        else file_path.suffix
    )
    return file_path.parent / f"{file_path.stem}_resized{extention}"


def move_media_to_save_path(target_file_path: str, file_name: str):
    """Move media for entry folder to its sorted date folder"""
    path = Path(target_file_path)
    if path.exists():
        return target_file_path

    source_file_path = get_base_entry_path(file_name)
    output_path = source_file_path

    target_folder = path.parent
    if Path(source_file_path).exists():
        make_parent_folders(target_folder)
        move(source_file_path, target_file_path)
        output_path = target_file_path

    return output_path
