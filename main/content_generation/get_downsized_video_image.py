"""Helpers to return a downsized video collage by video_id."""

from django.forms.utils import ErrorDict, ErrorList
from django.http import FileResponse, JsonResponse

from main.content_generation.get_full_image import (
    create_image_stream_response,
    image_error_response,
)
from main.models import EntryVideo
from main.utils.file_io import get_base_entry_path
from main.utils.video import collage_image_file


def get_downsized_video_image_response(post_data: dict) -> JsonResponse | FileResponse:
    """Stream the collage preview for a video_id, or a JSON error."""
    errors = ErrorDict()

    video_id = post_data.get("video_id")
    if video_id is None:
        errors["video_id"] = ErrorList(["No video_id provided"])
        return image_error_response(errors)

    try:
        entry_video = EntryVideo.objects.get(pk=int(video_id))
    except (EntryVideo.DoesNotExist, ValueError):
        errors["video_id"] = ErrorList(["Video not found"])
        return image_error_response(errors)

    preview = collage_image_file(get_base_entry_path(entry_video.file_path))
    if preview is None:
        errors["file"] = ErrorList(["Collage file does not exist"])
        return image_error_response(errors)

    image_response = create_image_stream_response(str(preview), errors)
    if image_response is None:
        return image_error_response(errors)

    return image_response
