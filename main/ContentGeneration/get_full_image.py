"""Helpers to return full image payload"""

from typing import Tuple, Optional

from django.http import JsonResponse
from django.forms.utils import ErrorDict

from main.Helpers.image_utils import (
    load_image_directly,
    add_encoding_type_to_base64,
    get_encoding_type,
)
from main.Helpers.image_constants import ImageConstants
from main.ContentGeneration.request_forms import FullImagePath


def check_target_path_in_post(
    post_data: dict,
) -> Tuple[Optional[dict], Optional[ErrorDict]]:
    """Assert target path is valid"""
    full_image_form = FullImagePath(post_data)

    if not full_image_form.is_valid():
        return None, full_image_form.errors

    return full_image_form.cleaned_data["file"], None


def create_full_image_base64(target_path: str) -> Tuple[Optional[str], Optional[str]]:
    """Return base64 string of entire image"""
    b64_string = load_image_directly(target_path)
    encoding_type = get_encoding_type(target_path)

    if encoding_type == ImageConstants.unknown_enoding_type:
        return None, "Unknown Encoding Type"

    return add_encoding_type_to_base64(b64_string, encoding_type), None


def get_full_image_reponse(post_data: dict) -> JsonResponse:
    """Get a json reponse to request for an image"""
    target_path, error = check_target_path_in_post(post_data)
    if error is not None:
        return JsonResponse({"error": error})

    b64_string, error = create_full_image_base64(target_path)
    if error is not None:
        return JsonResponse({"error": error})

    return JsonResponse({"base64": b64_string}, safe=True)
