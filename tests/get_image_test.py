"""Tests for get_full_image functions and the image AJAX endpoint."""

import json

import pytest
from django.forms.utils import ErrorDict
from django.http import JsonResponse

from tests.mocks import create_mock_client, create_mock_image_file

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


def test_check_target_path_in_post_valid(tmp_path, monkeypatch):
    """Valid post data with an existing file should return the resolved path."""
    from main.content_generation.get_full_image import check_target_path_in_post

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    create_mock_image_file(tmp_path)
    errors = ErrorDict()
    result = check_target_path_in_post(
        {"name": "2025-02-12", "file": "photo.jpg"}, errors
    )
    assert result is not None
    assert result.endswith("photo.jpg")
    assert not errors


def test_check_target_path_in_post_missing_fields():
    """Missing form fields should return None with errors."""
    from main.content_generation.get_full_image import check_target_path_in_post

    errors = ErrorDict()
    result = check_target_path_in_post({}, errors)
    assert result is None
    assert errors


def test_check_target_path_in_post_file_not_found(tmp_path, monkeypatch):
    """A file that doesn't exist on disk should return None with errors."""
    from main.content_generation.get_full_image import check_target_path_in_post

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    errors = ErrorDict()
    result = check_target_path_in_post(
        {"name": "2025-02-12", "file": "missing.jpg"}, errors
    )
    assert result is None
    assert errors


def test_create_full_image_base64_success(tmp_path, monkeypatch):
    """A valid JPEG path should return a base64 string with encoding prefix."""
    from main.content_generation.get_full_image import create_full_image_base64

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    image_path = create_mock_image_file(tmp_path)
    errors = ErrorDict()
    result = create_full_image_base64(str(image_path), errors)
    assert result is not None
    assert result.startswith("data:image/jpeg;base64,")
    assert not errors


def test_create_full_image_base64_unknown_encoding(tmp_path):
    """An unsupported extension should return None with an encoding error."""
    from main.content_generation.get_full_image import create_full_image_base64

    unknown_file = tmp_path / "image.bmp"
    unknown_file.write_bytes(b"\x00" * 10)
    errors = ErrorDict()
    result = create_full_image_base64(str(unknown_file), errors)
    assert result is None
    assert "encoding" in errors


def test_get_full_image_reponse_success(tmp_path, monkeypatch):
    """A valid request with an existing image should return a base64 JSON response."""
    from main.content_generation.get_full_image import get_full_image_reponse

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    create_mock_image_file(tmp_path)
    response = get_full_image_reponse({"name": "2025-02-12", "file": "photo.jpg"})
    assert isinstance(response, JsonResponse)
    data = json.loads(response.content)
    assert "base64" in data
    assert data["base64"].startswith("data:image/jpeg;base64,")


def test_get_full_image_reponse_file_not_found(tmp_path, monkeypatch):
    """A request for a nonexistent image should return a JSON error."""
    from main.content_generation.get_full_image import get_full_image_reponse

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    response = get_full_image_reponse({"name": "2025-02-12", "file": "missing.jpg"})
    assert isinstance(response, JsonResponse)
    data = json.loads(response.content)
    assert "error" in data


def test_get_full_image_reponse_invalid_form():
    """An empty request should return a JSON error from form validation."""
    from main.content_generation.get_full_image import get_full_image_reponse

    response = get_full_image_reponse({})
    assert isinstance(response, JsonResponse)
    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_get_image_non_ajax_returns_404():
    """A normal POST to the image endpoint should return 404."""
    client = create_mock_client()
    response = client.post(
        "/ajax/get-image/",
        data="name=2025-02-12&file=photo.jpg",
        content_type=FORM_CONTENT_TYPE,
    )
    assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
