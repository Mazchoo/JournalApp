"""Helpers to return a downsized mesh preview image by mesh_id"""

from django.http import JsonResponse
from django.forms.utils import ErrorDict, ErrorList

from main.models import EntryMesh
from main.utils.mesh import get_mesh_image_base64
from main.utils.file_io import get_base_entry_path


def get_downsized_mesh_image_response(post_data: dict) -> JsonResponse:
    """Get a json response with a downsized preview image for a given mesh_id"""
    errors = ErrorDict()

    mesh_id = post_data.get("mesh_id")
    if mesh_id is None:
        errors["mesh_id"] = ErrorList(["No mesh_id provided"])
        return JsonResponse({"error": errors})

    try:
        entry_mesh = EntryMesh.objects.get(pk=int(mesh_id))
    except (EntryMesh.DoesNotExist, ValueError):
        errors["mesh_id"] = ErrorList(["Mesh not found"])
        return JsonResponse({"error": errors})

    full_path = get_base_entry_path(entry_mesh.file_path)
    b64_string = get_mesh_image_base64(full_path)

    return JsonResponse({"base64": b64_string})
