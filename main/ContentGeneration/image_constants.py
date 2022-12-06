
from dataclasses import dataclass

@dataclass
class ImageConstants:
    supported_extensions: tuple = ('.png', '.jpg', '.jpeg')
    