from typing import Tuple, Optional
from pathlib import Path

import cv2
import numpy as np

from main.Helpers.video_constants import VideoConstants


class VideoCapture:
    def __init__(self, video_path: Path):
        self.capture = None
        self.rotation = 0
        if not video_path.exists():
            return
        if not video_path.suffix.lower() in VideoConstants.supported_extensions:
            return
        self.capture = cv2.VideoCapture(str(video_path))
        if self.capture is not None and self.capture.isOpened():
            self._readRotationMetadata()

    def _readRotationMetadata(self):
        """Read rotation metadata from video file."""
        try:
            # Try to get rotation from CAP_PROP_ORIENTATION (OpenCV 4.5+)
            if hasattr(cv2, "CAP_PROP_ORIENTATION_META"):
                rotation = self.capture.get(cv2.CAP_PROP_ORIENTATION_META)
                if rotation in [0, 90, 180, 270]:
                    self.rotation = int(rotation)
                    return

            # Fallback: Try to get rotation from CAP_PROP_ORIENTATION_AUTO
            if hasattr(cv2, "CAP_PROP_ORIENTATION_AUTO"):
                rotation = self.capture.get(cv2.CAP_PROP_ORIENTATION_AUTO)
                if rotation in [0, 90, 180, 270]:
                    self.rotation = int(rotation)
                    return
        except AttributeError:
            # If reading rotation fails, default to 0 (no rotation)
            pass

    def getRotation(self) -> int:
        """Get the rotation angle in degrees (0, 90, 180, or 270)."""
        return self.rotation

    def getWidthHeight(self) -> Tuple[int, int]:
        if not self:
            return (0, 0)

        width = int(self.capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(self.capture.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Swap dimensions if video is rotated 90 or 270 degrees
        if self.rotation in [90, 270]:
            width, height = height, width

        return (width, height)

    def getTotalFrames(self) -> int:
        if not self:
            return 0

        return int(self.capture.get(cv2.CAP_PROP_FRAME_COUNT))

    def getFrameAtIndex(self, frame_index: int) -> Optional[np.ndarray]:
        """Return frame at index if it exists else None"""
        if not self:
            return None

        self.capture.set(cv2.CAP_PROP_POS_FRAMES, frame_index)

        ret, frame = self.capture.read()
        if not ret:
            return None

        return self._applyRotation(frame)

    def _applyRotation(self, frame: np.ndarray) -> np.ndarray:
        """Apply rotation to frame based on video metadata."""
        if self.rotation == 90:
            return cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
        if self.rotation == 180:
            return cv2.rotate(frame, cv2.ROTATE_180)
        if self.rotation == 270:
            return cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
        return frame

    def __enter__(self):
        if self.capture is not None and not self.capture.isOpened():
            self.capture.release()  # Could not open, no point doing anything with capture
        return self

    def __bool__(self):
        return self.capture is not None and self.capture.isOpened()

    def __exit__(self, _type, _value, _traceback):
        if self.capture is not None:
            self.capture.release()
