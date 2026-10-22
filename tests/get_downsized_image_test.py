"""Tests for get_downsized_image endpoint."""

import json
from pathlib import Path

import pytest
from django.http import FileResponse, JsonResponse
from PIL import Image

from main.content_generation.get_downsized_image import get_downsized_image_response
from main.models import EntryImage
from tests.mocks import create_mock_client, create_mock_entry

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


def write_jpeg(path: Path, size: tuple[int, int]):
    """Write a real JPEG the preview helper can open."""
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", size, color=(10, 20, 30)).save(path, format="JPEG")


def header_text(response: FileResponse) -> str:
    """Join header values so tests can check that a folder path was not sent."""
    return " ".join(str(value) for value in response.headers.values())


@pytest.mark.django_db
def test_get_downsized_image_streams_small_original(tmp_path):
    """An image already small enough to preview is streamed as itself."""
    entry = create_mock_entry()
    relative = Path("2025/02/12/photo.jpg")
    image_path = tmp_path / relative
    write_jpeg(image_path, (32, 24))
    img = EntryImage.objects.create(
        entry=entry,
        file_path=relative.as_posix(),
        allow_ai_synthesis=True,
    )

    response = get_downsized_image_response({"image_id": str(img.pk)})

    assert isinstance(response, FileResponse)
    assert response.status_code == 200
    assert response["Content-Type"] == "image/jpeg"
    assert response["Accept-Ranges"] == "bytes"
    assert b"".join(response.streaming_content) == image_path.read_bytes()
    assert str(tmp_path) not in header_text(response)
    assert not (image_path.parent / "photo_resized.jpg").exists()


@pytest.mark.django_db
def test_get_downsized_image_streams_resized_preview(tmp_path):
    """A large image is streamed from the resized preview, not the original."""
    entry = create_mock_entry()
    relative = Path("2025/02/12/wide.jpg")
    image_path = tmp_path / relative
    write_jpeg(image_path, (2048, 16))
    original = image_path.read_bytes()
    img = EntryImage.objects.create(
        entry=entry,
        file_path=relative.as_posix(),
        allow_ai_synthesis=True,
    )

    response = get_downsized_image_response({"image_id": str(img.pk)})
    resized_path = image_path.parent / "wide_resized.jpg"

    assert isinstance(response, FileResponse)
    assert response["Content-Type"] == "image/jpeg"
    streamed = b"".join(response.streaming_content)
    assert resized_path.exists()
    assert streamed == resized_path.read_bytes()
    assert streamed != original
    assert str(tmp_path) not in header_text(response)


@pytest.mark.django_db
def test_get_downsized_image_missing_id():
    """A request without image_id should return an error."""
    response = get_downsized_image_response({})
    assert isinstance(response, JsonResponse)
    assert response.status_code == 400
    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_get_downsized_image_not_found():
    """A request with a nonexistent image_id should return an error."""
    response = get_downsized_image_response({"image_id": "99999"})
    assert isinstance(response, JsonResponse)
    assert response.status_code == 400
    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_get_downsized_image_missing_file_omits_entry_folder(tmp_path):
    """A saved image whose file is gone returns JSON without the entry folder."""
    entry = create_mock_entry()
    img = EntryImage.objects.create(
        entry=entry,
        file_path="2025/02/12/missing.jpg",
        allow_ai_synthesis=True,
    )

    response = get_downsized_image_response({"image_id": str(img.pk)})

    assert isinstance(response, JsonResponse)
    assert response.status_code == 400
    body = response.content.decode()
    assert "error" in json.loads(body)
    assert str(tmp_path) not in body


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
