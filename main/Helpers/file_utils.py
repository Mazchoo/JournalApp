from typing import Union
from pathlib import Path
from os import listdir, rmdir, mkdir, getcwd

from main.Helpers.image_constants import ImageConstants


def removeEmptyParentFolders(folder: Path) -> None:
    if not folder.is_dir():
        return

    rmdir(str(folder))

    parent_folder = folder.parent
    if listdir(str(parent_folder)) == []:
        removeEmptyParentFolders(parent_folder)


def pathHasImageTag(path: Path) -> bool:
    for tag in ImageConstants.reserved_image_tags:
        if path.stem.rfind(tag) == len(path.stem) - len(tag):
            return True
    return False


def outsideWorkingDirectory(folder: Path) -> bool:
    return str(folder).find(getcwd()) != 0


def makeParentFolders(target_folder: Path) -> None:
    if target_folder.exists() or outsideWorkingDirectory(target_folder):
        return

    if not target_folder.parent.exists():
        makeParentFolders(target_folder.parent)

    mkdir(str(target_folder))


def getImagePath(file_name: Union[str, Path]) -> str:
    return f"{getcwd()}/Entries/{file_name}"


def getIconPath(file_path: Path) -> Path:
    icon_file_name = f"{file_path.stem}_icon{file_path.suffix}"
    return file_path.parent / icon_file_name


def getIconPathFromRelativePath(realtive_file_path: Path) -> Path:
    target_icon_path = f"{getcwd()}/Entries/{getIconPath(realtive_file_path)}"
    return Path(target_icon_path)


def getStoredImageFolder(entry_name: str) -> str:
    year, month, day = entry_name.split("-")
    return f"{getcwd()}/Entries/{year}/{month}/{day}"


def getStoredImagePath(file_name: str, entry_name: str) -> str:
    target_folder = getStoredImageFolder(entry_name)
    return f"{target_folder}/{file_name}"


def getResizeName(file_path: Path) -> Path:
    return file_path.parent / f"{file_path.stem}_resized{file_path.suffix}"
