"""Tests for the downsized mesh preview endpoint."""

import json
from pathlib import Path

import pytest
from django.http import FileResponse, JsonResponse
from PIL import Image

from main.content_generation.get_downsized_mesh_image import (
    get_downsized_mesh_image_response,
)
from main.models import Camera, EntryMesh
from tests.mocks import create_mock_client, create_mock_entry

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


def write_jpeg(path: Path):
    """Write a real JPEG the preview helper can open."""
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (16, 16), color=(4, 5, 6)).save(path, format="JPEG")


@pytest.mark.django_db
def test_get_downsized_mesh_image_streams_preview(tmp_path):
    """A saved mesh streams its preview file."""
    entry = create_mock_entry()
    mesh = EntryMesh.objects.create(
        entry=entry,
        file_path="2025/02/12/scan.glb",
        image_path="2025/02/12/scan_resized.jpeg",
    )
    Camera.objects.create(mesh=mesh)
    preview_path = tmp_path / "2025" / "02" / "12" / "scan_resized.jpeg"
    write_jpeg(preview_path)
    (tmp_path / "2025" / "02" / "12" / "scan.glb").write_bytes(b"glTF")

    response = get_downsized_mesh_image_response({"mesh_id": str(mesh.pk)})

    assert isinstance(response, FileResponse)
    assert response["Content-Type"] == "image/jpeg"
    assert b"".join(response.streaming_content) == preview_path.read_bytes()
    assert str(tmp_path) not in " ".join(
        str(value) for value in response.headers.values()
    )


@pytest.mark.django_db
def test_get_downsized_mesh_image_missing_id():
    """A request without mesh_id should return an error."""
    response = get_downsized_mesh_image_response({})
    assert isinstance(response, JsonResponse)
    assert response.status_code == 400
    assert "error" in json.loads(response.content)


@pytest.mark.django_db
def test_get_downsized_mesh_image_not_found():
    """A request with a nonexistent mesh_id should return an error."""
    response = get_downsized_mesh_image_response({"mesh_id": "99999"})
    assert isinstance(response, JsonResponse)
    assert response.status_code == 400
    assert "error" in json.loads(response.content)


@pytest.mark.django_db
def test_get_downsized_mesh_image_non_ajax_returns_404():
    """A normal POST to the downsized mesh endpoint should return 404."""
    client = create_mock_client()
    response = client.post(
        "/ajax/get-downsized-mesh-image/",
        data="mesh_id=1",
        content_type=FORM_CONTENT_TYPE,
    )
    assert response.status_code == 404
