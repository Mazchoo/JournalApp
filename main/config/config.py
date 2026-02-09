"""Config containing all tweakable settings of app"""

from typing import Literal, get_args

IContentTypes = Literal["image", "paragraph", "video"]
ALLOWED_CONTENT_TYPES = set(get_args(IContentTypes))
