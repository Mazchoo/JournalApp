"""Helper functions to extract information and get a summary image of a video"""

from typing import Union
from pathlib import Path
from functools import lru_cache
from collections import namedtuple

import numpy as np
from PIL import Image, ImageFilter

from main.Helpers.video_constants import VideoConstants
from main.Helpers.file_utils import get_icon_file_path, get_resized_filename
from main.Helpers.image_utils import (
    load_image_directly,
    get_square_resized_image,
    add_encoding_type_to_base64,
)
from main.Helpers.video_capture import VideoCapture

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


def create_video_icon(video_path: Path) -> bool:
    """Create a small image representing video - return False if creation of icon fails"""
    if not video_path.exists():
        return False

    target_icon_file_path = get_icon_file_path(video_path)
    if target_icon_file_path.exists():
        return True

    with VideoCapture(video_path) as capture:
        nr_frames = capture.get_total_frames()
        if nr_frames == 0:
            return False

        frame = capture.get_frame_at_idx(nr_frames // 2)
        if frame is None:
            return False

        image = Image.fromarray(frame)

    image_resized = get_square_resized_image(image, VideoConstants.icon_size)
    image_resized.save(target_icon_file_path)

    return True


def get_resizing_factor_to_collage_size(capture: VideoCapture) -> float:
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
) -> Image:
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


@lru_cache(maxsize=1024)
def get_collage_base64(file_path: Union[Path, str]) -> str:
    """Will create collage once and not update it when the video parameters change"""
    file_path = Path(file_path)
    create_video_icon(file_path)
    resize_file_name = get_resized_filename(file_path)

    if resize_file_name.exists():
        b64_string = load_image_directly(resize_file_name)
        return add_encoding_type_to_base64(
            b64_string, VideoConstants.save_image_extention
        )

    with VideoCapture(file_path) as capture:
        if capture:
            factor = get_resizing_factor_to_collage_size(capture)
            if collage_b64 := create_collage_image(capture, factor, resize_file_name):
                b64_string = add_encoding_type_to_base64(
                    collage_b64, VideoConstants.save_image_extention
                )
            else:
                print(f"Error! Video {file_path} could not create collage!")
                b64_string = ""

        else:
            print(f"Error! Video {file_path} cannot stream!")
            b64_string = ""

    return b64_string


if __name__ == "__main__":
    from Journal.settings import ENTRY_FOLDER

    with VideoCapture(Path(f"{ENTRY_FOLDER}/20260129_222725.mp4")) as cap:
        create_collage_image(
            cap, 2, Path(f"{ENTRY_FOLDER}/20260129_222725.jpg")
        )
    create_video_icon(Path(f"{ENTRY_FOLDER}/20260129_222725.mp4"))
