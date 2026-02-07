"""Helper functions to get downsized images"""

import base64
from pathlib import Path
from typing import Union
from functools import lru_cache

from PIL import Image

from main.config.image_constants import ImageConstants
from main.utils.pil_image_wrapper import (
    get_square_resized_image,
    get_resizing_factor_to_downsized,
    orientate_pil_image,
)
from main.utils.file_io import (
    get_icon_file_path,
    move_media_to_save_path,
    get_resized_filename,
)


def create_image_icon(target_path_obj: Path):
    """Create image icon for target object"""
    if target_path_obj.suffix == ".mp4":
        target_path_obj = target_path_obj.parent / f"{target_path_obj.stem}.jpg"

    if not target_path_obj.exists():
        return False

    target_icon_file_path = get_icon_file_path(target_path_obj)
    if target_icon_file_path.exists():
        return False

    image = Image.open(target_path_obj)
    icon_size = ImageConstants.icon_size

    image_resized = get_square_resized_image(image, icon_size)
    target_icon_file_path.parent.mkdir(parents=True, exist_ok=True)
    image_resized.save(target_icon_file_path)

    return True


def move_image_to_save_path(target_file_path: str, file_name: str):
    """Move image to the date save path"""
    create_image_icon(Path(target_file_path))
    return move_media_to_save_path(target_file_path, file_name)


def get_encoding_type(file_path: Union[Path, str]) -> str:
    """Get compression type form file path"""
    path = Path(file_path)
    if path.suffix.lower() in [".jpg", ".jpeg", ".jfif"]:
        ecoding_type = "jpeg"
    elif path.suffix.lower() == ".png":
        ecoding_type = "png"
    else:
        ecoding_type = ImageConstants.unknown_enoding_type

    return ecoding_type


def get_resized_base64(file_path: Path, factor: float, ecoding_type: str) -> str:
    """Get a downsized image in base64 form"""
    if not get_icon_file_path(file_path).exists():
        create_image_icon(file_path)

    resized_path = get_resized_filename(file_path)
    if resized_path.exists():
        return load_image_directly(resized_path)

    image = Image.open(file_path)

    width, height = image.size

    image_resized = image.resize(
        (width // factor, height // factor), resample=Image.Resampling.BILINEAR
    )  # type: ignore
    image_resized = orientate_pil_image(image_resized, image.getexif())

    image_resized.save(resized_path, format=ecoding_type)

    return load_image_directly(resized_path)


def load_image_directly(file_path: Union[Path, str]) -> str:
    """Load an image as base64"""
    with open(file_path, "rb") as img_file:
        b64_string = base64.b64encode(img_file.read()).decode("utf-8")

    return b64_string


def add_encoding_type_to_base64(b64_string: str, ecoding_type: str) -> str:
    """Append decoding information to base64 string"""
    if ecoding_type == ImageConstants.unknown_enoding_type:
        return ""
    return f"data:image/{ecoding_type};base64,{b64_string}"


@lru_cache(maxsize=1024)
def fetch_base64_image_data(file_path: Union[Path, str]) -> str:
    """Load image or create base64 image from downsized original (if original size above threshold)"""
    file_path = Path(file_path)

    if (
        file_path.exists()
        and file_path.suffix.lower() in ImageConstants.supported_extensions
    ):
        factor = get_resizing_factor_to_downsized(file_path)
        ecoding_type = get_encoding_type(file_path)
        if factor > 1:
            b64_string = get_resized_base64(file_path, factor, ecoding_type)
        else:
            b64_string = load_image_directly(file_path)

        b64_string = add_encoding_type_to_base64(b64_string, ecoding_type)
    else:
        print(f"Error! Image {file_path} is invalid!")
        b64_string = ""

    return b64_string


def get_base64_from_image(file_path: Union[Path, str]) -> str:
    """Load image path and return it as base64"""
    b64_string = load_image_directly(file_path)
    ecoding_type = get_encoding_type(file_path)
    return add_encoding_type_to_base64(b64_string, ecoding_type)
