

from django.http import HttpResponse, JsonResponse
from pathlib import Path

from main.ContentGeneration.image_utils import (getImagePath, loadImageDirectly, 
                                                addEncodingTypeToBase64, getEncodingType)
from main.ContentGeneration.image_constants import ImageConstants
from main.forms import FullImagePath


def checkTargetPathInData(post_data):
    full_image_form = FullImagePath(post_data)
    
    if not full_image_form.is_valid():
        return None, HttpResponse(full_image_form.errors, status=404)

    return full_image_form.cleaned_data['file'], None


def createFullImageBase64(target_path):
    b64_string = loadImageDirectly(target_path)
    encoding_type = getEncodingType(target_path)
    
    if encoding_type == ImageConstants.unknown_enoding_type:
        return None, HttpResponse("Unknown Encoding Type", status=404)
    
    return addEncodingTypeToBase64(b64_string, encoding_type), None


def getFullImageReponse(post_data: dict):
    target_path, error = checkTargetPathInData(post_data)
    if error is not None:
        return error
    
    b64_string, error = createFullImageBase64(target_path)
    if error is not None:
        return error
    
    return JsonResponse({"base64": b64_string}, safe=True)
