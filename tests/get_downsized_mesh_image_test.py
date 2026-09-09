"""Tests for get_downsized_mesh_image endpoint."""

import json
from unittest.mock import patch

import pytest
from django.http import JsonResponse

from tests.mocks import create_mock_client, create_mock_entry

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


@pytest.mark.django_db
def test_get_downsized_mesh_image_success():
    """A valid mesh_id should return a base64 JSON response."""
    from main.models import Camera, EntryMesh
    from main.content_generation.get_downsized_mesh_image import (
        get_downsized_mesh_image_response,
    )

    entry = create_mock_entry()
    mesh = EntryMesh.objects.create(
        entry=entry,
        file_path="2025/02/12/scan.glb",
        image_path="2025/02/12/scan.jpeg",
        camera=Camera.objects.create(),
    )

    with patch(
        "main.content_generation.get_downsized_mesh_image.get_mesh_image_base64",
        return_value="data:image/jpeg;base64,mockdata",
    ):
        response = get_downsized_mesh_image_response({"mesh_id": str(mesh.pk)})

    assert isinstance(response, JsonResponse)
    data = json.loads(response.content)
    assert "base64" in data
    assert data["base64"] == "data:image/jpeg;base64,mockdata"
    assert data["camera"] == mesh.camera.view()


@pytest.mark.django_db
def test_get_downsized_mesh_image_missing_id():
    """A request without mesh_id should return an error."""
    from main.content_generation.get_downsized_mesh_image import (
        get_downsized_mesh_image_response,
    )

    response = get_downsized_mesh_image_response({})
    assert isinstance(response, JsonResponse)
    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_get_downsized_mesh_image_not_found():
    """A request with a nonexistent mesh_id should return an error."""
    from main.content_generation.get_downsized_mesh_image import (
        get_downsized_mesh_image_response,
    )

    response = get_downsized_mesh_image_response({"mesh_id": "99999"})
    assert isinstance(response, JsonResponse)
    data = json.loads(response.content)
    assert "error" in data


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


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
