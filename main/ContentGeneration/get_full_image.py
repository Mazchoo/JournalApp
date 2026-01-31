from django.http import JsonResponse

from main.Helpers.image_utils import (
    load_image_directly,
    add_encoding_type_to_base64,
    get_encoding_type,
)
from main.Helpers.image_constants import ImageConstants
from main.ContentGeneration.request_forms import FullImagePath


def checkTargetPathInData(post_data):
    full_image_form = FullImagePath(post_data)

    if not full_image_form.is_valid():
        return None, full_image_form.errors

    return full_image_form.cleaned_data["file"], None


def createFullImageBase64(target_path):
    b64_string = load_image_directly(target_path)
    encoding_type = get_encoding_type(target_path)

    if encoding_type == ImageConstants.unknown_enoding_type:
        return None, "Unknown Encoding Type"

    return add_encoding_type_to_base64(b64_string, encoding_type), None


def getFullImageReponse(post_data: dict):
    target_path, error = checkTargetPathInData(post_data)
    if error is not None:
        return JsonResponse({"error": error})

    b64_string, error = createFullImageBase64(target_path)
    if error is not None:
        return JsonResponse({"error": error})

    return JsonResponse({"base64": b64_string}, safe=True)
