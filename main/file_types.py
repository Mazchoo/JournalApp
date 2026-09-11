"""String enums for supported media file extensions and reserved stem suffixes."""

from enum import StrEnum


class ImageFileType(StrEnum):
    """File extensions treated as images."""

    PNG = ".png"
    JPG = ".jpg"
    JPEG = ".jpeg"
    JFIF = ".jfif"
    SVG = ".svg"

    @property
    def encoding(self) -> str:
        """MIME subtype used in image data URLs and PIL save format."""
        if self in (ImageFileType.JPG, ImageFileType.JPEG, ImageFileType.JFIF):
            return "jpeg"
        if self is ImageFileType.SVG:
            return "svg+xml"
        return self.lstrip(".")


class VideoFileType(StrEnum):
    """File extensions treated as videos."""

    MP4 = ".mp4"


class MeshFileType(StrEnum):
    """File extensions treated as meshes."""

    GLB = ".glb"


class ReservedSuffix(StrEnum):
    """Stem suffixes reserved for generated companion files."""

    ICON = "_icon"
    RESIZED = "_resized"
