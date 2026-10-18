"""Tests for the save_entry AJAX view (URL: /ajax/save-entry/)."""

import json

import pytest
from django.apps import apps
from django.forms.utils import ErrorList

from main.content_generation.load_entry import load_all_content_from_entry
from main.content_generation.save_entry import update_or_generate_from_request
from main.forms import ContentForm
from tests.mocks import (
    MINIMAL_SVG,
    create_ajax_headers,
    create_mock_client,
    create_mock_mesh_file,
    mock_jpeg_data_url,
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
def test_save_entry_stores_content_order():
    """Submitted content order is stored on the link and used when the entry is loaded."""
    response = update_or_generate_from_request(
        {
            "name": "2025-03-01",
            "content": {
                "paragraph1": {
                    "entry": "2025-03-01",
                    "text": "<p>First</p>",
                    "height": 100,
                    "allow_ai_synthesis": 1,
                },
                "paragraph2": {
                    "entry": "2025-03-01",
                    "text": "<p>Second</p>",
                    "height": 100,
                    "allow_ai_synthesis": 1,
                },
            },
        }
    )
    assert "success" in json.loads(response.content)

    EntryContent = apps.get_model("main", "EntryContent")
    positions = list(
        EntryContent.objects.filter(entry_id="2025-03-01")
        .order_by("position")
        .values_list("position", flat=True)
    )
    assert positions == [0, 1]

    loaded = load_all_content_from_entry("2025-03-01")
    assert [item["data"]["text"] for item in loaded["content_list"]] == [
        "<p>First</p>",
        "<p>Second</p>",
    ]


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
def test_failed_content_form_rolls_back_saved_siblings(monkeypatch):
    """One invalid content link must not leave the other saved rows behind."""
    EntryParagraph = apps.get_model("main", "EntryParagraph")
    Content = apps.get_model("main", "Content")
    real_is_valid = ContentForm.is_valid
    calls = {"count": 0}

    def fail_second(self):
        calls["count"] += 1
        if calls["count"] == 2:
            self.add_error(None, "content link rejected")
            return False
        return real_is_valid(self)

    monkeypatch.setattr(ContentForm, "is_valid", fail_second)

    response = update_or_generate_from_request(
        {
            "name": "2025-03-01",
            "content": {
                "paragraph1": {
                    "entry": "2025-03-01",
                    "text": "<p>First</p>",
                    "height": 200,
                    "allow_ai_synthesis": 1,
                },
                "paragraph2": {
                    "entry": "2025-03-01",
                    "text": "<p>Second</p>",
                    "height": 200,
                    "allow_ai_synthesis": 1,
                },
            },
        }
    )

    data = json.loads(response.content)
    assert "error" in data
    assert EntryParagraph.objects.count() == 0
    assert Content.objects.count() == 0


def _paragraph_save(text="<p>Original</p>", height=200):
    """One paragraph save. Omit height by passing None."""
    paragraph = {"entry": "2025-03-01", "text": text, "allow_ai_synthesis": 1}
    if height is not None:
        paragraph["height"] = height
    return {"name": "2025-03-01", "content": {"paragraph1": paragraph}}


def _assert_stored_paragraph(text="<p>Original</p>"):
    """The entry still has exactly the paragraph from the first save."""
    Entry = apps.get_model("main", "Entry")
    EntryParagraph = apps.get_model("main", "EntryParagraph")
    entry = Entry.objects.get(name="2025-03-01")
    assert entry.content.count() == 1
    assert EntryParagraph.objects.count() == 1
    stored = EntryParagraph.objects.get(pk=entry.content.get().content_id)
    assert stored.text == text


def _reject_entry(name, errors):
    errors["entry"] = ErrorList(["rejected"])
    return None


def _reject_content_link(self):
    self.add_error(None, "rejected")
    return False


def _raise_parse(content_type):
    raise RuntimeError("parse failed")


@pytest.mark.django_db
@pytest.mark.parametrize(
    "second_save",
    [_paragraph_save(height=None), {"name": "2025-03-01"}],
    ids=["invalid_content", "invalid_form"],
)
def test_rejected_save_keeps_previous_content(second_save):
    """A save rejected before any write leaves the stored paragraph in place."""
    update_or_generate_from_request(_paragraph_save())
    response = update_or_generate_from_request(second_save)
    assert "error" in json.loads(response.content)
    _assert_stored_paragraph()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "target, replacement",
    [
        ("main.content_generation.save_entry.create_or_get_entry", _reject_entry),
        ("main.forms.ContentForm.is_valid", _reject_content_link),
        (
            "main.content_generation.content_factory_forms.ContentFormFactory.get",
            _raise_parse,
        ),
    ],
    ids=["entry_create", "content_link", "content_parse"],
)
def test_failed_save_step_keeps_previous_content(monkeypatch, target, replacement):
    """A failure while resolving the entry or writing new rows keeps the stored paragraph."""
    update_or_generate_from_request(_paragraph_save())
    monkeypatch.setattr(target, replacement)
    response = update_or_generate_from_request(_paragraph_save("<p>Updated</p>"))
    assert "error" in json.loads(response.content)
    _assert_stored_paragraph()


