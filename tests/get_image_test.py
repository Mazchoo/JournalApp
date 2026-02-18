"""Tests for the get_image AJAX view (URL: /ajax/get-image/)."""

import json
from unittest.mock import patch

import pytest
from django.http import JsonResponse

from tests.mocks import create_mock_client, create_ajax_headers

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


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


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
