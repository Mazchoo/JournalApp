"""Helpers to return a downsized mesh preview by mesh_id."""

from django.forms.utils import ErrorDict, ErrorList
from django.http import FileResponse, JsonResponse

from main.content_generation.get_full_image import (
    create_image_stream_response,
    image_error_response,
)
from main.models import EntryMesh
from main.utils.file_io import get_base_entry_path
from main.utils.mesh import mesh_preview_file


def get_downsized_mesh_image_response(post_data: dict) -> JsonResponse | FileResponse:
    """Stream the preview image for a mesh_id, or a JSON error."""
    errors = ErrorDict()

    mesh_id = post_data.get("mesh_id")
    if mesh_id is None:
        errors["mesh_id"] = ErrorList(["No mesh_id provided"])
        return image_error_response(errors)

    try:
        entry_mesh = EntryMesh.objects.get(pk=int(mesh_id))
    except (EntryMesh.DoesNotExist, ValueError):
        errors["mesh_id"] = ErrorList(["Mesh not found"])
        return image_error_response(errors)

    preview = mesh_preview_file(get_base_entry_path(entry_mesh.file_path))
    if preview is None:
        errors["file"] = ErrorList(["Mesh preview does not exist"])
        return image_error_response(errors)

    image_response = create_image_stream_response(str(preview), errors)
    if image_response is None:
        return image_error_response(errors)

    return image_response
