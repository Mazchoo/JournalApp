"""Helper functions to store and serve a mesh preview image"""

import base64
from pathlib import Path
from typing import Union

from main.utils.file_io import get_resized_filename, make_image_path_relative
from main.utils.image import create_image_icon, get_base64_from_image, write_image_icon


def decode_frame_image(frame_image: str) -> bytes:
    """Decode a data-URL or raw base64 JPEG from the save request."""
    payload = frame_image
    if "," in frame_image:
        payload = frame_image.split(",", 1)[1]
    return base64.b64decode(payload)


def save_mesh_frame_image(mesh_file_path: Path, frame_image: str) -> str:
    """Write the request image next to the mesh and make an icon from it."""
    preview_path = get_resized_filename(mesh_file_path)
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    preview_path.write_bytes(decode_frame_image(frame_image))
    write_image_icon(mesh_file_path)
    return make_image_path_relative(str(preview_path))


def get_mesh_image_base64(file_path: Union[Path, str]) -> str:
    """Return the stored mesh preview as a data URL, creating the icon if needed."""
    file_path = Path(file_path)
    create_image_icon(file_path)
    resize_file_name = get_resized_filename(file_path)
    if not resize_file_name.exists():
        return ""

    return get_base64_from_image(resize_file_name)
