"""Helper functions to get downsized images"""

import base64
from pathlib import Path
from typing import Union

from PIL import Image

from main.config import ImageConstants
from main.file_types import ImageFileType, MeshFileType, VideoFileType
from main.utils.svg import is_svg_path, write_svg_icon
from main.utils.pil_image_wrapper import (
    get_square_resized_image,
    get_resizing_factor_to_downsized,
    orientate_pil_image,
)
from main.utils.file_io import (
    get_icon_file_path,
    get_resized_filename,
    move_media_to_save_path,
    path_has_image_reserved_tag,
)
from main.utils.cache import cache_string


def _icon_source_paths(target_path_obj: Path) -> tuple[Path, Path] | None:
    """Return (path used for the icon name, image to read), or None if missing.

    The icon is always named from the original media file. Derivative ``_resized``
    / ``_icon`` images are not a naming source.
    """
    if path_has_image_reserved_tag(target_path_obj):
        return None

    icon_name_path = target_path_obj
    if target_path_obj.suffix == VideoFileType.MP4:
        target_path_obj = (
            target_path_obj.parent / f"{target_path_obj.stem}{ImageFileType.JPG}"
        )
    elif target_path_obj.suffix == MeshFileType.GLB:
        target_path_obj = get_resized_filename(target_path_obj)

    if not target_path_obj.exists():
        return None
    return icon_name_path, target_path_obj


def write_image_icon(target_path_obj: Path) -> bool:
    """Write the calendar icon from the current preview image, replacing any existing one."""
    source_paths = _icon_source_paths(target_path_obj)
    if source_paths is None:
        return False

    icon_name_path, image_path = source_paths
    target_icon_file_path = get_icon_file_path(icon_name_path)
    if is_svg_path(image_path):
        return write_svg_icon(image_path, target_icon_file_path)

    image = Image.open(image_path)  # type: Image.Image
    image_resized = get_square_resized_image(image, ImageConstants.icon_size)
    target_icon_file_path.parent.mkdir(parents=True, exist_ok=True)
    image_resized.save(target_icon_file_path)
    return True


def lazy_create_image_icon(target_path_obj: Path):
    """Create image icon for target object if one does not already exist."""
    source_paths = _icon_source_paths(target_path_obj)
    if source_paths is None:
        return False
    if get_icon_file_path(source_paths[0]).exists():
        return True
    return write_image_icon(target_path_obj)


def move_image_to_save_path(target_file_path: str, file_name: str):
    """Move image to the date save path"""
    lazy_create_image_icon(Path(target_file_path))
    return move_media_to_save_path(target_file_path, file_name)


def get_encoding_type(file_path: Union[Path, str]) -> str:
    """Get compression type form file path"""
    try:
        return ImageFileType(Path(file_path).suffix.lower()).encoding
    except ValueError:
        return ImageConstants.unknown_enoding_type


def get_resized_base64(file_path: Path, factor: float, ecoding_type: str) -> str:
    """Get a downsized image in base64 form"""
    if not get_icon_file_path(file_path).exists():
        lazy_create_image_icon(file_path)

    resized_path = get_resized_filename(file_path)
    if resized_path.exists():
        return load_image_directly(resized_path)

    image = Image.open(file_path)  # type: Image.Image

    width, height = image.size

    image_resized = image.resize(
        (int(width / factor), int(height / factor)), resample=Image.Resampling.BILINEAR
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


@cache_string
def lazy_create_base64_image_data(file_path: Union[Path, str]) -> str:
    """Load image or create base64 image from downsized original (if original size above threshold)"""
    file_path = Path(file_path)

    if (
        file_path.exists()
        and file_path.suffix.lower() in ImageFileType
    ):
        factor = (
            1 if is_svg_path(file_path) else get_resizing_factor_to_downsized(file_path)
        )
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
