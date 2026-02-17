"""Tests for the get_image and get_video AJAX views."""

import io
import json
from unittest.mock import patch

import pytest
from django.http import JsonResponse, FileResponse

from tests.mocks import create_mock_client, create_ajax_headers

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


# --- get_image (URL: /ajax/get-image/) ---


@pytest.mark.django_db
def test_get_image_success():
    """A valid image request should return JSON with a base64-encoded string."""
    mock_b64 = "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    client = create_mock_client()

    with patch(
        "main.views.get_full_image_reponse",
        return_value=JsonResponse({"base64": mock_b64, "errors": {}}, safe=True),
    ):
        response = client.post(
            "/ajax/get-image/",
            data="name=2025-02-12&file=photo.jpg",
            content_type=FORM_CONTENT_TYPE,
            **create_ajax_headers(),
        )

    data = json.loads(response.content)
    assert "base64" in data
    assert data["base64"] == mock_b64


@pytest.mark.django_db
def test_get_image_file_not_found():
    """When the requested image doesn't exist, return a JSON error."""
    client = create_mock_client()

    with patch(
        "main.views.get_full_image_reponse",
        return_value=JsonResponse({"error": {"file": ["File does not exist"]}}),
    ):
        response = client.post(
            "/ajax/get-image/",
            data="name=2025-02-12&file=missing.jpg",
            content_type=FORM_CONTENT_TYPE,
            **create_ajax_headers(),
        )

    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_get_image_non_ajax_returns_404():
    """A non-AJAX request to /ajax/get-image/ should return 404."""
    client = create_mock_client()
    response = client.post(
        "/ajax/get-image/",
        data="name=2025-02-12&file=photo.jpg",
        content_type=FORM_CONTENT_TYPE,
    )
    assert response.status_code == 404


# --- get_video (URL: /ajax/get-video/) ---


@pytest.mark.django_db
def test_get_video_success():
    """A valid video request should return a streaming FileResponse."""
    client = create_mock_client()

    fake_video_bytes = b"\x00\x00\x00\x1cftypisom"
    mock_response = FileResponse(io.BytesIO(fake_video_bytes), content_type="video/mp4")
    mock_response["Accept-Ranges"] = "bytes"
    mock_response["Content-Length"] = len(fake_video_bytes)

    with patch(
        "main.views.get_full_video_response",
        return_value=mock_response,
    ):
        response = client.post(
            "/ajax/get-video/",
            data="name=2025-02-12&file=clip.mp4",
            content_type=FORM_CONTENT_TYPE,
            **create_ajax_headers(),
        )

    assert response.status_code == 200


@pytest.mark.django_db
def test_get_video_not_found():
    """When the video file doesn't exist, a JSON error should be returned."""
    client = create_mock_client()

    with patch(
        "main.views.get_full_video_response",
        return_value=JsonResponse({"error": {"file": ["Video file does not exist"]}}),
    ):
        response = client.post(
            "/ajax/get-video/",
            data="name=2025-02-12&file=missing.mp4",
            content_type=FORM_CONTENT_TYPE,
            **create_ajax_headers(),
        )

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
