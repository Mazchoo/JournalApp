"""Tests for media path helpers in file_io."""

from pathlib import Path

from main.utils.file_io import (
    extract_date_from_folder,
    get_stored_media_folder,
    get_stored_media_path,
    is_media_content_file,
    path_has_image_reserved_tag,
)


def test_is_media_content_file_accepts_image_video_and_mesh():
    """Image, video, and mesh extensions are media content."""
    assert is_media_content_file(Path("photo.jpg"))
    assert is_media_content_file(Path("photo.PNG"))
    assert is_media_content_file(Path("clip.mp4"))
    assert is_media_content_file(Path("scan.glb"))


def test_is_media_content_file_rejects_other_extensions():
    """Non-media files are not treated as content."""
    assert not is_media_content_file(Path("notes.txt"))
    assert not is_media_content_file(Path("tags.json"))


def test_path_has_image_reserved_tag_requires_image_extension():
    """Reserved tags only apply to files that are images."""
    assert path_has_image_reserved_tag(Path("photo_icon.jpg"))
    assert path_has_image_reserved_tag(Path("clip_resized.jpeg"))
    assert not path_has_image_reserved_tag(Path("scan_icon.glb"))
    assert not path_has_image_reserved_tag(Path("clip_resized.mp4"))
    assert not path_has_image_reserved_tag(Path("photo.jpg"))


def test_extract_date_from_folder():
    """Dated folder path yields day, month, year."""
    folder = Path("/entries/2025/03/01")
    assert extract_date_from_folder(folder) == ("01", "03", "2025")


def test_get_stored_media_folder_returns_none_for_malformed_date():
    """A name that is not year-month-day does not unpack into a folder path."""
    assert get_stored_media_folder("abc") is None
    assert get_stored_media_folder("a-b-c-d") is None


def test_get_stored_media_folder_returns_path_for_date_slug(monkeypatch):
    """A YYYY-MM-DD slug maps onto the dated entry folder."""
    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", "/entries")
    assert get_stored_media_folder("2025-02-12") == "/entries/2025/02/12"


def test_get_stored_media_path_returns_none_for_malformed_date():
    """A malformed date slug yields no file path."""
    assert get_stored_media_path("photo.jpg", "abc") is None
