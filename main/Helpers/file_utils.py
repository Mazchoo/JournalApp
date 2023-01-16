
from pathlib import Path
from os import listdir, rmdir

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