"""Tests for get_full_mesh functions and the mesh AJAX endpoint."""

import json

import pytest
from django.forms.utils import ErrorDict
from django.http import JsonResponse, FileResponse

from tests.mocks import create_mock_client, create_mock_stored_mesh_file

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


def test_get_mesh_mime_type_glb():
    """glb files should return model/gltf-binary MIME type."""
    from main.content_generation.get_full_mesh import get_mesh_mime_type

    assert get_mesh_mime_type("scan.glb") == "model/gltf-binary"


def test_get_mesh_mime_type_unknown_defaults_to_glb():
    """Unknown extensions should default to model/gltf-binary."""
    from main.content_generation.get_full_mesh import get_mesh_mime_type

    assert get_mesh_mime_type("scan.xyz") == "model/gltf-binary"


def test_get_mesh_path_from_post_valid(tmp_path, monkeypatch):
    """Valid post data with an existing file should return the path."""
    from main.content_generation.get_full_mesh import get_mesh_path_from_post

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    monkeypatch.setattr("main.utils.file_io.RESOLVED_ENTRY_FOLDER", tmp_path.resolve())
    create_mock_stored_mesh_file(tmp_path)

    errors = ErrorDict()
    result = get_mesh_path_from_post({"name": "2025-02-12", "file": "scan.glb"}, errors)
    assert result is not None
    assert result.endswith("scan.glb")
    assert not errors


def test_get_mesh_path_from_post_missing_fields():
    """Missing form fields should return None with errors."""
    from main.content_generation.get_full_mesh import get_mesh_path_from_post

    errors = ErrorDict()
    result = get_mesh_path_from_post({}, errors)
    assert result is None
    assert errors


def test_create_mesh_stream_response_success(tmp_path, monkeypatch):
    """An existing mesh file should return a FileResponse with the GLB type."""
    from main.content_generation.get_full_mesh import create_mesh_stream_response

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    monkeypatch.setattr("main.utils.file_io.RESOLVED_ENTRY_FOLDER", tmp_path.resolve())
    mesh_path = create_mock_stored_mesh_file(tmp_path)

    errors = ErrorDict()
    response = create_mesh_stream_response(str(mesh_path), errors)
    assert isinstance(response, FileResponse)
    assert response["Content-Type"] == "model/gltf-binary"
    assert not errors


def test_create_mesh_stream_response_file_not_found():
    """A nonexistent path should return None with a file error."""
    from main.content_generation.get_full_mesh import create_mesh_stream_response

    errors = ErrorDict()
    response = create_mesh_stream_response("/nonexistent/scan.glb", errors)
    assert response is None
    assert "file" in errors


def test_get_full_mesh_response_success(tmp_path, monkeypatch):
    """A valid request with an existing file should return a streaming FileResponse."""
    from main.content_generation.get_full_mesh import get_full_mesh_response

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    monkeypatch.setattr("main.utils.file_io.RESOLVED_ENTRY_FOLDER", tmp_path.resolve())
    create_mock_stored_mesh_file(tmp_path)

    response = get_full_mesh_response({"name": "2025-02-12", "file": "scan.glb"})
    assert isinstance(response, FileResponse)
    assert response["Content-Type"] == "model/gltf-binary"


def test_get_full_mesh_response_file_not_found(tmp_path, monkeypatch):
    """A request for a nonexistent mesh should return a JSON error."""
    from main.content_generation.get_full_mesh import get_full_mesh_response

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    monkeypatch.setattr("main.utils.file_io.RESOLVED_ENTRY_FOLDER", tmp_path.resolve())
    response = get_full_mesh_response({"name": "2025-02-12", "file": "missing.glb"})
    assert isinstance(response, JsonResponse)
    data = json.loads(response.content)
    assert "error" in data


def test_get_full_mesh_response_invalid_form():
    """An empty request should return a JSON error from form validation."""
    from main.content_generation.get_full_mesh import get_full_mesh_response

    response = get_full_mesh_response({})
    assert isinstance(response, JsonResponse)
    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_get_mesh_non_ajax_returns_404():
    """A normal POST to the mesh endpoint should return 404."""
    client = create_mock_client()
    response = client.post(
        "/ajax/get-mesh/",
        data="name=2025-02-12&file=scan.glb",
        content_type=FORM_CONTENT_TYPE,
    )
    assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
