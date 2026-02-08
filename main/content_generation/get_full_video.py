"""Handle video request to view a single video"""

from pathlib import Path
import mimetypes
from typing import Optional

from django.http import JsonResponse, FileResponse
from django.forms.utils import ErrorDict, ErrorList

from main.content_generation.request_forms import FullContentPath


def get_video_path_from_post(post_data: dict, errors: ErrorDict) -> Optional[str]:
    """Get video path from content data"""
    full_video_form = FullContentPath(post_data)

    if not full_video_form.is_valid():
        errors.update(full_video_form.errors)
        return None

    return full_video_form.cleaned_data["file"]


def get_video_mime_type(target_path: str) -> str:
    """Get the MIME type for the video file."""
    mime_type, _ = mimetypes.guess_type(target_path)
    if mime_type and mime_type.startswith("video/"):
        return mime_type
    # Default to mp4 if unable to determine
    return "video/mp4"


def create_video_stream_response(
    target_path: str, errors: ErrorDict
) -> Optional[FileResponse]:
    """Create a streaming response for the video file."""
    path = Path(target_path)

    if not path.exists():
        errors["file"] = ErrorList(["Video file does not exist"])
        return None

    try:
        mime_type = get_video_mime_type(target_path)

        # Use FileResponse for efficient video streaming with range request support
        # pylint: disable=consider-using-with
        response = FileResponse(open(target_path, "rb"), content_type=mime_type)

        # Set headers for video streaming
        response["Accept-Ranges"] = "bytes"
        response["Content-Length"] = path.stat().st_size

        return response

    except (OSError, ValueError, KeyError) as e:
        errors["stream"] = ErrorList([f"Error streaming video: {str(e)}"])
        return None


def get_full_video_response(post_data: dict) -> JsonResponse | FileResponse:
    """Return video streaming data if video exists"""
    errors = ErrorDict()

    target_path = get_video_path_from_post(post_data, errors)
    if target_path is None:
        return JsonResponse({"error": errors})

    video_response = create_video_stream_response(target_path, errors)
    if video_response is None:
        return JsonResponse({"error": errors})

    return video_response
