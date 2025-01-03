from typing import Tuple

class VideoConstants:
    supported_extensions: Tuple[str] = ('.mp4', )
    save_image_extention: str = 'jpeg'
    reserved_video_tags: tuple = ("_icon", "_resized")
    collage_image_longest_side: int = 768
    collage_nr_rows: int = 1
    collage_nr_cols: int = 3
    nr_extra_cols: int = 1
    billateral_filter: bool = False
    collage_spacing: int = 10
    icon_size: int = 96
