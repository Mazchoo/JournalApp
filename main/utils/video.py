"""Helper functions to extract information and get a summary image of a video"""

from typing import Union
from pathlib import Path
from functools import lru_cache
from collections import namedtuple

import numpy as np
from PIL import Image, ImageFilter

from main.config import VideoConstants
from main.utils.file_io import get_icon_file_path, get_resized_filename
from main.utils.image import (
    load_image_directly,
    get_square_resized_image,
    add_encoding_type_to_base64,
)
from main.utils.video_capture import VideoCapture

CollageDrawDimensions = namedtuple(
    "CollageDrawDimensions",
    [
        "width",
        "height",
        "collage_width",
        "collage_height",
        "frame_increment",
        "rows",
        "cols",
    ],
)


def lazy_create_video_icon(video_path: Path) -> bool:
    """
    Create a small image representing video (if it does not already exist).
    return False if creation of icon fails or video path is not valid
    """
    if not video_path.exists():
        return False

    target_icon_file_path = get_icon_file_path(video_path)
    if target_icon_file_path.exists():
        return True

    with VideoCapture(video_path) as capture:
        nr_frames = capture.get_total_frames()
        if nr_frames == 0:
            print(f"Error! Video {video_path} has no frames to create icon.")
            return False

        frame_ind = capture.get_frame_at_idx(nr_frames // 2)
        if frame_ind is None:
            print(f"Error! Can get frame index {frame_ind} from {video_path}.")
            return False

        image = Image.fromarray(frame_ind)

    image_resized = get_square_resized_image(image, VideoConstants.icon_size)
    image_resized.save(target_icon_file_path)

    return True


def get_resizing_factor_to_collage_size(capture: VideoCapture) -> int:
    """Get downsizing factor resize frame to collage size of frame"""
    width, height = capture.get_width_height()
    max_dimension = max(width, height)

    factor = 1
    while max_dimension >= VideoConstants.collage_image_longest_side:
        factor *= 2
        max_dimension //= 2

    return factor


def get_collage_display_dimensions(capture: VideoCapture, rescale_factor: int):
    """Get dimensions of full collage image"""
    width, height = capture.get_width_height()
    width //= rescale_factor
    height //= rescale_factor

    rows = VideoConstants.collage_nr_rows
    cols = VideoConstants.collage_nr_cols
    if height > width:
        cols += VideoConstants.nr_extra_cols

    collage_width = cols * width
    collage_width += (cols - 1) * VideoConstants.collage_spacing
    collage_height = rows * height
    collage_height += (rows - 1) * VideoConstants.collage_spacing

    nr_frames = capture.get_total_frames()
    frame_increment = nr_frames // (rows * cols)
    return CollageDrawDimensions(
        width, height, collage_width, collage_height, frame_increment, rows, cols
    )


def draw_frame_to_collage(
    capture: VideoCapture,
    collage_dims: CollageDrawDimensions,
    i: int,
    j: int,
    collage_image: np.ndarray,
):
    """Take frame image, resize it and insert it into collage position"""
    start_y = i * (collage_dims.height + VideoConstants.collage_spacing)
    start_x = j * (collage_dims.width + VideoConstants.collage_spacing)
    end_y = start_y + collage_dims.height
    end_x = start_x + collage_dims.width

    frame_index = collage_dims.frame_increment // 2
    frame_index += i * collage_dims.rows * collage_dims.frame_increment
    frame_index += j * collage_dims.frame_increment

    frame = capture.get_frame_at_idx(frame_index)
    if frame is None:
        return

    # Convert to PIL for resizing
    pil_frame = Image.fromarray(frame)
    pil_frame = pil_frame.resize(
        (collage_dims.width, collage_dims.height),
        resample=Image.Resampling.BILINEAR,
    )

    # Apply smoothing filter if bilateral filter flag is enabled
    if VideoConstants.billateral_filter:
        pil_frame = pil_frame.filter(ImageFilter.SMOOTH)

    # Convert back to numpy array (already RGB - no conversion needed)
    frame = np.array(pil_frame)

    collage_image[start_y:end_y, start_x:end_x, :] = frame


def create_collage_image(
    capture: VideoCapture, rescale_factor: int, target_path: Path
) -> str:
    """Create collage image from video"""
    collage_dims = get_collage_display_dimensions(capture, rescale_factor)
    collage_image = np.zeros(
        (collage_dims.collage_height, collage_dims.collage_width, 3), dtype=np.uint8
    )

    for i in range(collage_dims.rows):
        for j in range(collage_dims.cols):
            draw_frame_to_collage(capture, collage_dims, i, j, collage_image)

    image_resized = Image.fromarray(collage_image)
    resized_path = target_path.parent / target_path.name
    image_resized.save(resized_path, format=VideoConstants.save_image_extention)
    return load_image_directly(resized_path)


def lazy_create_resized_collage(file_path: Path) -> str:
    """
    Write the collage preview next to the video if it does not already exist.
    return the base64 encoded image if successful, otherwise return an empty string.
    """
    resize_file_name = get_resized_filename(file_path)
    if resize_file_name.exists():
        return load_image_directly(resize_file_name)

    with VideoCapture(file_path) as capture:
        if capture:
            factor = get_resizing_factor_to_collage_size(capture)
            if collage_b64 := create_collage_image(capture, factor, resize_file_name):
                return collage_b64
            print(f"Error! Video {file_path} could not create collage!")
            return ""

        print(f"Error! Video {file_path} cannot stream!")
        return ""


@lru_cache(maxsize=1024)
def get_collage_base64(file_path: Union[Path, str]) -> str:
    """Will create collage once and not update it when the video parameters change"""
    file_path = Path(file_path)
    lazy_create_video_icon(file_path)

    if not (collage_b64 := lazy_create_resized_collage(file_path)):
        return collage_b64

    return add_encoding_type_to_base64(collage_b64, VideoConstants.save_image_extention)


if __name__ == "__main__":
    from Journal.settings import ENTRY_FOLDER

    with VideoCapture(Path(f"{ENTRY_FOLDER}/20260129_222725.mp4")) as cap:
        create_collage_image(cap, 2, Path(f"{ENTRY_FOLDER}/20260129_222725.jpg"))
    lazy_create_video_icon(Path(f"{ENTRY_FOLDER}/20260129_222725.mp4"))
