
import os
import base64
from pathlib import Path
from main.ContentGeneration.image_constants import ImageConstants

def getImageSavePath(file_name: str) -> str:
    # ToDo - Move images into an entry folder (if not already there)
    return f"{os.getcwd()}\\Images\\{file_name}"


def getImageFileName(file_path: str) -> str:
    file_path = Path(file_path)
    return file_path.stem + file_path.suffix


def parseBase64ImageData(file_path: str) -> str:
    file_path = Path(file_path)

    if file_path.exists() and file_path.suffix in ImageConstants().supported_extensions:
        with open(file_path, "rb") as img_file:
            b64_string = base64.b64encode(img_file.read()).decode('utf-8')

        if file_path.suffix in [".jpg", ".jpeg"]:
            ecoding_type = "jpeg"
        elif file_path.suffix == ".png":
            ecoding_type = "png"

        b64_string = f"data:image/{ecoding_type};base64,{b64_string}"
    else:
        print(f'Error! Image {file_path} does not exist!')
        b64_string = ""
        
    return b64_string
