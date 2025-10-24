from typing import Tuple, Optional
from pathlib import Path

import cv2
import numpy as np

from main.Helpers.video_constants import VideoConstants


class VideoCapture:
    def __init__(self, video_path: Path):
        self.capture = None
        if not video_path.exists():
            return
        if not video_path.suffix.lower() in VideoConstants.supported_extensions:
            return
        self.capture = cv2.VideoCapture(video_path)

    def getWidthHeight(self) -> Tuple[int, int]:
        if not self:
            return (0, 0)

        width = int(self.capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(self.capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        return (width, height)

    def getTotalFrames(self) -> int:
        if not self:
            return 0

        return int(self.capture.get(cv2.CAP_PROP_FRAME_COUNT))

    def getFrameAtIndex(self, frame_index: int) -> Optional[np.ndarray]:
        if not self:
            return None

        self.capture.set(cv2.CAP_PROP_POS_FRAMES, frame_index)

        ret, frame = self.capture.read()
        if not ret:
            return None

        return frame

    def __enter__(self):
        if self.capture is not None and not self.capture.isOpened():
            self.capture.release()  # Could not open, no point doing anything with capture
        return self

    def __bool__(self):
        return self.capture is not None and self.capture.isOpened()

    def __exit__(self, type, value, traceback):
        if self.capture is not None:
            self.capture.release()
