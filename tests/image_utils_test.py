"""Tests for image encoding and lazy SVG loading."""

from pathlib import Path

from main.utils.image import get_encoding_type, lazy_create_base64_image_data
from tests.mocks import create_mock_svg_file


def test_get_encoding_type_for_svg():
    """SVG files are served as image/svg+xml data URLs."""
    assert get_encoding_type("a.svg") == "svg+xml"
    assert get_encoding_type(Path("a.SVG")) == "svg+xml"


def test_lazy_create_base64_image_data_for_svg_skips_resized(tmp_path):
    """A saved SVG is returned as itself; no _resized derivative is written."""
    svg_path = create_mock_svg_file(tmp_path)

    result = lazy_create_base64_image_data(svg_path)

    assert result.startswith("data:image/svg+xml;base64,")
    assert not (svg_path.parent / "logo_resized.svg").exists()
