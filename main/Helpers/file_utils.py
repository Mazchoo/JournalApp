
from pathlib import Path
from os import listdir, rmdir, mkdir, getcwd

from main.Helpers.image_constants import ImageConstants


def removeEmptyParentFolders(folder: Path):
    if not folder.is_dir():
        return

    rmdir(str(folder))

    parent_folder = folder.parent
    if listdir(str(parent_folder)) == []:
        removeEmptyParentFolders(parent_folder)


def pathHasImageTag(path: Path):
    for tag in ImageConstants.reserved_image_tags:
        if path.stem.rfind(tag) == len(path.stem) - len(tag):
            return True
    return False


def outsideWorkingDirectory(folder: Path) -> bool:
    return str(folder).find(getcwd()) != 0


def makeParentFolders(target_folder: Path):
    if target_folder.exists() or outsideWorkingDirectory(target_folder):
        return

    if not target_folder.parent.exists():
        makeParentFolders(target_folder.parent)

    mkdir(str(target_folder))


def getImageBaseFolderPath(file_name: str):
    return f"{getcwd()}\\Images\\{file_name}"


def getIconFilePath(file_path: Path):
    icon_file_name = f"{file_path.stem}_icon{file_path.suffix}"
    target_icon_path = file_path.parent / icon_file_name
    return target_icon_path


def getStoredImageFolder(entry_name: str) -> str:
    year, month, day = entry_name.split("-")
    return f"{getcwd()}\\Images\\{year}\\{month}\\{day}"


def getStoredImagePath(file_name: str, entry_name: str) -> str:
    target_folder = getStoredImageFolder(entry_name)
    return f"{target_folder}\\{file_name}"


def getResizeName(file_path: Path):
    return file_path.parent / f"{file_path.stem}_resized{file_path.suffix}"
