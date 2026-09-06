"""Handle mesh request to view a full GLB."""

from pathlib import Path
import mimetypes
from typing import Optional

from django.http import JsonResponse, FileResponse
from django.forms.utils import ErrorDict, ErrorList

from main.content_generation.request_forms import FullContentPath

GLB_MIME_TYPE = "model/gltf-binary"


def get_mesh_path_from_post(post_data: dict, errors: ErrorDict) -> Optional[str]:
    """Get mesh path from content data"""
    full_mesh_form = FullContentPath(post_data)

    if not full_mesh_form.is_valid():
        errors.update(full_mesh_form.errors)
        return None

    return full_mesh_form.cleaned_data["file"]


def get_mesh_mime_type(target_path: str) -> str:
    """Get the MIME type for the mesh file."""
    mime_type, _ = mimetypes.guess_type(target_path)
    if mime_type and mime_type.startswith("model/"):
        return mime_type
    return GLB_MIME_TYPE


def create_mesh_stream_response(
    target_path: str, errors: ErrorDict
) -> Optional[FileResponse]:
    """Create a streaming response for the mesh file."""
    path = Path(target_path)

    if not path.exists():
        errors["file"] = ErrorList(["Mesh file does not exist"])
        return None

    try:
        mime_type = get_mesh_mime_type(target_path)

        # pylint: disable=consider-using-with
        response = FileResponse(open(target_path, "rb"), content_type=mime_type)
        response["Content-Length"] = path.stat().st_size

        return response

    except (OSError, ValueError, KeyError) as e:
        errors["stream"] = ErrorList([f"Error streaming mesh: {str(e)}"])
        return None


def get_full_mesh_response(post_data: dict) -> JsonResponse | FileResponse:
    """Return the full GLB if the mesh exists"""
    errors = ErrorDict()

    target_path = get_mesh_path_from_post(post_data, errors)
    if target_path is None:
        return JsonResponse({"error": errors})

    mesh_response = create_mesh_stream_response(target_path, errors)
    if mesh_response is None:
        return JsonResponse({"error": errors})

    return mesh_response
