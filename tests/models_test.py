"""Tests for Entry, Content, EntryParagraph, EntryImage, EntryVideo, and EntryMesh models."""

from datetime import datetime

import pytest

from main.models import (
    Camera,
    Content,
    Entry,
    EntryImage,
    EntryMesh,
    EntryParagraph,
    EntryVideo,
)
from tests.mocks import create_mock_entry


def _create_mesh_with_camera(
    entry=None,
    file_path="2025-02-12/scan.glb",
    image_path="2025-02-12/scan.jpg",
    **camera_fields,
):
    """Persist an EntryMesh and the Camera that points at it."""
    entry = entry or create_mock_entry()
    mesh = EntryMesh.objects.create(
        entry=entry,
        file_path=file_path,
        image_path=image_path,
    )
    camera = Camera.objects.create(mesh=mesh, **camera_fields)
    return mesh, camera


@pytest.mark.django_db
def test_create_entry():
    """Creating an Entry should persist it in the database."""
    entry = Entry.objects.create(
        name="2025-06-15",
        year=2025,
        month=6,
        day=15,
        first_created=datetime(2025, 6, 15),
        last_edited=datetime(2025, 6, 15),
    )
    assert Entry.objects.filter(name="2025-06-15").exists()
    assert entry.pk == "2025-06-15"
    assert entry.year == 2025
    assert entry.month == 6
    assert entry.day == 15


@pytest.mark.django_db
def test_entry_content_many_to_many():
    """An Entry can have multiple Content objects linked via M2M."""
    entry = create_mock_entry()

    c1 = Content.objects.create(content_type="paragraph", content_id=1)
    c2 = Content.objects.create(content_type="image", content_id=2)

    entry.content.add(c1, c2)

    assert entry.content.count() == 2


@pytest.mark.django_db
def test_create_content():
    """A Content record stores a content_type and content_id."""
    content = Content.objects.create(content_type="paragraph", content_id=42)
    assert content.content_type == "paragraph"
    assert content.content_id == 42


@pytest.mark.django_db
def test_content_str():
    """__str__ should combine content_type and content_id."""
    content = Content.objects.create(content_type="image", content_id=7)
    assert str(content) == "image7"


@pytest.mark.django_db
def test_create_paragraph():
    """EntryParagraph stores HTML text and a height tied to an Entry."""
    entry = create_mock_entry()
    para = EntryParagraph.objects.create(
        entry=entry,
        text="<p>Test paragraph</p>",
        height=150,
        allow_ai_synthesis=False,
    )
    assert para.text == "<p>Test paragraph</p>"
    assert para.height == 150
    assert para.entry == entry
    assert para.allow_ai_synthesis is False


@pytest.mark.django_db
def test_paragraph_view_method():
    """view() should return a dict with text and height keys."""
    entry = create_mock_entry()
    para = EntryParagraph.objects.create(
        entry=entry,
        text="<h1>Title</h1>",
        height=300,
        allow_ai_synthesis=True,
    )
    result = para.view()

    assert result == {
        "text": "<h1>Title</h1>",
        "height": 300,
        "allow_ai_synthesis": 1,
        "raw_html": 0,
    }


@pytest.mark.django_db
def test_paragraph_str():
    """__str__ should return the raw text content."""
    entry = create_mock_entry()
    para = EntryParagraph.objects.create(
        entry=entry,
        text="Hello",
        height=100,
        allow_ai_synthesis=True,
    )
    assert str(para) == "Hello"


@pytest.mark.django_db
def test_create_image():
    """EntryImage stores a file_path and original flag tied to an Entry."""
    entry = create_mock_entry()
    img = EntryImage.objects.create(
        entry=entry,
        file_path="2025-02-12/photo.jpg",
        allow_ai_synthesis=True,
    )
    assert img.file_path == "2025-02-12/photo.jpg"
    assert img.allow_ai_synthesis is True


@pytest.mark.django_db
def test_image_str():
    """__str__ should return the file_path."""
    entry = create_mock_entry()
    img = EntryImage.objects.create(
        entry=entry,
        file_path="some/path.jpg",
        allow_ai_synthesis=False,
    )
    assert str(img) == "some/path.jpg"


@pytest.mark.django_db
def test_image_view_method():
    """view() should return image_id, file_name, and original flag for async loading."""
    entry = create_mock_entry()
    img = EntryImage.objects.create(
        entry=entry,
        file_path="2025-02-12/photo.jpg",
        allow_ai_synthesis=True,
    )

    result = img.view()

    assert result["image_id"] == img.pk
    assert result["file_name"] == "photo.jpg"
    assert result["allow_ai_synthesis"] == 1


