"""Tests for the move_entry_date AJAX view (URL: /ajax/move-date/)."""

import json
from datetime import datetime
from unittest.mock import patch

import pytest
from django.apps import apps
from django.http import JsonResponse

from main.content_generation.move_date import (
    move_source_date_to_desination_request,
    update_entry_date,
)
from main.content_generation.save_entry import update_or_generate_from_request
from tests.mocks import (
    create_ajax_headers,
    create_mock_client,
    create_mock_entry,
    create_mock_mesh_file,
    mock_jpeg_data_url,
)

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


@pytest.mark.django_db
def test_move_entry_success():
    """Moving an entry to a valid new date should return JSON with the new_date URL."""
    client = create_mock_client()
    create_mock_entry()

    with patch(
        "main.views.move_source_date_to_desination_request",
        return_value=JsonResponse({"new_date": "/edit/2025/March/1"}),
    ):
        response = client.post(
            "/ajax/move-date/",
            data="move_from=2025-02-12&move_to=2025-03-01",
            content_type=FORM_CONTENT_TYPE,
            **create_ajax_headers(),
        )

    data = json.loads(response.content)
    assert "new_date" in data
    assert "/edit/2025/March/1" in data["new_date"]


@pytest.mark.django_db
def test_move_entry_to_existing_date_returns_error():
    """Moving to a date that already has an entry should return an error."""
    client = create_mock_client()

    with patch(
        "main.views.move_source_date_to_desination_request",
        return_value=JsonResponse({"error": "Destination date already exists"}),
    ):
        response = client.post(
            "/ajax/move-date/",
            data="move_from=2025-02-12&move_to=2024-01-10",
            content_type=FORM_CONTENT_TYPE,
            **create_ajax_headers(),
        )

    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_move_entry_from_nonexistent_source_returns_error():
    """Moving from a nonexistent date should return an error."""
    client = create_mock_client()

    with patch(
        "main.views.move_source_date_to_desination_request",
        return_value=JsonResponse({"error": "Source date not found"}),
    ):
        response = client.post(
            "/ajax/move-date/",
            data="move_from=1900-01-01&move_to=2025-03-01",
            content_type=FORM_CONTENT_TYPE,
            **create_ajax_headers(),
        )

    data = json.loads(response.content)
    assert "error" in data


def _mesh_camera_payload() -> dict:
    """Orbit camera fields as the save-entry request sends them."""
    return {
        "right": {"0": "1", "1": "0", "2": "0"},
        "up": {"0": "0", "1": "1", "2": "0"},
        "forward": {"0": "0", "1": "0", "2": "-1"},
        "radius": "3",
        "panX": "0",
        "panY": "0",
    }


@pytest.mark.django_db
def test_move_entry_keeps_mesh_content(tmp_path):
    """A mesh saved at the source date must exist at the destination date."""
    Entry = apps.get_model("main", "Entry")
    EntryMesh = apps.get_model("main", "EntryMesh")
    create_mock_mesh_file(tmp_path)

    update_or_generate_from_request(
        {
            "name": "2025-02-12",
            "content": {
                "mesh1": {
                    "entry": "2025-02-12",
                    "file_path": "scan.glb",
                    "frame_image": mock_jpeg_data_url(),
                    "camera": _mesh_camera_payload(),
                }
            },
        }
    )

    response = move_source_date_to_desination_request(
        {"move_from": "2025-02-12", "move_to": "2025-03-01"}
    )
    data = json.loads(response.content)
    assert "new_date" in data

    moved_entry = Entry.objects.get(name="2025-03-01")
    assert moved_entry.content.count() == 1
    assert not Entry.objects.filter(name="2025-02-12").exists()

    content = moved_entry.content.first()
    assert content is not None
    mesh = EntryMesh.objects.get(pk=content.content_id)
    assert mesh.file_path.endswith("scan.glb")
    assert mesh.image_path.endswith("scan_resized.jpeg")
    assert (tmp_path / "2025" / "03" / "01" / "scan.glb").exists()
    assert (tmp_path / "2025" / "03" / "01" / "scan_resized.jpeg").exists()
    assert (tmp_path / "icons" / "2025" / "03" / "scan_icon.jpg").exists()
    assert not (tmp_path / "icons" / "2025" / "02" / "scan_icon.jpg").exists()
    assert not list(tmp_path.rglob("*_resized_icon*"))
    assert not (tmp_path / "2025" / "02" / "12").exists()


@pytest.mark.django_db
def test_failed_move_restores_only_files_it_moved(tmp_path):
    """A rolled-back date move must not pull files that already lived at dest."""
    Entry = apps.get_model("main", "Entry")
    source = tmp_path / "2025" / "02" / "12"
    dest = tmp_path / "2025" / "03" / "01"
    source.mkdir(parents=True)
    dest.mkdir(parents=True)
    (source / "moved.jpg").write_bytes(b"src")
    (dest / "already.jpg").write_bytes(b"dest")

    create_mock_entry()
    Entry.objects.create(
        name="2025-03-01",
        year=2025,
        month=3,
        day=1,
        first_created=datetime(2025, 3, 1, 10, 0, 0),
        last_edited=datetime(2025, 3, 1, 10, 0, 0),
    )

    errors = {}
    result = update_entry_date("2025-02-12", "2025-03-01", errors)

    assert result is None
    assert errors
    assert Entry.objects.filter(name="2025-02-12").exists()
    assert Entry.objects.filter(name="2025-03-01").exists()
    assert (source / "moved.jpg").read_bytes() == b"src"
    assert (dest / "already.jpg").read_bytes() == b"dest"
    assert not (dest / "moved.jpg").exists()


@pytest.mark.django_db
def test_move_entry_reports_error_when_destination_url_cannot_be_built(monkeypatch):
    """Failing to build the edit URL must not fall back to a generic update error."""
    monkeypatch.setattr(
        "main.content_generation.move_date.move_dated_folder",
        lambda *args, **kwargs: [],
    )
    create_mock_entry()

    with patch(
        "main.content_generation.move_date.convert_date_to_url_tuple",
        return_value=None,
    ):
        response = move_source_date_to_desination_request(
            {"move_from": "2025-02-12", "move_to": "2025-03-01"}
        )

    data = json.loads(response.content)
    assert data == {"error": "Could not convert destination date to an edit URL"}


@pytest.mark.django_db
def test_move_entry_non_ajax_returns_404():
    """A non-AJAX POST to /ajax/move-date/ should return 404."""
    client = create_mock_client()
    response = client.post(
        "/ajax/move-date/",
        data="move_from=2025-02-12&move_to=2025-03-01",
        content_type=FORM_CONTENT_TYPE,
    )
    assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
