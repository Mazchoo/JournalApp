"""Tests for image encoding and lazy SVG loading."""

from pathlib import Path

from main.utils.image import downsized_image_file, get_encoding_type
from tests.mocks import create_mock_svg_file


def test_get_encoding_type_for_svg():
    """SVG files are served as image/svg+xml data URLs."""
    assert get_encoding_type("a.svg") == "svg+xml"
    assert get_encoding_type(Path("a.SVG")) == "svg+xml"


def test_downsized_image_file_for_svg_skips_resized(tmp_path):
    """A saved SVG is previewed as itself; no _resized derivative is written."""
    svg_path = create_mock_svg_file(tmp_path)

    assert downsized_image_file(svg_path) == svg_path
    assert not (svg_path.parent / "logo_resized.svg").exists()
