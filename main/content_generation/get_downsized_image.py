"""Helpers to return a downsized image payload by image_id"""

from django.http import JsonResponse
from django.forms.utils import ErrorDict, ErrorList

from main.models import EntryImage
from main.utils.image import fetch_base64_image_data
from main.utils.file_io import get_base_entry_path


def get_downsized_image_response(post_data: dict) -> JsonResponse:
    """Get a json response with a downsized image for a given image_id"""
    errors = ErrorDict()

    image_id = post_data.get("image_id")
    if image_id is None:
        errors["image_id"] = ErrorList(["No image_id provided"])
        return JsonResponse({"error": errors})

    try:
        entry_image = EntryImage.objects.get(pk=int(image_id))
    except (EntryImage.DoesNotExist, ValueError):
        errors["image_id"] = ErrorList(["Image not found"])
        return JsonResponse({"error": errors})

    full_path = get_base_entry_path(entry_image.file_path)
    b64_string = fetch_base64_image_data(full_path)

    return JsonResponse({"base64": b64_string})
