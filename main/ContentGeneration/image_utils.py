
import os
import base64
from pathlib import Path
import shutil
from io import BytesIO
from PIL import Image, ExifTags
from functools import lru_cache

from main.ContentGeneration.image_constants import ImageConstants
IMAGE_CONSTANTS = ImageConstants()


def getImageSavePath(file_name: str, entry_name: str) -> str:
    target_folder = f"{os.getcwd()}\\Images\\{entry_name}"
    target_file_path = f"{target_folder}\\{file_name}"

    if not Path(target_file_path).exists():
        source_file_path = f"{os.getcwd()}\\Images\\{file_name}"

        if Path(source_file_path).exists():
            if not Path(target_folder).exists():
                os.mkdir(target_folder)
            shutil.move(source_file_path, target_file_path)
        else:
            target_file_path = source_file_path

    return target_file_path


def getImageFileName(file_path: str) -> str:
    file_path = Path(file_path)
    return file_path.stem + file_path.suffix


@lru_cache(maxsize = 100)
def parseBase64ImageData(file_path: str) -> str:
    file_path = Path(file_path)

    if file_path.exists() and file_path.suffix in IMAGE_CONSTANTS.supported_extensions:
        # ToDo - Clean up this mess

        image = Image.open(file_path)
        exif = image._getexif()
        width, height = image.size
        max_dimension = max(width, height)
        factor = 1
        while max_dimension >= IMAGE_CONSTANTS.default_display_longest_side:
            factor *= 2
            max_dimension //= 2

        if file_path.suffix in [".jpg", ".jpeg"]:
            ecoding_type = "jpeg"
        elif file_path.suffix == ".png":
            ecoding_type = "png"

        if factor > 1:
            image = image.resize((width // factor, height // factor), resample=Image.LANCZOS)
            
            for orientation in ExifTags.TAGS.keys():
                if ExifTags.TAGS[orientation] == 'Orientation':
                    break

            if exif[orientation] == 3:
                image=image.rotate(180, expand=True)
            elif exif[orientation] == 6:
                image=image.rotate(270, expand=True)
            elif exif[orientation] == 8:
                image=image.rotate(90, expand=True)

            buffered = BytesIO()
            image.save(buffered, format="JPEG")
            b64_string = base64.b64encode(buffered.getvalue()).decode('utf-8')
            ecoding_type = "jpeg"
        else:
            with open(file_path, "rb") as img_file:
                b64_string = base64.b64encode(img_file.read()).decode('utf-8')

        b64_string = f"data:image/{ecoding_type};base64,{b64_string}"
    else:
        print(f'Error! Image {file_path} does not exist!')
        b64_string = ""
        
    return b64_string
