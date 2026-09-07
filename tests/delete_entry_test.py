"""Tests for the delete_entry AJAX view (URL: /ajax/delete-entry/)."""

import json
from datetime import datetime
from unittest.mock import patch

import pytest

from tests.mocks import create_mock_client, create_mock_entry, create_ajax_headers

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


@pytest.mark.django_db
@patch("main.content_generation.delete_entry.move_files_from_entry")
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
    assert "error" in data


@pytest.mark.django_db
@patch("main.content_generation.delete_entry.move_files_from_entry")
def test_delete_entry_removes_from_db(mock_move_files):
    """A deleted entry should be removed from the database."""
    from main.models import Entry

    client = create_mock_client()

    Entry.objects.create(
        name="2025-04-01",
        date=datetime(2025, 4, 1),
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


def test_move_files_out_of_folder_moves_media_and_deletes_image_tags(
    tmp_path, monkeypatch
):
    """Image, video, and mesh files move back; reserved image tags are deleted."""
    from main.content_generation.delete_entry import move_files_out_of_folder

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))

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

    move_files_out_of_folder([photo, video, mesh, tag, notes])

    assert (tmp_path / "photo.jpg").exists()
    assert (tmp_path / "clip.mp4").exists()
    assert (tmp_path / "scan.glb").exists()
    assert not tag.exists()
    assert notes.exists()
    assert not (tmp_path / "notes.txt").exists()


def test_move_files_out_of_folder_ignores_form_files_and_companions(
    tmp_path, monkeypatch
):
    """Files listed in ignore_file_names stay, including reserved-tag companions."""
    from main.content_generation.delete_entry import move_files_out_of_folder

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))

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
