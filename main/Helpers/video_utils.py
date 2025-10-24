from typing import Union, Tuple, Optional
from pathlib import Path
from functools import lru_cache
from collections import namedtuple

import cv2
import numpy as np
from PIL import Image

from main.Helpers.video_constants import VideoConstants
from main.Helpers.file_utils import getIconPath, getResizeName
from main.Helpers.image_utils import (
    loadImageDirectly,
    getSquareResizedImage,
    addEncodingTypeToBase64,
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


def createVideoIcon(video_path: Path) -> bool:
    if not video_path.exists():
        return False

    target_icon_path = getIconPath(video_path)
    if target_icon_path.exists():
        return False

    with VideoCapture(video_path) as capture:
        nr_frames = capture.getTotalFrames()
        if nr_frames == 0:
            return False

        frame = capture.getFrameAtIndex(nr_frames // 2)
        if frame is None:
            return False

        image = Image.fromarray(frame)

    image_resized = getSquareResizedImage(image, VideoConstants.icon_size)
    image_resized.save(target_icon_path)

    return True


def getResizingFactorToCollageSize(capture: VideoCapture) -> float:
    width, height = capture.getWidthHeight()
    max_dimension = max(width, height)

    factor = 1
    while max_dimension >= VideoConstants.collage_image_longest_side:
        factor *= 2
        max_dimension //= 2

    return factor


def getCollageDisplayDimensions(capture: VideoCapture, rescale_factor: int):
    width, height = capture.getWidthHeight()
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

    nr_frames = capture.getTotalFrames()
    frame_increment = nr_frames // (rows * cols)
    return CollageDrawDimensions(
        width, height, collage_width, collage_height, frame_increment, rows, cols
    )


def drawFrameToCollage(
    capture: VideoCapture,
    collage_dims: CollageDrawDimensions,
    i: int,
    j: int,
    collage_image: np.ndarray,
):
    start_y = i * (collage_dims.height + VideoConstants.collage_spacing)
    start_x = j * (collage_dims.width + VideoConstants.collage_spacing)
    end_y = start_y + collage_dims.height
    end_x = start_x + collage_dims.width

    frame_index = collage_dims.frame_increment // 2
    frame_index += i * collage_dims.rows * collage_dims.frame_increment
    frame_index += j * collage_dims.frame_increment

    frame = capture.getFrameAtIndex(frame_index)
    frame = cv2.resize(frame, dsize=(collage_dims.width, collage_dims.height))
    if VideoConstants.billateral_filter:
        frame = cv2.bilateralFilter(frame, 15, 75, 75)
    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    collage_image[start_y:end_y, start_x:end_x, :] = frame


def createCollageImage(
    capture: VideoCapture, rescale_factor: int, resized_path: Path
) -> Image:
    collage_dims = getCollageDisplayDimensions(capture, rescale_factor)
    collage_image = np.zeros(
        (collage_dims.collage_height, collage_dims.collage_width, 3), dtype=np.uint8
    )

    for i in range(collage_dims.rows):
        for j in range(collage_dims.cols):
            drawFrameToCollage(capture, collage_dims, i, j, collage_image)

    image_resized = Image.fromarray(collage_image)
    image_resized.save(resized_path, format=VideoConstants.save_image_extention)
    return loadImageDirectly(resized_path)


@lru_cache(maxsize=1024)
def getCollageBase64Data(file_path: Union[Path, str]) -> str:
    """Will create collage once and not update it when the video parameters change"""
    file_path = Path(file_path)
    createVideoIcon(file_path)
    resize_file_name = getResizeName(file_path)

    if resize_file_name.exists():
        b64_string = loadImageDirectly(resize_file_name)
        return addEncodingTypeToBase64(b64_string, VideoConstants.save_image_extention)

    with VideoCapture(file_path) as capture:
        if capture:
            factor = getResizingFactorToCollageSize(capture)
            if collage_b64 := createCollageImage(capture, factor, resize_file_name):
                b64_string = addEncodingTypeToBase64(
                    collage_b64, VideoConstants.save_image_extention
                )
            else:
                print(f"Error! Video {file_path} could not creat collage!")
                b64_string = ""

        else:
            print(f"Error! Video {file_path} cannot stream!")
            b64_string = ""

    return b64_string


if __name__ == "__main__":
    with VideoCapture(Path("./Entries/2024/06/08/20240608_142838.mp4")) as cap:
        createCollageImage(
            cap, 2, Path("./Entries/2024/06/08/20240608_142838_resized.jpeg")
        )
    createVideoIcon(Path("./Entries/2024/06/08/20240608_142838.mp4"))
