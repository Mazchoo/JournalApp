from pathlib import Path

from PIL import Image, ExifTags

from main.Helpers.image_constants import ImageConstants


def getOrientationFlag():
    for key, value in ExifTags.TAGS.items():
        if value == "Orientation":
            return key


def orientatePILImage(image, exif):
    if exif is None:
        return image
    orientation_key = getOrientationFlag()

    if orientation_key in exif:
        if exif[orientation_key] == 3:
            image = image.rotate(180, expand=True)
        elif exif[orientation_key] == 6:
            image = image.rotate(270, expand=True)
        elif exif[orientation_key] == 8:
            image = image.rotate(90, expand=True)

    return image


def cropImageToSquare(image: Image.Image):
    width, height = image.size
    crop_amount = (max(width, height) - min(width, height)) // 2

    if width > height:
        image_resized = image.crop((crop_amount, 0, width - crop_amount, height))
    else:
        image_resized = image.crop((0, crop_amount, width, height - crop_amount))

    return image_resized


def getResizingFactorToDownSized(file_path: Path):
    image = Image.open(file_path)
    width, height = image.size
    max_dimension = max(width, height)

    factor = 1
    while max_dimension >= ImageConstants.default_display_longest_side:
        factor *= 2
        max_dimension //= 2

    return factor


def getSquareResizedImage(image: Image, target_size: int) -> Image:
    image = cropImageToSquare(image)
    image = image.resize((target_size, target_size), resample=Image.LANCZOS)
    return orientatePILImage(image, image.getexif())
