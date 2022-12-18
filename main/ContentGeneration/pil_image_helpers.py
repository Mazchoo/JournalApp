
from PIL import Image

from main.ContentGeneration.image_constants import ImageConstants


def orientatePILImage(image_resized, exif):
    if exif is None:
        return image_resized
    orientation_key = ImageConstants.pil_orientation_flag
    
    if exif[orientation_key] == 3:
        image_resized = image_resized.rotate(180, expand=True)
    elif exif[orientation_key] == 6:
        image_resized = image_resized.rotate(270, expand=True)
    elif exif[orientation_key] == 8:
        image_resized = image_resized.rotate(90, expand=True)
    
    return image_resized


def cropImageToSquare(image: Image):
    width, height = image.size
    crop_amount = (max(width, height) - min(width, height)) // 2

    if width > height:
        image_resized = image.crop((crop_amount, 0, width - crop_amount, height))
    else:
        image_resized = image.crop((0, crop_amount, width, height - crop_amount))
    
    return image_resized


def getResizingFactorToDownSized(file_path):
    image = Image.open(file_path)
    width, height = image.size
    max_dimension = max(width, height)

    factor = 1
    while max_dimension >= ImageConstants.default_display_longest_side:
        factor *= 2
        max_dimension //= 2
    
    return factor
