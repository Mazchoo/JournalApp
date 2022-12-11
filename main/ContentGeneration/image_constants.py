
from dataclasses import dataclass

@dataclass
class ImageConstants:
    supported_extensions: tuple = ('.png', '.jpg', '.jpeg')
    default_display_longest_side: int = 1024
    low_res_longest_side: int = 512
    low_res_nr_threshold: int = 16
    icon_size: tuple = (96, 96)
