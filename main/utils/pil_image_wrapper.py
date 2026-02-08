"""Wrapper around PIL functions"""

from pathlib import Path
from typing import Optional

from PIL import Image, ExifTags
from PIL.Image import Exif

from main.config.image_constants import ImageConstants


def get_orientation_flag() -> Optional[int]:
    """If orientation key is specified in exif tags return it"""
    for key, value in ExifTags.TAGS.items():
        if value == "Orientation":
            return key
    return None


def orientate_pil_image(image: Image.Image, exif: Exif):
    """Rotate image to exif orientation if it was specified"""
    if exif is None:
        return image
    orientation_key = get_orientation_flag()

    if orientation_key is not None and orientation_key in exif:
        if exif[orientation_key] == 3:
            image = image.rotate(180, expand=True)
        elif exif[orientation_key] == 6:
            image = image.rotate(270, expand=True)
        elif exif[orientation_key] == 8:
            image = image.rotate(90, expand=True)

    return image


def crop_image_to_square(image: Image.Image):
    """Crop image to square size"""
    width, height = image.size
    crop_amount = (max(width, height) - min(width, height)) // 2

    if width > height:
        image_resized = image.crop((crop_amount, 0, width - crop_amount, height))
    else:
        image_resized = image.crop((0, crop_amount, width, height - crop_amount))

    return image_resized


def get_resizing_factor_to_downsized(file_path: Path) -> float:
    """Get factor to resize image to downsized version"""
    image = Image.open(file_path)
    width, height = image.size
    max_dimension = max(width, height)

    factor = 1
    while max_dimension >= ImageConstants.default_display_longest_side:
        factor *= 2
        max_dimension //= 2

    return factor


def get_square_resized_image(image: Image.Image, target_size: int) -> Image.Image:
    """Get image cropped to square at target size"""
    image = crop_image_to_square(image)
    image = image.resize((target_size, target_size), resample=Image.Resampling.BILINEAR)
    return orientate_pil_image(image, image.getexif())
