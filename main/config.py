"""Config containing all tweakable settings of app"""

from typing import Literal, Tuple, get_args

IContentTypes = Literal["image", "paragraph", "video"]
ALLOWED_CONTENT_TYPES = set(get_args(IContentTypes))

NR_IMAGES_TO_DISPLAY = 18

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

    supported_extensions: tuple = (".png", ".jpg", ".jpeg", ".jfif")
    reserved_image_tags: tuple = ("_icon", "_resized")
    unknown_enoding_type: str = "unknown"
    default_display_longest_side: int = 1024
    icon_size: int = 96


class VideoConstants:
    """Static information for displaying videos"""

    supported_extensions: Tuple[str] = (".mp4",)
    save_image_extention: str = "jpeg"
    reserved_video_tags: tuple = ("_icon", "_resized")
    collage_image_longest_side: int = 768
    collage_nr_rows: int = 1
    collage_nr_cols: int = 3
    nr_extra_cols: int = 1
    billateral_filter: bool = False
    collage_spacing: int = 10
    icon_size: int = 96
