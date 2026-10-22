"""Tests for get_full_image functions and the image AJAX endpoint."""

import json
from pathlib import Path

import pytest
from django.forms.utils import ErrorDict
from django.http import FileResponse, JsonResponse

from main.content_generation.get_full_image import (
    check_target_path_in_post,
    create_image_stream_response,
    get_full_image_reponse,
    get_image_mime_type,
)
from tests.mocks import create_mock_client, create_mock_image_file, create_mock_svg_file

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


def header_text(response) -> str:
    """Join header values so tests can check that a folder path was not sent."""
    return " ".join(str(value) for value in response.headers.values())


def test_check_target_path_in_post_valid(tmp_path):
    """Valid post data with an existing file should return the resolved path."""
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
    errors = ErrorDict()
    result = check_target_path_in_post({}, errors)
    assert result is None
    assert errors


def test_check_target_path_in_post_file_not_found(tmp_path):
    """A file that doesn't exist on disk should return None with errors."""
    errors = ErrorDict()
    result = check_target_path_in_post(
        {"name": "2025-02-12", "file": "missing.jpg"}, errors
    )
    assert result is None
    assert errors
    assert str(tmp_path) not in str(errors)


def test_get_image_mime_type_jpeg_and_svg(tmp_path):
    """Known image extensions map to image MIME types."""
    image_path = create_mock_image_file(tmp_path)
    svg_path = create_mock_svg_file(tmp_path)
    assert get_image_mime_type(str(image_path)) == "image/jpeg"
    assert get_image_mime_type(str(svg_path)) == "image/svg+xml"


def test_get_image_mime_type_unknown():
    """An unsupported extension has no image MIME type."""
    assert get_image_mime_type("image.bmp") is None


def test_create_image_stream_response_success(tmp_path):
    """An existing JPEG should stream the file bytes with image headers."""
    image_path = create_mock_image_file(tmp_path)
    errors = ErrorDict()
    response = create_image_stream_response(str(image_path), errors)
    assert isinstance(response, FileResponse)
    assert response["Content-Type"] == "image/jpeg"
    assert response["Accept-Ranges"] == "bytes"
    assert response["Content-Disposition"] == 'inline; filename="photo.jpg"'
    assert int(response["Content-Length"]) == image_path.stat().st_size
    assert b"".join(response.streaming_content) == image_path.read_bytes()
    assert str(image_path.parent) not in header_text(response)
    assert not errors


def test_create_image_stream_response_unknown_encoding(tmp_path):
    """An unsupported extension should return None with an encoding error."""
    unknown_file = tmp_path / "image.bmp"
    unknown_file.write_bytes(b"\x00" * 10)
    errors = ErrorDict()
    response = create_image_stream_response(str(unknown_file), errors)
    assert response is None
    assert "encoding" in errors
    assert str(tmp_path) not in str(errors)


def test_create_image_stream_response_file_not_found():
    """A nonexistent path should return None with a file error and no path."""
    errors = ErrorDict()
    response = create_image_stream_response(str(Path("/nonexistent/photo.jpg")), errors)
    assert response is None
    assert "file" in errors
    assert "nonexistent" not in str(errors)


def test_get_full_image_reponse_success(tmp_path):
    """A valid request with an existing image should stream the file."""
    image_path = create_mock_image_file(tmp_path)
    response = get_full_image_reponse({"name": "2025-02-12", "file": "photo.jpg"})
    assert isinstance(response, FileResponse)
    assert response["Content-Type"] == "image/jpeg"
    assert b"".join(response.streaming_content) == image_path.read_bytes()
    assert str(image_path.parent) not in header_text(response)


def test_get_full_image_reponse_for_svg(tmp_path):
    """A saved SVG streams as image/svg+xml."""
    svg_path = create_mock_svg_file(tmp_path)
    response = get_full_image_reponse({"name": "2025-02-12", "file": "logo.svg"})
    assert isinstance(response, FileResponse)
    assert response["Content-Type"] == "image/svg+xml"
    assert b"".join(response.streaming_content) == svg_path.read_bytes()
    assert str(svg_path.parent) not in header_text(response)


def test_get_full_image_reponse_file_not_found(tmp_path):
    """A request for a nonexistent image should return a JSON error."""
    response = get_full_image_reponse({"name": "2025-02-12", "file": "missing.jpg"})
    assert isinstance(response, JsonResponse)
    assert response.status_code == 400
    body = response.content.decode()
    assert "error" in json.loads(body)
    assert str(tmp_path) not in body


def test_get_full_image_reponse_invalid_form():
    """An empty request should return a JSON error from form validation."""
    response = get_full_image_reponse({})
    assert isinstance(response, JsonResponse)
    assert response.status_code == 400
    data = json.loads(response.content)
    assert "error" in data


def test_get_full_image_with_non_date_name_returns_json_error():
    """`name` that is not YYYY-MM-DD must be rejected by the form."""
    response = get_full_image_reponse({"name": "abc", "file": "photo.jpg"})

    assert response.status_code == 400
    assert "error" in json.loads(response.content)


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
