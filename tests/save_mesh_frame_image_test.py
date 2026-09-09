"""Tests for writing a mesh preview frame and its icon."""

from pathlib import Path

from main.utils.file_io import get_icon_file_path
from main.utils.image import lazy_create_image_icon
from main.utils.mesh import save_mesh_frame_image
from tests.mocks import mock_jpeg_data_url


def test_save_mesh_frame_image_replaces_existing_icon(tmp_path):
    """A new frame should overwrite the calendar icon, not keep the first view."""
    mesh_dir = tmp_path / "2025" / "03" / "01"
    mesh_dir.mkdir(parents=True)
    mesh_path = mesh_dir / "scan.glb"
    mesh_path.write_bytes(b"glTF")

    save_mesh_frame_image(mesh_path, mock_jpeg_data_url((255, 0, 0)))
    icon_path = get_icon_file_path(mesh_path)
    first_icon = Path(icon_path).read_bytes()

    save_mesh_frame_image(mesh_path, mock_jpeg_data_url((0, 0, 255)))
    second_icon = Path(icon_path).read_bytes()

    assert first_icon != second_icon
    assert icon_path.name == "scan_icon.jpg"
    assert not list(tmp_path.rglob("*_resized_icon*"))


def test_lazy_create_image_icon_ignores_resized_preview(tmp_path):
    """A preview JPEG must not produce a *_resized_icon file."""
    dated = tmp_path / "2025" / "02" / "12"
    dated.mkdir(parents=True)
    preview = dated / "pikachu_resized.jpeg"
    preview.write_bytes(b"jpg")

    assert lazy_create_image_icon(preview) is False
    assert not list(tmp_path.rglob("*_resized_icon*"))
    assert not (tmp_path / "icons").exists()
