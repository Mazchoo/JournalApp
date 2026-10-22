"""Helpers to return a full image as a streamed file."""

from pathlib import Path
from typing import Optional

from django.forms.utils import ErrorDict, ErrorList
from django.http import FileResponse, JsonResponse

from main.config import ImageConstants
from main.content_generation.request_forms import FullContentPath
from main.utils.image import get_encoding_type


def check_target_path_in_post(post_data: dict, errors: ErrorDict) -> Optional[str]:
    """Assert target path is valid"""
    full_image_form = FullContentPath(post_data)

    if not full_image_form.is_valid():
        errors.update(full_image_form.errors)
        return None

    return full_image_form.cleaned_data["file"]


def get_image_mime_type(target_path: str) -> Optional[str]:
    """Return an image MIME type, or None when the extension is unsupported."""
    encoding_type = get_encoding_type(target_path)
    if encoding_type == ImageConstants.unknown_enoding_type:
        return None
    return f"image/{encoding_type}"


def create_image_stream_response(
    target_path: str, errors: ErrorDict
) -> Optional[FileResponse]:
    """Create a streaming response for the image file."""
    path = Path(target_path)

    if not path.exists():
        errors["file"] = ErrorList(["Image file does not exist"])
        return None

    mime_type = get_image_mime_type(target_path)
    if mime_type is None:
        errors["encoding"] = ErrorList(["Unknown Encoding Type"])
        return None

    try:
        # FileResponse closes the file when the response is finished.
        # pylint: disable=consider-using-with
        response = FileResponse(open(target_path, "rb"), content_type=mime_type)
    except (OSError, ValueError, KeyError):
        errors["stream"] = ErrorList(["Error streaming image"])
        return None

    response["Accept-Ranges"] = "bytes"
    response["Content-Length"] = path.stat().st_size
    return response


def image_error_response(errors: ErrorDict) -> JsonResponse:
    """Return a JSON error with a non-success status and no file path."""
    return JsonResponse({"error": errors}, status=400)


def get_full_image_reponse(post_data: dict) -> JsonResponse | FileResponse:
    """Stream an image file, or a JSON error that does not include its path."""
    errors = ErrorDict()

    target_path = check_target_path_in_post(post_data, errors)
    if target_path is None:
        return image_error_response(errors)

    image_response = create_image_stream_response(target_path, errors)
    if image_response is None:
        return image_error_response(errors)

    return image_response
