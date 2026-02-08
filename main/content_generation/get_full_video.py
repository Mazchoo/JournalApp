"""Handle video request to view a single video"""

from pathlib import Path
import mimetypes

from django.http import JsonResponse, FileResponse

from main.content_generation.request_forms import FullContentPath


def get_video_path_from_post(post_data: dict):
    """Get video path from content data"""
    full_video_form = FullContentPath(post_data)

    if not full_video_form.is_valid():
        return None, full_video_form.errors

    return full_video_form.cleaned_data["file"], None


def get_video_mime_type(target_path: str):
    """Get the MIME type for the video file."""
    mime_type, _ = mimetypes.guess_type(target_path)
    if mime_type and mime_type.startswith("video/"):
        return mime_type
    # Default to mp4 if unable to determine
    return "video/mp4"


def create_video_stream_response(target_path: str):
    """Create a streaming response for the video file."""
    path = Path(target_path)

    if not path.exists():
        return None, "Video file does not exist"

    try:
        mime_type = get_video_mime_type(target_path)

        # Use FileResponse for efficient video streaming with range request support
        # pylint: disable=consider-using-with
        response = FileResponse(open(target_path, "rb"), content_type=mime_type)

        # Set headers for video streaming
        response["Accept-Ranges"] = "bytes"
        response["Content-Length"] = path.stat().st_size

        return response, None

    except (OSError, ValueError, KeyError) as e:
        return None, f"Error streaming video: {str(e)}"


def get_full_video_response(post_data: dict):
    """Return video streaming data if video exists"""
    target_path, error = get_video_path_from_post(post_data)
    if error is not None:
        return JsonResponse({"error": error})

    video_response, error = create_video_stream_response(target_path)
    if error is not None:
        return JsonResponse({"error": error})

    return video_response
