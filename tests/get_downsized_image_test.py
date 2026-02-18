"""Tests for get_downsized_image endpoint."""

import json
from unittest.mock import patch

import pytest
from django.http import JsonResponse

from tests.mocks import create_mock_client, create_mock_entry

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


@pytest.mark.django_db
def test_get_downsized_image_success(tmp_path, monkeypatch):
    """A valid image_id should return a base64 JSON response."""
    from main.models import EntryImage
    from main.content_generation.get_downsized_image import get_downsized_image_response

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    entry = create_mock_entry()
    img = EntryImage.objects.create(
        entry=entry,
        file_path="2025/02/12/photo.jpg",
        original=True,
    )

    with patch(
        "main.content_generation.get_downsized_image.fetch_base64_image_data",
        return_value="data:image/jpeg;base64,mockdata",
    ):
        response = get_downsized_image_response({"image_id": str(img.pk)})

    assert isinstance(response, JsonResponse)
    data = json.loads(response.content)
    assert "base64" in data
    assert data["base64"] == "data:image/jpeg;base64,mockdata"


@pytest.mark.django_db
def test_get_downsized_image_missing_id():
    """A request without image_id should return an error."""
    from main.content_generation.get_downsized_image import get_downsized_image_response

    response = get_downsized_image_response({})
    assert isinstance(response, JsonResponse)
    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_get_downsized_image_not_found():
    """A request with a nonexistent image_id should return an error."""
    from main.content_generation.get_downsized_image import get_downsized_image_response

    response = get_downsized_image_response({"image_id": "99999"})
    assert isinstance(response, JsonResponse)
    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_get_downsized_image_non_ajax_returns_404():
    """A normal POST to the downsized image endpoint should return 404."""
    client = create_mock_client()
    response = client.post(
        "/ajax/get-downsized-image/",
        data="image_id=1",
        content_type=FORM_CONTENT_TYPE,
    )
    assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
