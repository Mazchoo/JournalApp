"""Helpers to move files between paths"""

from typing import Optional, Tuple, Union, List
from pathlib import Path
from os import listdir, rmdir, mkdir
from shutil import move

from django.conf import settings

from main.config import ImageConstants
from main.file_types import ImageFileType, MeshFileType, VideoFileType


def resolved_entry_folder() -> Path:
    """Resolved path of the configured ENTRY_FOLDER."""
    return Path(settings.ENTRY_FOLDER).resolve()


def remove_empty_parent_folders(folder: Path):
    """Remove empty folders under the entry folder, stopping at ENTRY_FOLDER."""
    folder = folder.resolve()
    root = resolved_entry_folder()
    if folder == root or root not in folder.parents:
        return

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
    if path.suffix.lower() not in ImageFileType:
        return False
    return any(path.stem.endswith(tag) for tag in ImageConstants.reserved_image_tags)


def is_media_content_file(path: Path) -> bool:
    """True if the file extension is a supported image, mesh, or video type."""
    suffix = path.suffix.lower()
    return suffix in ImageFileType or suffix in MeshFileType or suffix in VideoFileType


def make_parent_folders(target_folder: Path):
    """Keep making parent folders until it exists"""
    if target_folder.exists():
        return

    if not target_folder.parent.exists():
        make_parent_folders(target_folder.parent)

    mkdir(str(target_folder))


def get_base_entry_path(file_name: Union[str, Path]) -> str:
    """Get path of object in entry folder"""
    return f"{settings.ENTRY_FOLDER}/{file_name}"


def extract_date_from_folder(folder: Path) -> Tuple[str, str, str]:
    """Return day, month, year from a dated entry folder."""
    day = folder.stem
    month = folder.parent.stem
    year = folder.parent.parent.stem
    return day, month, year


_ICON_EXTENSIONS = {
    VideoFileType.MP4: ImageFileType.JPG,
    MeshFileType.GLB: ImageFileType.JPG,
    ImageFileType.SVG: ImageFileType.PNG,
}


def get_icon_file_path(image_file_path: Path) -> Path:
    """Get icon file path from image file path"""
    if image_file_path == settings.MISSING_ICON_IMAGE:
        return image_file_path  # Already suitable to be an icon

    extention = _ICON_EXTENSIONS.get(image_file_path.suffix, image_file_path.suffix)
    icon_file_name = f"{image_file_path.stem}_icon{extention}"
    _, month, year = extract_date_from_folder(image_file_path.parent)
    return Path(f"{settings.ENTRY_FOLDER}/icons/{year}/{month}/{icon_file_name}")


def remove_icon_file(media_file_path: Path):
    """Delete the calendar icon for a media file if it exists."""
    icon_path = get_icon_file_path(media_file_path)
    if icon_path.exists() and icon_path != settings.MISSING_ICON_IMAGE:
        icon_path.unlink()


def move_icon(source_media: Path, dest_media: Path) -> None:
    """Move the calendar icon for a media file to match its new dated folder."""
    old_icon = get_icon_file_path(source_media)
    if not old_icon.exists() or old_icon == settings.MISSING_ICON_IMAGE:
        return

    new_icon = get_icon_file_path(dest_media)
    if old_icon.resolve() == new_icon.resolve():
        return

    make_parent_folders(new_icon.parent)
    if new_icon.exists():
        new_icon.unlink()
    move(str(old_icon), str(new_icon))
    remove_empty_parent_folders(old_icon.parent)


def get_stored_media_folder(date_pattern: str) -> Optional[str]:
    """Get folder path from date pattern, or None if it is not year-month-day."""
    if len(parts := date_pattern.split("-")) != 3:
        return None
    year, month, day = parts
    return f"{settings.ENTRY_FOLDER}/{year}/{month}/{day}"


def move_dated_folder(
    source_slug: str,
    destination_slug: str,
    filenames: Optional[List[str]] = None,
) -> List[str]:
    """Move files from one dated entry folder into another.

    If filenames is given, only those names are moved.
    Returns the names that were moved.
    """
    moved: List[str] = []
    source_folder = get_stored_media_folder(source_slug)
    dest_folder = get_stored_media_folder(destination_slug)
    if source_folder is None or dest_folder is None:
        return moved

    source_path = Path(source_folder)
    dest_path = Path(dest_folder)
    if not source_path.is_dir() or source_path.resolve() == dest_path.resolve():
        return moved

    make_parent_folders(dest_path)
    for item in list(source_path.iterdir()):
        if not item.is_file():
            continue
        if filenames is not None and item.name not in filenames:
            continue
        target = dest_path / item.name
        if target.exists():
            target.unlink()
        move_icon(item, target)
        move(str(item), str(target))
        moved.append(item.name)

    remove_empty_parent_folders(source_path)
    return moved


def get_stored_media_path(file_name: str, date_pattern: str) -> Optional[str]:
    """Get path of file in the entry folder, or None if the date pattern is malformed."""
    if (folder := get_stored_media_folder(date_pattern)) is None:
        return None
    return f"{folder}/{file_name}"


def make_media_path_relative(file_name: str) -> str:
    """Remove entry folder from the beginning of file path"""
    if file_name.startswith(settings.ENTRY_FOLDER):
        file_name = file_name[len(settings.ENTRY_FOLDER) :]
    return file_name


def get_resized_filename(file_path: Path) -> Path:
    """Get resized image path from original file path"""
    if file_path.suffix == VideoFileType.MP4:
        extention = ImageFileType.JPEG
    elif file_path.suffix == MeshFileType.GLB:
        extention = ImageFileType.JPEG
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
