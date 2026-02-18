"""Helpers to return a downsized video collage image by video_id"""

from django.http import JsonResponse
from django.forms.utils import ErrorDict, ErrorList

from main.models import EntryVideo
from main.utils.video import get_collage_base64
from main.utils.file_io import get_base_entry_path


def get_downsized_video_image_response(post_data: dict) -> JsonResponse:
    """Get a json response with a downsized collage image for a given video_id"""
    errors = ErrorDict()

    video_id = post_data.get("video_id")
    if video_id is None:
        errors["video_id"] = ErrorList(["No video_id provided"])
        return JsonResponse({"error": errors})

    try:
        entry_video = EntryVideo.objects.get(pk=int(video_id))
    except (EntryVideo.DoesNotExist, ValueError):
        errors["video_id"] = ErrorList(["Video not found"])
        return JsonResponse({"error": errors})

    full_path = get_base_entry_path(entry_video.file_path)
    b64_string = get_collage_base64(full_path)

    return JsonResponse({"base64": b64_string})
