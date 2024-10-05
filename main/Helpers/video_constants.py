from typing import Tuple

class VideoConstants:
    supported_extensions: Tuple[str] = ('.mp4', )
    save_image_extention: str = '.jpg'
    reserved_video_tags: tuple = ("_icon", "_resized")
    collage_image_longest_side: int = 512
    collage_nr_rows: int = 2
    collage_nr_cols: int = 2
    billateral_filter: bool = False
    spacing: int = 10
    icon_size: int = 96
