
from PIL import ExifTags

def getOrientationFlag():
    for key, value in ExifTags.TAGS.items():
        if value == 'Orientation':
           return key


class ImageConstants:
    supported_extensions: tuple = ('.png', '.jpg', '.jpeg')
    default_display_longest_side: int = 1024
    icon_size: int = 96
    pil_orientation_flag: int = getOrientationFlag()
