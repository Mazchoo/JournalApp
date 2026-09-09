"""Helpers to move files between paths"""

from typing import Optional, Tuple, Union
from pathlib import Path
from os import listdir, rmdir, mkdir
from shutil import move

from main.config import ImageConstants, MeshConstants, VideoConstants

from Journal.settings import ENTRY_FOLDER, MISSING_ICON_IMAGE

RESOLVED_ENTRY_FOLDER = Path(ENTRY_FOLDER).resolve()


def remove_empty_parent_folders(folder: Path):
    """Remove entry folders with no contents"""
    if not folder.is_dir():
        return

    if listdir(str(folder)):
        return

    rmdir(str(folder))

    parent_folder = folder.parent
    if listdir(str(parent_folder)) == []:
        remove_empty_parent_folders(parent_folder)


def path_has_image_reserved_tag(path: Path) -> bool:
    """True if path is an image whose stem ends with a reserved tag."""
    if path.suffix.lower() not in ImageConstants.supported_extensions:
        return False
    return any(path.stem.endswith(tag) for tag in ImageConstants.reserved_image_tags)


def is_media_content_file(path: Path) -> bool:
    """True if the file extension is a supported image, mesh, or video type."""
    suffix = path.suffix.lower()
    return (
        suffix in ImageConstants.supported_extensions
        or suffix in MeshConstants.supported_extensions
        or suffix in VideoConstants.supported_extensions
    )


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


def extract_date_from_folder(folder: Path) -> Tuple[str, str, str]:
    """Return day, month, year from a dated entry folder."""
    day = folder.stem
    month = folder.parent.stem
    year = folder.parent.parent.stem
    return day, month, year


def get_icon_file_path(image_file_path: Path) -> Path:
    """Get icon file path from image file path"""
    if image_file_path == MISSING_ICON_IMAGE:
        return image_file_path  # Already suitable to be an icon

    extention = (
        ".jpg" if image_file_path.suffix in (".mp4", ".glb") else image_file_path.suffix
    )
    icon_file_name = f"{image_file_path.stem}_icon{extention}"
    _, month, year = extract_date_from_folder(image_file_path.parent)
    return Path(f"{ENTRY_FOLDER}/icons/{year}/{month}/{icon_file_name}")


def remove_icon_file(media_file_path: Path):
    """Delete the calendar icon for a media file if it exists."""
    icon_path = get_icon_file_path(media_file_path)
    if icon_path.exists() and icon_path != MISSING_ICON_IMAGE:
        icon_path.unlink()


def get_stored_media_folder(date_pattern: str) -> Optional[str]:
    """Get folder path from date pattern, or None if it is not year-month-day."""
    if len(parts := date_pattern.split("-")) != 3:
        return None
    year, month, day = parts
    return f"{ENTRY_FOLDER}/{year}/{month}/{day}"


def get_stored_media_path(file_name: str, date_pattern: str) -> Optional[str]:
    """Get path of file in the entry folder, or None if the date pattern is malformed."""
    if (folder := get_stored_media_folder(date_pattern)) is None:
        return None
    return f"{folder}/{file_name}"


def make_media_path_relative(file_name: str) -> str:
    """Remove entry folder from the beginning of file path"""
    if file_name.startswith(ENTRY_FOLDER):
        file_name = file_name[len(ENTRY_FOLDER) :]
    return file_name


def get_resized_filename(file_path: Path) -> Path:
    """Get resized image path from original file path"""
    if file_path.suffix == ".mp4":
        extention = f".{VideoConstants.save_image_extention}"
    elif file_path.suffix == ".glb":
        extention = f".{MeshConstants.save_image_extention}"
    else:
        extention = file_path.suffix
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
