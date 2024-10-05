
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


def createCollageImage(capture: cv2.VideoCapture, rescale_factor: float) -> Image:
    pass


@lru_cache(maxsize=1024)
def getCollageBase64Data(file_path: Union[Path, str]) -> str:
    ''' Will create collage once and not update it when the video parameters change '''
    file_path = Path(file_path)
    createVideoIcon(file_path)
    resize_file_name = getResizeName(file_path)
    capture = cv2.VideoCapture()

    if resize_file_name.exists():
        b64_string = loadImageDirectly(file_path)

    elif file_path.exists() and file_path.suffix.lower() in VideoConstants.supported_extensions \
        and (capture := cv2.VideoCapture(file_path)).isOpened():

        factor = getResizingFactorToCollageSize(capture)
        b64_string = createCollageImage(capture, factor)
        b64_string = addEncodingTypeToBase64(b64_string, VideoConstants.save_image_extention)

    else:
        print(f'Error! Video {file_path} is invalid!')
        b64_string = ""

    capture.release()
    return b64_string


if __name__ == '__main__':
    cap = cv2.VideoCapture(Path('./Entries/2024/06/08/20240608_142838.mp4'))
    assert cap.isOpened()
    cap.release()
    createVideoIcon(Path('./Entries/2024/06/08/20240608_142838.mp4'))

