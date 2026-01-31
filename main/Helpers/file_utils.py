from typing import Union
from pathlib import Path
from os import listdir, rmdir, mkdir
from shutil import move

from main.Helpers.image_constants import ImageConstants
from main.Helpers.video_constants import VideoConstants

from Journal.settings import ENTRY_FOLDER


def removeEmptyParentFolders(folder: Path) -> None:
    if not folder.is_dir():
        return

    rmdir(str(folder))

    parent_folder = folder.parent
    if listdir(str(parent_folder)) == []:
        removeEmptyParentFolders(parent_folder)


def pathHasImageTag(path: Path) -> bool:
    for tag in ImageConstants.reserved_image_tags:
        ending_position = path.stem.rfind(tag)
        if ending_position >= 0 and ending_position == len(path.stem) - len(tag):
            return True
    return False


def makeParentFolders(target_folder: Path) -> None:
    if target_folder.exists():
        return

    if not target_folder.parent.exists():
        makeParentFolders(target_folder.parent)

    mkdir(str(target_folder))


def getMediaPath(file_name: Union[str, Path]) -> str:
    return f"{ENTRY_FOLDER}/{file_name}"


def getIconPath(file_path: Path) -> Path:
    extention = ".jpg" if file_path.suffix == ".mp4" else file_path.suffix
    icon_file_name = f"{file_path.stem}_icon{extention}"
    return file_path.parent / icon_file_name


def getIconPathFromRelativePath(realtive_file_path: Path) -> Path:
    target_icon_path = f"{ENTRY_FOLDER}/{getIconPath(realtive_file_path)}"
    return Path(target_icon_path)


def getStoredMediaFolder(entry_name: str) -> str:
    year, month, day = entry_name.split("-")
    return f"{ENTRY_FOLDER}/{year}/{month}/{day}"


def getStoredMediaPath(file_name: str, entry_name: str) -> str:
    target_folder = getStoredMediaFolder(entry_name)
    return f"{target_folder}/{file_name}"


def makeImagePathRelative(file_name: str) -> str:
    if file_name.startswith(ENTRY_FOLDER):
        file_name = file_name[len(ENTRY_FOLDER) :]
    return file_name


def getResizeName(file_path: Path) -> Path:
    extention = (
        f".{VideoConstants.save_image_extention}"
        if file_path.suffix == ".mp4"
        else file_path.suffix
    )
    return file_path.parent / f"{file_path.stem}_resized{extention}"


def moveMediaToSavePath(target_file_path: str, file_name: str):
    target_path_obj = Path(target_file_path)
    if target_path_obj.exists():
        return target_file_path

    source_file_path = getMediaPath(file_name)
    output_path = source_file_path

    target_folder = target_path_obj.parent
    if Path(source_file_path).exists():
        makeParentFolders(target_folder)
        move(source_file_path, target_file_path)
        output_path = target_file_path

    return output_path
