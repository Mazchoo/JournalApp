
from typing import Union, Tuple, Optional
from pathlib import Path
from functools import lru_cache

import cv2
import numpy as np
from PIL import Image

from main.Helpers.video_constants import VideoConstants
from main.Helpers.file_utils import getIconPath, getResizeName
from main.Helpers.image_utils import loadImageDirectly, getSquareResizedImage, addEncodingTypeToBase64

# ToDo make a context manager for capture


def getTotalFrames(capture: cv2.VideoCapture) -> int:
    if not capture.isOpened():
        return 0
    
    return int(capture.get(cv2.CAP_PROP_FRAME_COUNT))


def getWidthHeight(capture: cv2.VideoCapture) -> Tuple[int, int]:
    if not capture.isOpened():
        return (0, 0)
    
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    return (width, height)


def getFrameAtIndex(capture: cv2.VideoCapture, frame_index: int) -> Optional[np.ndarray]:
    capture.set(cv2.CAP_PROP_POS_FRAMES, frame_index)

    ret, frame = capture.read()
    if not ret:
        return None

    return frame


def createVideoIcon(video_path: Path) -> bool:
    if not video_path.exists():
        return False

    target_icon_path = getIconPath(video_path)
    if target_icon_path.exists():
        return False

    capture = cv2.VideoCapture(video_path)

    nr_frames = getTotalFrames(capture)
    if nr_frames == 0:
        return False

    frame = getFrameAtIndex(capture, nr_frames // 2)
    if frame is None:
        return False

    image = Image.fromarray(frame)
    icon_size = VideoConstants.icon_size

    image_resized = getSquareResizedImage(image, icon_size)
    image_resized.save(target_icon_path)

    return True


def getResizingFactorToCollageSize(capture: cv2.VideoCapture) -> float:
    width, height = getWidthHeight(capture)
    max_dimension = max(width, height)

    factor = 1
    while max_dimension >= VideoConstants.collage_image_longest_side:
        factor *= 2
        max_dimension //= 2

    return factor


def attemptToStreamVideoFile(video_path: Path) -> Optional[cv2.VideoCapture]:
    if not video_path.exists():
        return None
    if not video_path.suffix.lower() in VideoConstants.supported_extensions:
        return None

    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        capture.release()
        return None

    return capture


def createCollageImage(capture: cv2.VideoCapture, rescale_factor: int, resized_path: Path) -> Image:
    nr_frames = getTotalFrames(capture)

    width, height = getWidthHeight(capture)
    width //= rescale_factor
    height //= rescale_factor

    rows = VideoConstants.collage_nr_rows
    cols = VideoConstants.collage_nr_cols
    if width > height:
        rows, cols = cols, rows

    collage_width = cols * width
    collage_width += (cols - 1) * VideoConstants.collage_spacing
    collage_height = rows * height
    collage_height += (rows - 1) * VideoConstants.collage_spacing
    collage_image = np.zeros((collage_height, collage_width, 3), dtype=np.uint8)
    frame_increment = nr_frames // (rows * cols)

    for i in range(VideoConstants.collage_nr_rows):
        for j in range(VideoConstants.collage_nr_cols):
            start_y = i * (height + VideoConstants.collage_spacing)
            start_x = j * (width + VideoConstants.collage_spacing)
            end_y = start_y + height
            end_x = start_x + width

            frame_index = frame_increment // 2
            frame_index += i * VideoConstants.collage_nr_rows * frame_increment
            frame_index += j * frame_increment

            frame = getFrameAtIndex(capture, frame_index)
            frame = cv2.resize(frame, dsize=(width, height))
            collage_image[start_y: end_y, start_x: end_x, :] = frame

    image_resized = Image.fromarray(collage_image)
    image_resized.save(resized_path, format=VideoConstants.save_image_extention)
    return loadImageDirectly(resized_path)


@lru_cache(maxsize=1024)
def getCollageBase64Data(file_path: Union[Path, str]) -> str:
    ''' Will create collage once and not update it when the video parameters change '''
    file_path = Path(file_path)
    createVideoIcon(file_path)
    resize_file_name = getResizeName(file_path)
    capture = cv2.VideoCapture()

    if resize_file_name.exists():
        b64_string = loadImageDirectly(file_path)

    elif capture := attemptToStreamVideoFile(file_path):

        factor = getResizingFactorToCollageSize(capture)
        if collage_b64 := createCollageImage(capture, factor, resize_file_name):
            b64_string = addEncodingTypeToBase64(collage_b64, VideoConstants.save_image_extention)
        else:
            b64_string = ""

    else:
        print(f'Error! Video {file_path} is invalid!')
        b64_string = ""

    capture.release()
    return b64_string


if __name__ == '__main__':
    cap = cv2.VideoCapture(Path('./Entries/2024/06/08/20240608_142838.mp4'))
    assert cap.isOpened()
    createCollageImage(cap, 2, Path('./Entries/2024/06/08/20240608_142838_resized.jpeg'))
    cap.release()
    createVideoIcon(Path('./Entries/2024/06/08/20240608_142838.mp4'))