@pytest.mark.django_db
def test_content_save_error_keeps_previous_content(monkeypatch):
    """A database error while writing new content leaves the stored paragraph in place."""
    update_or_generate_from_request(_paragraph_save())

    def fail_save(self, commit=True):
        raise RuntimeError("write failed")

    monkeypatch.setattr("main.forms.ParagraphForm.save", fail_save)
    with pytest.raises(RuntimeError):
        update_or_generate_from_request(_paragraph_save("<p>Updated</p>"))
    _assert_stored_paragraph()


@pytest.mark.django_db
def test_save_entry_creates_mesh_content(tmp_path):
    """Saving an entry with mesh data should move the glb and store the preview."""
    from main.content_generation.save_entry import update_or_generate_from_request
    from tests.mocks import mock_jpeg_data_url

    Entry = apps.get_model("main", "Entry")
    EntryMesh = apps.get_model("main", "EntryMesh")
    Camera = apps.get_model("main", "Camera")

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
    assert Camera.objects.filter(pk=mesh.camera.pk).exists()
    assert mesh.camera.radius == 3.0

    from main.content_generation.get_downsized_mesh_image import (
        get_downsized_mesh_image_response,
    )

    preview = get_downsized_mesh_image_response({"mesh_id": str(mesh.pk)})
    preview_data = json.loads(preview.content)
    assert preview_data["base64"].startswith("data:image/jpeg;base64,")


def _mesh_camera_payload(radius: str = "3") -> dict:
    """Orbit camera fields as the save-entry request sends them."""
    return {
        "right": {"0": "1", "1": "0", "2": "0"},
        "up": {"0": "0", "1": "1", "2": "0"},
        "forward": {"0": "0", "1": "0", "2": "-1"},
        "radius": radius,
        "panX": "0",
        "panY": "0",
    }


@pytest.mark.django_db
def test_save_entry_mesh_without_frame_keeps_preview_and_icon(tmp_path):
    """A later save that omits frame_image should update the camera only."""
    from main.content_generation.save_entry import update_or_generate_from_request
    from tests.mocks import mock_jpeg_data_url

    Entry = apps.get_model("main", "Entry")
    EntryMesh = apps.get_model("main", "EntryMesh")
    Camera = apps.get_model("main", "Camera")

    create_mock_mesh_file(tmp_path)

    first = update_or_generate_from_request(
        {
            "name": "2025-03-01",
            "content": {
                "mesh1": {
                    "entry": "2025-03-01",
                    "file_path": "scan.glb",
                    "frame_image": mock_jpeg_data_url((255, 0, 0)),
                    "camera": _mesh_camera_payload("3"),
                }
            },
        }
    )
    assert "success" in json.loads(first.content)

    preview_path = tmp_path / "2025" / "03" / "01" / "scan_resized.jpeg"
    icon_path = tmp_path / "icons" / "2025" / "03" / "scan_icon.jpg"
    preview_bytes = preview_path.read_bytes()
    icon_bytes = icon_path.read_bytes()

    second = update_or_generate_from_request(
        {
            "name": "2025-03-01",
            "content": {
                "mesh1": {
                    "entry": "2025-03-01",
                    "file_path": "scan.glb",
                    "camera": _mesh_camera_payload("8"),
                }
            },
        }
    )
    assert "success" in json.loads(second.content)

    entry = Entry.objects.get(name="2025-03-01")
    mesh = EntryMesh.objects.get(pk=entry.content.first().content_id)
    assert mesh.camera.radius == 8.0
    assert preview_path.read_bytes() == preview_bytes
    assert icon_path.read_bytes() == icon_bytes
    assert not list(tmp_path.rglob("*_resized_icon*"))
    assert Camera.objects.filter(pk=mesh.camera.pk).exists()


@pytest.mark.django_db
def test_save_entry_mesh_does_not_leak_cameras_on_resave(tmp_path):
    """Replacing a mesh on save must not leave the previous Camera behind."""
    create_mock_mesh_file(tmp_path)
    payload = {
        "name": "2025-03-01",
        "content": {
            "mesh1": {
                "entry": "2025-03-01",
                "file_path": "scan.glb",
                "frame_image": mock_jpeg_data_url(),
                "camera": _mesh_camera_payload("3"),
            }
        },
    }

    assert "success" in json.loads(update_or_generate_from_request(payload).content)
    assert "success" in json.loads(update_or_generate_from_request(payload).content)

    Camera = apps.get_model("main", "Camera")
    assert Camera.objects.count() == 1


