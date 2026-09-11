"""Tests for the delete_entry AJAX view (URL: /ajax/delete-entry/)."""

import json
from datetime import datetime
from unittest.mock import patch

import pytest

from main.content_generation.delete_entry import (
    delete_entry_and_content,
    move_files_out_of_folder,
)
from main.content_generation.save_entry import update_or_generate_from_request
from main.models import Camera, Entry
from tests.mocks import (
    MINIMAL_SVG,
    create_ajax_headers,
    create_mock_client,
    create_mock_entry,
    create_mock_mesh_file,
    mock_jpeg_data_url,
)

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


@pytest.mark.django_db
def test_deleting_mesh_entry_removes_its_camera(tmp_path):
    """No Camera rows should survive the deletion of the only mesh."""
    create_mock_mesh_file(tmp_path)

    update_or_generate_from_request(
        {
            "name": "2025-03-01",
            "content": {
                "mesh1": {
                    "entry": "2025-03-01",
                    "file_path": "scan.glb",
                    "frame_image": mock_jpeg_data_url(),
                    "camera": {
                        "right": {"0": "1", "1": "0", "2": "0"},
                        "up": {"0": "0", "1": "1", "2": "0"},
                        "forward": {"0": "0", "1": "0", "2": "-1"},
                        "radius": "3",
                        "panX": "0",
                        "panY": "0",
                    },
                }
            },
        }
    )

    delete_entry_and_content({"entry": "2025-03-01"})

    assert Camera.objects.count() == 0


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


@pytest.mark.django_db
def test_delete_entry_moves_svg_back_and_removes_icon(tmp_path):
    """Deleting an entry with an SVG restores the original and removes its PNG icon."""
    (tmp_path / "logo.svg").write_text(MINIMAL_SVG, encoding="utf-8")
    update_or_generate_from_request(
        {
            "name": "2025-03-01",
            "content": {
                "image1": {
                    "entry": "2025-03-01",
                    "file_path": "logo.svg",
                    "allow_ai_synthesis": 0,
                }
            },
        }
    )

    dated = tmp_path / "2025" / "03" / "01" / "logo.svg"
    icon = tmp_path / "icons" / "2025" / "03" / "logo_icon.png"
    assert dated.exists()
    assert icon.exists()

    delete_entry_and_content({"entry": "2025-03-01"})

    assert (tmp_path / "logo.svg").exists()
    assert not dated.exists()
    assert not icon.exists()


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
