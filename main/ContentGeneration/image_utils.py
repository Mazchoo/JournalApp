
import os
import base64
from pathlib import Path
import shutil
from io import BytesIO
from PIL import Image
from functools import lru_cache

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


def createImageIcon(target_path_obj: Path):
    if not target_path_obj.exists():
        return False
    
    icon_file_name = f"{target_path_obj.stem}_icon{target_path_obj.suffix}"
    target_icon_path = target_path_obj.parent / icon_file_name
    if target_icon_path.exists():
        return False
    
    image = Image.open(target_path_obj)
    
    icon_size = ImageConstants.icon_size
    image_resized = cropImageToSquare(image)
    image_resized = image_resized.resize((icon_size, icon_size), resample=Image.LANCZOS)
    image_resized = orientatePILImage(image_resized, image._getexif())

    image_resized.save(target_icon_path)
    return True


def createEntryFilePathIfExists(target_file_path: str, target_folder: str, file_name: str):
    target_path_obj = Path(target_file_path)
    if target_path_obj.exists():
        createImageIcon(target_path_obj)
        return target_file_path

    source_file_path = f"{os.getcwd()}\\Images\\{file_name}"
    output_path = source_file_path

    if Path(source_file_path).exists():
        if not Path(target_folder).exists():
            os.mkdir(target_folder)
        shutil.move(source_file_path, target_file_path)
        output_path = target_file_path
        createImageIcon(target_path_obj)

    return output_path


def getImageSavePath(file_name: str, entry_name: str) -> str:
    target_folder = f"{os.getcwd()}\\Images\\{entry_name}"
    target_file_path = f"{target_folder}\\{file_name}"

    return createEntryFilePathIfExists(target_file_path, target_folder, file_name)


def getImageFileName(file_path: str) -> str:
    file_path = Path(file_path)
    return file_path.stem + file_path.suffix


def getResizingFactor(file_path):
    image = Image.open(file_path)
    width, height = image.size
    max_dimension = max(width, height)

    factor = 1
    while max_dimension >= ImageConstants.default_display_longest_side:
        factor *= 2
        max_dimension //= 2
    
    return factor


def getResizeBase64(file_path, factor):
    image = Image.open(file_path)
    width, height = image.size
    
    image_resized = image.resize((width // factor, height // factor), resample=Image.LANCZOS)

    image_resized = orientatePILImage(image_resized, image._getexif())

    buffered = BytesIO()
    image_resized.save(buffered, format="JPEG")
    b64_string = base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    return b64_string, "jpeg"


def loadImageDirectly(file_path):
    if file_path.suffix in [".jpg", ".jpeg"]:
        ecoding_type = "jpeg"
    elif file_path.suffix == ".png":
        ecoding_type = "png"

    with open(file_path, "rb") as img_file:
        b64_string = base64.b64encode(img_file.read()).decode('utf-8')
    
    return b64_string, ecoding_type


@lru_cache(maxsize=1024)
def parseBase64ImageData(file_path: str) -> str:
    file_path = Path(file_path)

    if file_path.exists() and file_path.suffix in ImageConstants.supported_extensions:

        factor = getResizingFactor(file_path)
        if factor > 1:
            b64_string, ecoding_type = getResizeBase64(file_path, factor)
        else:
            b64_string, ecoding_type = loadImageDirectly(file_path)

        b64_string = f"data:image/{ecoding_type};base64,{b64_string}"
    else:
        print(f'Error! Image {file_path} does not exist!')
        b64_string = ""
    
    return b64_string
