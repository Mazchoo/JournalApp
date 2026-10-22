"""Tests for streaming calendar icons."""

from pathlib import Path

import pytest
from django.http import FileResponse, Http404
from PIL import Image

from main.content_generation.get_icon import calendar_icon_response, calendar_icon_url
from main.database_layer.get_year_entry_data import get_icon_for_each_month
from main.models import EntryImage
from tests.mocks import create_mock_client, create_mock_entry


def write_jpeg(path: Path):
    """Write a real JPEG icon."""
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (8, 8), color=(9, 8, 7)).save(path, format="JPEG")


def test_missing_icon_url_is_the_static_image(settings):
    """A missing calendar icon points at the static placeholder."""
    url = calendar_icon_url(Path(settings.MISSING_ICON_IMAGE))
    assert url == "/static/Image/backgrounds/missing_icon.png"


def test_calendar_icon_url_points_at_the_icon_route(tmp_path):
    """An icon URL names the year, month, and file, not the entry folder."""
    icon_path = tmp_path / "icons" / "2025" / "02" / "photo_icon.jpg"
    write_jpeg(icon_path)

    url = calendar_icon_url(icon_path)

    assert url == "/icons/2025/02/photo_icon.jpg"
    assert str(tmp_path) not in url


def test_calendar_icon_response_streams_the_file(tmp_path):
    """A known icon is streamed as image bytes."""
    icon_path = tmp_path / "icons" / "2025" / "02" / "photo_icon.jpg"
    write_jpeg(icon_path)

    response = calendar_icon_response("2025", "02", "photo_icon.jpg")

    assert isinstance(response, FileResponse)
    assert response["Content-Type"] == "image/jpeg"
    assert b"".join(response.streaming_content) == icon_path.read_bytes()
    assert str(tmp_path) not in " ".join(
        str(value) for value in response.headers.values()
    )


def test_calendar_icon_response_rejects_a_path_outside_icons():
    """Parent segments cannot escape the icons directory."""
    with pytest.raises(Http404):
        calendar_icon_response("..", "..", "photo_icon.jpg")


def test_calendar_icon_response_rejects_a_non_icon_name():
    """A file that is not a calendar icon is not served."""
    with pytest.raises(Http404):
        calendar_icon_response("2025", "02", "photo.jpg")


def test_calendar_icon_get_returns_the_file(tmp_path):
    """GET /icons/... returns the icon bytes."""
    icon_path = tmp_path / "icons" / "2025" / "02" / "photo_icon.jpg"
    write_jpeg(icon_path)
    client = create_mock_client()

    response = client.get("/icons/2025/02/photo_icon.jpg")

    assert response.status_code == 200
    assert b"".join(response.streaming_content) == icon_path.read_bytes()
    assert str(tmp_path) not in response.headers["Content-Disposition"]


@pytest.mark.django_db
def test_year_page_icons_are_urls(tmp_path):
    """Month icons on the year page are icon URLs."""
    entry = create_mock_entry()
    image_path = tmp_path / "2025" / "02" / "12" / "photo.jpg"
    write_jpeg(image_path)
    icon_path = tmp_path / "icons" / "2025" / "02" / "photo_icon.jpg"
    write_jpeg(icon_path)
    EntryImage.objects.create(
        entry=entry,
        file_path="2025/02/12/photo.jpg",
        allow_ai_synthesis=False,
    )

    icons = get_icon_for_each_month(2025)

    assert icons["February"] == "/icons/2025/02/photo_icon.jpg"
    assert str(tmp_path) not in icons["February"]
