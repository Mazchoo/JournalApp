"""Handle video request to view a single video"""

from pathlib import Path
from django.http import JsonResponse, FileResponse
import mimetypes

from main.ContentGeneration.request_forms import FullImagePath


def getVideoPath(post_data):
    """Get video path from content data"""
    full_video_form = FullImagePath(post_data)

    if not full_video_form.is_valid():
        return None, full_video_form.errors

    return full_video_form.cleaned_data["file"], None


def getVideoMimeType(target_path):
    """Get the MIME type for the video file."""
    mime_type, _ = mimetypes.guess_type(target_path)
    if mime_type and mime_type.startswith("video/"):
        return mime_type
    # Default to mp4 if unable to determine
    return "video/mp4"


def createVideoStreamResponse(target_path):
    """Create a streaming response for the video file."""
    target_path = Path(target_path)

    if not target_path.exists():
        return None, "Video file does not exist"

    try:
        mime_type = getVideoMimeType(str(target_path))

        # Use FileResponse for efficient video streaming with range request support
        # pylint: disable=consider-using-with
        response = FileResponse(open(target_path, "rb"), content_type=mime_type)

        # Set headers for video streaming
        response["Accept-Ranges"] = "bytes"
        response["Content-Length"] = target_path.stat().st_size

        return response, None

    except Exception as e:
        return None, f"Error streaming video: {str(e)}"


def getFullVideoResponse(post_data: dict):
    """Return video streaming data if video exists"""
    target_path, error = getVideoPath(post_data)
    if error is not None:
        return JsonResponse({"error": error})

    video_response, error = createVideoStreamResponse(target_path)
    if error is not None:
        return JsonResponse({"error": error})

    return video_response
