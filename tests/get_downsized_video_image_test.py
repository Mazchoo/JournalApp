"""Tests for the downsized video collage endpoint."""

import json
from pathlib import Path

import pytest
from django.http import FileResponse, JsonResponse
from PIL import Image

from main.content_generation.get_downsized_video_image import (
    get_downsized_video_image_response,
)
from main.models import EntryVideo
from tests.mocks import create_mock_entry, create_mock_video_file


def write_jpeg(path: Path):
    """Write a real JPEG standing in for an existing collage."""
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (8, 8), color=(1, 2, 3)).save(path, format="JPEG")


@pytest.mark.django_db
def test_get_downsized_video_image_streams_existing_collage(tmp_path):
    """An existing collage file is streamed without being base64-encoded."""
    entry = create_mock_entry()
    video_path = create_mock_video_file(tmp_path)
    collage_path = video_path.with_name("clip_resized.jpeg")
    write_jpeg(collage_path)
    icon_path = tmp_path / "icons" / "2025" / "02" / "clip_icon.jpg"
    write_jpeg(icon_path)
    video = EntryVideo.objects.create(
        entry=entry,
        file_path="2025/02/12/clip.mp4",
        allow_ai_synthesis=False,
    )

    response = get_downsized_video_image_response({"video_id": str(video.pk)})

    assert isinstance(response, FileResponse)
    assert response["Content-Type"] == "image/jpeg"
    assert b"".join(response.streaming_content) == collage_path.read_bytes()
    assert str(tmp_path) not in " ".join(
        str(value) for value in response.headers.values()
    )


@pytest.mark.django_db
def test_get_downsized_video_image_missing_id():
    """A request without video_id should return an error."""
    response = get_downsized_video_image_response({})
    assert isinstance(response, JsonResponse)
    assert response.status_code == 400
    assert "error" in json.loads(response.content)