@pytest.mark.django_db
def test_save_entry_mesh_without_frame_or_preview_returns_error(tmp_path):
    """A new mesh with no frame_image and no stored preview should fail."""
    from main.content_generation.save_entry import update_or_generate_from_request

    create_mock_mesh_file(tmp_path)

    response = update_or_generate_from_request(
        {
            "name": "2025-03-01",
            "content": {
                "mesh1": {
                    "entry": "2025-03-01",
                    "file_path": "scan.glb",
                    "camera": _mesh_camera_payload(),
                }
            },
        }
    )

    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_save_entry_mesh_missing_glb_returns_error(tmp_path):
    """A mesh save without the glb on disk should return a content error."""
    from main.content_generation.save_entry import update_or_generate_from_request
    from tests.mocks import mock_jpeg_data_url

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


def _write_jpeg(path, color=(10, 20, 30)):
    """Write a small JPEG so ImageForm can build an icon."""
    from PIL import Image

    Image.new("RGB", (32, 32), color=color).save(path, format="JPEG")


@pytest.mark.django_db
def test_save_entry_moves_removed_media_back_to_entry_folder(tmp_path):
    """Media no longer in the form should return to the base entry folder."""
    from main.content_generation.save_entry import update_or_generate_from_request

    _write_jpeg(tmp_path / "keep.jpg", (255, 0, 0))
    _write_jpeg(tmp_path / "drop.jpg", (0, 255, 0))

    first = update_or_generate_from_request(
        {
            "name": "2025-03-01",
            "content": {
                "image1": {
                    "entry": "2025-03-01",
                    "file_path": "keep.jpg",
                    "allow_ai_synthesis": 0,
                },
                "image2": {
                    "entry": "2025-03-01",
                    "file_path": "drop.jpg",
                    "allow_ai_synthesis": 0,
                },
            },
        }
    )
    assert "success" in json.loads(first.content)

    dated = tmp_path / "2025" / "03" / "01"
    assert (dated / "keep.jpg").exists()
    assert (dated / "drop.jpg").exists()

    second = update_or_generate_from_request(
        {
            "name": "2025-03-01",
            "content": {
                "image1": {
                    "entry": "2025-03-01",
                    "file_path": "keep.jpg",
                    "allow_ai_synthesis": 0,
                }
            },
        }
    )
    assert "success" in json.loads(second.content)

    assert (dated / "keep.jpg").exists()
    assert not (dated / "drop.jpg").exists()
    assert (tmp_path / "drop.jpg").exists()


@pytest.mark.django_db
def test_save_entry_creates_svg_image_content(tmp_path):
    """Saving an SVG moves the original, writes a PNG icon, and skips _resized."""
    Entry = apps.get_model("main", "Entry")
    EntryImage = apps.get_model("main", "EntryImage")

    (tmp_path / "logo.svg").write_text(MINIMAL_SVG, encoding="utf-8")

    response = update_or_generate_from_request(
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

    data = json.loads(response.content)
    assert "success" in data

    entry = Entry.objects.get(name="2025-03-01")
    assert entry.content.count() == 1

    content = entry.content.first()
    assert content is not None
    assert content.content_type == "image"

    image = EntryImage.objects.get(pk=content.content_id)
    assert image.file_path.endswith("logo.svg")

    dated = tmp_path / "2025" / "03" / "01"
    assert (dated / "logo.svg").exists()
    assert not (dated / "logo_resized.svg").exists()
    assert (tmp_path / "icons" / "2025" / "03" / "logo_icon.png").exists()


@pytest.mark.django_db
def test_save_entry_succeeds_when_svg_cannot_be_rasterised(tmp_path):
    """An SVG svglib cannot render still saves; it just has no calendar icon."""
    (tmp_path / "logo.svg").write_text("this is not svg", encoding="utf-8")

    response = update_or_generate_from_request(
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

    assert "success" in json.loads(response.content)
    assert (tmp_path / "2025" / "03" / "01" / "logo.svg").exists()
    assert not (tmp_path / "icons" / "2025" / "03" / "logo_icon.png").exists()


@pytest.mark.django_db
def test_save_entry_rejects_resized_svg_reserved_suffix(tmp_path):
    """logo_resized.svg is a reserved image suffix, even though it is a vector file."""
    (tmp_path / "logo_resized.svg").write_text(MINIMAL_SVG, encoding="utf-8")

    response = update_or_generate_from_request(
        {
            "name": "2025-03-01",
            "content": {
                "image1": {
                    "entry": "2025-03-01",
                    "file_path": "logo_resized.svg",
                    "allow_ai_synthesis": 0,
                }
            },
        }
    )

    assert "error" in json.loads(response.content)


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
