"""Tests for the delete_entry AJAX view (URL: /ajax/delete-entry/)."""

import json
from datetime import datetime
from unittest.mock import patch

import pytest

from main.content_generation.delete_entry import move_files_out_of_folder
from main.models import Entry
from tests.mocks import create_mock_client, create_mock_entry, create_ajax_headers

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


@pytest.mark.django_db
@patch("main.content_generation.delete_entry.remove_files_from_entry")
def test_delete_entry_success(mock_move_files):
    """Deleting an existing entry should return the success message."""
    client = create_mock_client()
    create_mock_entry()

    response = client.post(
        "/ajax/delete-entry/",
        data="entry=2025-02-12",
        content_type=FORM_CONTENT_TYPE,
        **create_ajax_headers(),
    )

    data = json.loads(response.content)
    assert data["success"] == "It's gone!"


@pytest.mark.django_db
def test_delete_nonexistent_entry_returns_error():
    """Trying to delete a nonexistent entry should return an error."""
    client = create_mock_client()

    response = client.post(
        "/ajax/delete-entry/",
        data="entry=9999-01-01",
        content_type=FORM_CONTENT_TYPE,
        **create_ajax_headers(),
    )

    data = json.loads(response.content)
    assert isinstance(data["error"], str)
    assert "Invalid entry 9999-01-01" in data["error"]


@pytest.mark.django_db
@patch("main.content_generation.delete_entry.remove_files_from_entry")
def test_delete_entry_removes_from_db(mock_move_files):
    """A deleted entry should be removed from the database."""
    client = create_mock_client()

    Entry.objects.create(
        name="2025-04-01",
        year=2025,
        month=4,
        day=1,
        first_created=datetime.now(),
        last_edited=datetime.now(),
    )
    assert Entry.objects.filter(name="2025-04-01").exists()

    client.post(
        "/ajax/delete-entry/",
        data="entry=2025-04-01",
        content_type=FORM_CONTENT_TYPE,
        **create_ajax_headers(),
    )

    assert not Entry.objects.filter(name="2025-04-01").exists()


def test_move_files_out_of_folder_moves_media_and_deletes_image_tags(tmp_path):
    """Image, video, and mesh files move back; reserved image tags are deleted."""
    dated = tmp_path / "2025" / "03" / "01"
    dated.mkdir(parents=True)
    photo = dated / "photo.jpg"
    video = dated / "clip.mp4"
    mesh = dated / "scan.glb"
    tag = dated / "photo_resized.jpg"
    notes = dated / "notes.txt"
    photo.write_bytes(b"img")
    video.write_bytes(b"vid")
    mesh.write_bytes(b"glb")
    tag.write_bytes(b"tag")
    notes.write_text("keep")
    icon_dir = tmp_path / "icons" / "2025" / "03"
    icon_dir.mkdir(parents=True)
    photo_icon = icon_dir / "photo_icon.jpg"
    video_icon = icon_dir / "clip_icon.jpg"
    mesh_icon = icon_dir / "scan_icon.jpg"
    photo_icon.write_bytes(b"icon")
    video_icon.write_bytes(b"icon")
    mesh_icon.write_bytes(b"icon")

    move_files_out_of_folder([photo, video, mesh, tag, notes])

    assert (tmp_path / "photo.jpg").exists()
    assert (tmp_path / "clip.mp4").exists()
    assert (tmp_path / "scan.glb").exists()
    assert not photo_icon.exists()
    assert not video_icon.exists()
    assert not mesh_icon.exists()
    assert not tag.exists()
    assert notes.exists()
    assert not (tmp_path / "notes.txt").exists()


def test_move_files_out_of_folder_ignores_form_files_and_companions(tmp_path):
    """Files listed in ignore_file_names stay, including reserved-tag companions."""
    dated = tmp_path / "2025" / "03" / "01"
    dated.mkdir(parents=True)
    keep = dated / "keep.jpg"
    keep_resized = dated / "keep_resized.jpg"
    drop = dated / "drop.jpg"
    keep.write_bytes(b"keep")
    keep_resized.write_bytes(b"resized")
    drop.write_bytes(b"drop")

    move_files_out_of_folder([keep, keep_resized, drop], ignore_file_names=["keep.jpg"])

    assert keep.exists()
    assert keep_resized.exists()
    assert (tmp_path / "drop.jpg").exists()
    assert not drop.exists()


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
