"""Tests for the save_entry AJAX view (URL: /ajax/save-entry/)."""

import json

import pytest
from django.apps import apps

from tests.mocks import (
    create_ajax_headers,
    create_mock_client,
    create_mock_mesh_file,
    mock_paragraph_post_data,
)

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


@pytest.mark.django_db
def test_save_entry_success():
    """A well-formed save request should return a success JSON response."""
    client = create_mock_client()

    response = client.post(
        "/ajax/save-entry/",
        data=mock_paragraph_post_data("2025-03-01"),
        content_type=FORM_CONTENT_TYPE,
        **create_ajax_headers(),
    )

    data = json.loads(response.content)
    assert "success" in data
    assert data["success"] == "Entry Saved Successfully"


@pytest.mark.django_db
def test_save_entry_with_no_content():
    """When no content is submitted, return a JSON error response."""
    client = create_mock_client()

    response = client.post(
        "/ajax/save-entry/",
        data="name=2025-03-01",
        content_type=FORM_CONTENT_TYPE,
        **create_ajax_headers(),
    )

    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_save_entry_creates_new_entry_in_db():
    """Calling save_entry should create an Entry in the database."""
    Entry = apps.get_model("main", "Entry")
    client = create_mock_client()

    client.post(
        "/ajax/save-entry/",
        data=mock_paragraph_post_data("2025-03-01"),
        content_type=FORM_CONTENT_TYPE,
        **create_ajax_headers(),
    )

    assert Entry.objects.filter(name="2025-03-01").exists()


@pytest.mark.django_db
def test_save_entry_creates_paragraph_content():
    """Saving an entry with paragraph data should create the paragraph and content records."""
    Entry = apps.get_model("main", "Entry")
    EntryParagraph = apps.get_model("main", "EntryParagraph")
    client = create_mock_client()

    client.post(
        "/ajax/save-entry/",
        data=mock_paragraph_post_data(
            "2025-03-01", text="<p>Test paragraph</p>", height=300
        ),
        content_type=FORM_CONTENT_TYPE,
        **create_ajax_headers(),
    )

    entry = Entry.objects.get(name="2025-03-01")
    assert entry.content.count() == 1

    content = entry.content.first()
    assert content is not None
    assert content.content_type == "paragraph"

    paragraph = EntryParagraph.objects.get(pk=content.content_id)
    assert paragraph.text == "<p>Test paragraph</p>"
    assert paragraph.height == 300


@pytest.mark.django_db
def test_save_entry_replaces_existing_content():
    """Saving an entry that already exists should replace its content."""
    Entry = apps.get_model("main", "Entry")
    EntryParagraph = apps.get_model("main", "EntryParagraph")
    client = create_mock_client()
    headers = create_ajax_headers()

    # First save
    client.post(
        "/ajax/save-entry/",
        data=mock_paragraph_post_data("2025-03-01", text="<p>Original</p>"),
        content_type=FORM_CONTENT_TYPE,
        **headers,
    )

    # Second save with different content
    client.post(
        "/ajax/save-entry/",
        data=mock_paragraph_post_data("2025-03-01", text="<p>Updated</p>"),
        content_type=FORM_CONTENT_TYPE,
        **headers,
    )

    entry = Entry.objects.get(name="2025-03-01")
    assert entry.content.count() == 1

    content = entry.content.first()
    assert content is not None
    paragraph = EntryParagraph.objects.get(pk=content.content_id)
    assert paragraph.text == "<p>Updated</p>"


@pytest.mark.django_db
def test_save_entry_creates_mesh_content(tmp_path, monkeypatch):
    """Saving an entry with mesh data should move the glb and store the preview."""
    from main.content_generation.save_entry import update_or_generate_from_request
    from tests.mocks import mock_jpeg_data_url

    Entry = apps.get_model("main", "Entry")
    EntryMesh = apps.get_model("main", "EntryMesh")
    Camera = apps.get_model("main", "Camera")

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))
    create_mock_mesh_file(tmp_path)

    response = update_or_generate_from_request(
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

    data = json.loads(response.content)
    assert "success" in data

    entry = Entry.objects.get(name="2025-03-01")
    assert entry.content.count() == 1

    content = entry.content.first()
    assert content is not None
    assert content.content_type == "mesh"

    mesh = EntryMesh.objects.get(pk=content.content_id)
    assert mesh.file_path.endswith("scan.glb")
    assert mesh.image_path.endswith("scan_resized.jpeg")
    assert (tmp_path / "2025" / "03" / "01" / "scan.glb").exists()
    assert (tmp_path / "2025" / "03" / "01" / "scan_resized.jpeg").exists()
    assert (tmp_path / "icons" / "2025" / "03" / "scan_icon.jpg").exists()
    assert Camera.objects.filter(pk=mesh.camera_id).exists()
    assert mesh.camera.radius == 3.0

    from main.content_generation.get_downsized_mesh_image import (
        get_downsized_mesh_image_response,
    )

    preview = get_downsized_mesh_image_response({"mesh_id": str(mesh.pk)})
    preview_data = json.loads(preview.content)
    assert preview_data["base64"].startswith("data:image/jpeg;base64,")


@pytest.mark.django_db
def test_save_entry_mesh_missing_glb_returns_error(tmp_path, monkeypatch):
    """A mesh save without the glb on disk should return a content error."""
    from main.content_generation.save_entry import update_or_generate_from_request
    from tests.mocks import mock_jpeg_data_url

    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(tmp_path))

    response = update_or_generate_from_request(
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

    data = json.loads(response.content)
    assert "error" in data


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
