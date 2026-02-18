"""Tests for get_full_video functions and the video AJAX endpoint."""

import json

import pytest
from django.forms.utils import ErrorDict
from django.http import JsonResponse, FileResponse

from tests.mocks import create_mock_client, create_mock_video_file

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


def test_get_video_mime_type_mp4():
    """mp4 files should return video/mp4 MIME type."""
    from main.content_generation.get_full_video import get_video_mime_type

    assert get_video_mime_type("video.mp4") == "video/mp4"


def test_get_video_mime_type_webm():
    """webm files should return video/webm MIME type."""
    from main.content_generation.get_full_video import get_video_mime_type

    assert get_video_mime_type("video.webm") == "video/webm"


def test_get_video_mime_type_unknown_defaults_to_mp4():
    """Unknown extensions should default to video/mp4."""
    from main.content_generation.get_full_video import get_video_mime_type

    assert get_video_mime_type("video.xyz") == "video/mp4"


def test_get_video_path_from_post_valid(tmp_path, monkeypatch):
    """Valid post data with an existing file should return the path."""
    from main.content_generation.get_full_video import get_video_path_from_post

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    create_mock_video_file(tmp_path)

    errors = ErrorDict()
    result = get_video_path_from_post(
        {"name": "2025-02-12", "file": "clip.mp4"}, errors
    )
    assert result is not None
    assert result.endswith("clip.mp4")
    assert not errors


def test_get_video_path_from_post_missing_fields():
    """Missing form fields should return None with errors."""
    from main.content_generation.get_full_video import get_video_path_from_post

    errors = ErrorDict()
    result = get_video_path_from_post({}, errors)
    assert result is None
    assert errors


def test_create_video_stream_response_success(tmp_path, monkeypatch):
    """An existing video file should return a FileResponse with correct headers."""
    from main.content_generation.get_full_video import create_video_stream_response

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    video_path = create_mock_video_file(tmp_path)

    errors = ErrorDict()
    response = create_video_stream_response(str(video_path), errors)
    assert isinstance(response, FileResponse)
    assert response["Content-Type"] == "video/mp4"
    assert response["Accept-Ranges"] == "bytes"
    assert not errors


def test_create_video_stream_response_file_not_found():
    """A nonexistent path should return None with a file error."""
    from main.content_generation.get_full_video import create_video_stream_response

    errors = ErrorDict()
    response = create_video_stream_response("/nonexistent/video.mp4", errors)
    assert response is None
    assert "file" in errors


def test_get_full_video_response_success(tmp_path, monkeypatch):
    """A valid request with an existing file should return a streaming FileResponse."""
    from main.content_generation.get_full_video import get_full_video_response

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    create_mock_video_file(tmp_path)

    response = get_full_video_response({"name": "2025-02-12", "file": "clip.mp4"})
    assert isinstance(response, FileResponse)
    assert response["Content-Type"] == "video/mp4"


def test_get_full_video_response_file_not_found(tmp_path, monkeypatch):
    """A request for a nonexistent video should return a JSON error."""
    from main.content_generation.get_full_video import get_full_video_response

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    response = get_full_video_response({"name": "2025-02-12", "file": "missing.mp4"})
    assert isinstance(response, JsonResponse)
    data = json.loads(response.content)
    assert "error" in data


def test_get_full_video_response_invalid_form():
    """An empty request should return a JSON error from form validation."""
    from main.content_generation.get_full_video import get_full_video_response

    response = get_full_video_response({})
    assert isinstance(response, JsonResponse)
    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_get_video_non_ajax_returns_404():
    """A normal POST to the video endpoint should return 404."""
    client = create_mock_client()
    response = client.post(
        "/ajax/get-video/",
        data="name=2025-02-12&file=clip.mp4",
        content_type=FORM_CONTENT_TYPE,
    )
    assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
