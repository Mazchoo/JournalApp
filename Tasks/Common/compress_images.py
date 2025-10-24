"""Essnentially remove all non-icon images in a folder by replacing with a size 1 png"""

from pathlib import Path
import os

import numpy as np
from PIL import Image

from main.Helpers.image_constants import ImageConstants
# ToDo - investigate if symbolic linking can do this instead


def is_icon_path(path: Path) -> bool:
    """Return true is path is an icon file"""
    if not path.stem.lower().endswith("_icon"):
        return False

    original_file_name = path.stem[:-5] + path.suffix
    original_path = path.parent / original_file_name
    if original_path.is_file():
        return True
    return False


def is_image_path(path: Path) -> bool:
    """Return true if refers to recognised image"""
    return path.suffix.lower() in ImageConstants.supported_extensions


def remove_all_non_icons_in_folder(folder: str):
    """Remove image files in folder is not icon files"""
    image = np.zeros((1, 1, 3), dtype=np.uint8)
    save_image = Image.fromarray(image)

    for dirpath, _, filenames in os.walk(folder):
        for file in filenames:
            path_str = os.path.join(dirpath, file)
            path = Path(path_str)

            if is_image_path(path) and not is_icon_path(path):
                save_image.save(path_str)
                print(path_str)


if __name__ == "__main__":
    remove_all_non_icons_in_folder("./Entries/2018")