@pytest.mark.django_db
def test_image_view_non_original():
    """When allow_ai_synthesis=False, view() dict should have original=0."""
    entry = create_mock_entry()
    img = EntryImage.objects.create(
        entry=entry,
        file_path="2025-02-12/resized.jpg",
        allow_ai_synthesis=False,
    )

    result = img.view()

    assert result["allow_ai_synthesis"] == 0


@pytest.mark.django_db
def test_create_video():
    """EntryVideo stores a file_path and original flag."""
    entry = create_mock_entry()
    vid = EntryVideo.objects.create(
        entry=entry,
        file_path="2025-02-12/clip.mp4",
        allow_ai_synthesis=True,
    )
    assert vid.file_path == "2025-02-12/clip.mp4"
    assert vid.allow_ai_synthesis is True


@pytest.mark.django_db
def test_video_view_method():
    """view() should return video_id, file_name, and original flag for async loading."""
    entry = create_mock_entry()
    vid = EntryVideo.objects.create(
        entry=entry,
        file_path="2025-02-12/clip.mp4",
        allow_ai_synthesis=True,
    )

    result = vid.view()

    assert result["video_id"] == vid.pk
    assert result["file_name"] == "clip.mp4"
    assert result["allow_ai_synthesis"] == 1


@pytest.mark.django_db
def test_orbit_camera_view_method():
    """view() should match the frontend OrbitCamera field names."""
    _, camera = _create_mesh_with_camera(
        right_x=0.0,
        right_y=1.0,
        right_z=0.0,
        up_x=0.0,
        up_y=0.0,
        up_z=1.0,
        forward_x=-1.0,
        forward_y=0.0,
        forward_z=0.0,
        radius=5.0,
        pan_x=1.25,
        pan_y=-0.5,
    )

    assert camera.view() == {
        "right": [0.0, 1.0, 0.0],
        "up": [0.0, 0.0, 1.0],
        "forward": [-1.0, 0.0, 0.0],
        "radius": 5.0,
        "panX": 1.25,
        "panY": -0.5,
    }


@pytest.mark.django_db
def test_create_orbit_camera_defaults():
    """OrbitCamera defaults match frontend createOrbitCamera()."""
    _, camera = _create_mesh_with_camera()
    assert camera.right_x == 1.0
    assert camera.right_y == 0.0
    assert camera.right_z == 0.0
    assert camera.up_x == 0.0
    assert camera.up_y == 1.0
    assert camera.up_z == 0.0
    assert camera.forward_x == 0.0
    assert camera.forward_y == 0.0
    assert camera.forward_z == -1.0
    assert camera.radius == 3.0
    assert camera.pan_x == 0.0
    assert camera.pan_y == 0.0


@pytest.mark.django_db
def test_create_mesh():
    """EntryMesh stores file_path, image_path, and a camera tied to an Entry."""
    entry = create_mock_entry()
    mesh, camera = _create_mesh_with_camera(entry, radius=4.5, pan_x=0.2, pan_y=-0.1)
    assert mesh.file_path == "2025-02-12/scan.glb"
    assert mesh.image_path == "2025-02-12/scan.jpg"
    assert mesh.camera == camera
    assert camera.mesh == mesh
    assert mesh.entry == entry


@pytest.mark.django_db
def test_deleting_mesh_cascades_to_camera():
    """Deleting an EntryMesh must delete the Camera that points at it."""
    mesh, camera = _create_mesh_with_camera()
    camera_pk = camera.pk
    mesh.delete()
    assert not Camera.objects.filter(pk=camera_pk).exists()


@pytest.mark.django_db
def test_mesh_str():
    """__str__ should return the file_path."""
    mesh, _ = _create_mesh_with_camera(
        file_path="some/model.glb", image_path="some/preview.jpg"
    )
    assert str(mesh) == "some/model.glb"


@pytest.mark.django_db
def test_mesh_view_method():
    """view() should return mesh_id, file_name, image_path, and OrbitCamera fields."""
    mesh, _ = _create_mesh_with_camera(
        right_x=0.0,
        right_y=1.0,
        right_z=0.0,
        up_x=0.0,
        up_y=0.0,
        up_z=1.0,
        forward_x=-1.0,
        forward_y=0.0,
        forward_z=0.0,
        radius=5.0,
        pan_x=1.25,
        pan_y=-0.5,
    )

    result = mesh.view()

    assert result["mesh_id"] == mesh.pk
    assert result["file_name"] == "scan.glb"
    assert result["image_path"] == "2025-02-12/scan.jpg"
    assert result["camera"] == {
        "right": [0.0, 1.0, 0.0],
        "up": [0.0, 0.0, 1.0],
        "forward": [-1.0, 0.0, 0.0],
        "radius": 5.0,
        "panX": 1.25,
        "panY": -0.5,
    }


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
