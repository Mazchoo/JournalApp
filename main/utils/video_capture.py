"""Wrapper around video feed using imageio-ffmpeg"""

from typing import Tuple, Optional
from pathlib import Path
from contextlib import closing

import numpy as np
import imageio.v3 as iio
from imageio_ffmpeg import read_frames, count_frames_and_secs

from main.config import VideoConstants


class VideoCapture:
    """File handle to get video information using imageio-ffmpeg"""

    def __init__(self, video_path: Path):
        self._video_path = video_path
        self._width = 0
        self._height = 0
        self._frame_count = 0
        self._fps = 30.0
        self._duration = 0.0
        self._is_valid = False

        if not video_path.exists():
            return
        if video_path.suffix.lower() not in VideoConstants.supported_extensions:
            return

        self._initialize()

    def _initialize(self):
        """Initialize video metadata via imageio-ffmpeg."""
        # Get frame count and duration
        self._frame_count, self._duration = count_frames_and_secs(str(self._video_path))
        self._frame_count = self._frame_count or 0
        self._duration = self._duration or 0.0

        if self._duration > 0 and self._frame_count > 0:
            self._fps = self._frame_count / self._duration
        else:
            self._fps = 0.0

        # Get dimensions by reading first frame
        frame = iio.imread(str(self._video_path), index=0)
        self._height, self._width = frame.shape[:2]

        self._is_valid = self._width > 0 and self._height > 0

    def get_width_height(self) -> Tuple[int, int]:
        """Get width and height of each frame."""
        if not self:
            return (0, 0)
        return (self._width, self._height)

    def get_total_frames(self) -> int:
        """Get total number of frames from video."""
        if not self:
            return 0
        return self._frame_count or 0

    def get_frame_at_idx(self, frame_index: int) -> Optional[np.ndarray]:
        """Return frame at index using time-based seeking."""
        if not self:
            return None

        if frame_index < 0 or frame_index > (self._frame_count or 0) - 1:
            return None

        timestamp = frame_index / self._fps

        with closing(
            read_frames(
                str(self._video_path),
                input_params=["-ss", f"{timestamp:.3f}"],
                output_params=["-vframes", "1"],
                pix_fmt="rgb24",
            )
        ) as frame_generator:
            frame_meta = next(frame_generator)
            frame_bytes = next(frame_generator)

        w, h = frame_meta.get("size", (self._width, self._height))
        frame = np.frombuffer(frame_bytes, dtype=np.uint8).reshape((h, w, 3))
        return frame

    def __enter__(self):
        return self

    def __bool__(self) -> bool:
        return self._is_valid

    def __exit__(self, _type, _value, _traceback):
        pass
