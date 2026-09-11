"""Config containing all tweakable settings of app"""

from typing import Literal, Tuple, get_args

from main.file_types import ImageFileType, MeshFileType, VideoFileType

IContentTypes = Literal["image", "paragraph", "video", "mesh"]
ALLOWED_CONTENT_TYPES = set(get_args(IContentTypes))

NR_IMAGES_TO_DISPLAY = 18
NR_ATTEMPTS_TO_SELECT_IMAGE = 10

IDayNamesOfWeek = Tuple[str, str, str, str, str, str, str]
IMonthNamesOfYear = Tuple[str, str, str, str, str, str, str, str, str, str, str, str]


class DateConstants:
    """Static date information"""

    day_names: IDayNamesOfWeek = (
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    )
    day_names_short: IDayNamesOfWeek = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
    month_names: IMonthNamesOfYear = (
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    )


class ImageConstants:
    """Static image configuration"""

    supported_extensions: tuple[ImageFileType, ...] = tuple(ImageFileType)
    unknown_enoding_type: str = "unknown"
    default_display_longest_side: int = 1024
    icon_size: int = 96


class VideoConstants:
    """Static information for displaying videos"""

    supported_extensions: tuple[VideoFileType, ...] = tuple(VideoFileType)
    save_image_extention: str = ImageFileType.JPEG.encoding
    collage_image_longest_side: int = 768
    collage_nr_rows: int = 1
    collage_nr_cols: int = 3
    nr_extra_cols: int = 1
    billateral_filter: bool = False
    collage_spacing: int = 10
    icon_size: int = 96


class MeshConstants:
    """Static information for displaying meshes"""

    supported_extensions: tuple[MeshFileType, ...] = tuple(MeshFileType)
    save_image_extention: str = ImageFileType.JPEG.encoding
    icon_size: int = 96
