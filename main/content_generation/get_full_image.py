"""Helpers to return full image payload"""

from typing import Optional

from django.http import JsonResponse
from django.forms.utils import ErrorDict, ErrorList

from main.utils.image import (
    load_image_directly,
    add_encoding_type_to_base64,
    get_encoding_type,
)
from main.config.image_constants import ImageConstants
from main.content_generation.request_forms import FullContentPath


def check_target_path_in_post(post_data: dict, errors: ErrorDict) -> Optional[str]:
    """Assert target path is valid"""
    full_image_form = FullContentPath(post_data)

    if not full_image_form.is_valid():
        errors.update(full_image_form.errors)
        return None

    return full_image_form.cleaned_data["file"]


def create_full_image_base64(target_path: str, errors: ErrorDict) -> Optional[str]:
    """Return base64 string of entire image"""
    b64_string = load_image_directly(target_path)
    encoding_type = get_encoding_type(target_path)

    if encoding_type == ImageConstants.unknown_enoding_type:
        errors["encoding"] = ErrorList(["Unknown Encoding Type"])
        return None

    return add_encoding_type_to_base64(b64_string, encoding_type)


def get_full_image_reponse(post_data: dict) -> JsonResponse:
    """Get a json reponse to request for an image"""
    errors = ErrorDict()

    target_path = check_target_path_in_post(post_data, errors)
    if target_path is None:
        return JsonResponse({"error": errors})

    b64_string = create_full_image_base64(target_path, errors)
    if b64_string is None:
        return JsonResponse({"error": errors})

    return JsonResponse({"base64": b64_string, "errors": errors}, safe=True)
