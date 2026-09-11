"""Tests for SVG helpers and the ReportLab rasteriser backend."""

from pathlib import Path

import rlPyCairo
from PIL import Image
from reportlab.graphics import renderPM

from main.config import ImageConstants
from main.utils.svg import is_svg_path, rasterize_svg, write_svg_icon
from tests.mocks import create_mock_svg_file


def test_renderpm_backend_is_installed():
    """rlPyCairo is the only renderPM backend from ReportLab 5.0; fail loudly if missing."""
    assert rlPyCairo.__name__ == "rlPyCairo"
    assert callable(renderPM.drawToPIL)


def test_is_svg_path_recognises_vector_suffixes():
    """SVG detection is case-insensitive and ignores other media types."""
    assert is_svg_path(Path("logo.svg"))
    assert is_svg_path(Path("logo.SVG"))
    assert not is_svg_path(Path("logo.png"))
    assert not is_svg_path(Path("clip.mp4"))
    assert not is_svg_path(Path("scan.glb"))


def test_rasterize_svg_longest_side_matches_request(tmp_path):
    """The rasterised drawing's longest side is the requested render size."""
    svg_path = create_mock_svg_file(tmp_path)
    image = rasterize_svg(svg_path, 256)
    assert max(image.size) == 256


def test_write_svg_icon_writes_square_png(tmp_path):
    """The calendar icon is a 96px PNG, and missing parent folders are created."""
    svg_path = create_mock_svg_file(tmp_path)
    icon_path = tmp_path / "icons" / "2025" / "02" / "logo_icon.png"

    assert write_svg_icon(svg_path, icon_path)

    with Image.open(icon_path) as icon:
        assert icon.size == (ImageConstants.icon_size, ImageConstants.icon_size)
        assert icon.format == "PNG"


def test_write_svg_icon_returns_false_for_invalid_svg(tmp_path):
    """A file that is not valid SVG must not raise and must not write an icon."""
    svg_path = tmp_path / "logo.svg"
    svg_path.write_text("this is not svg", encoding="utf-8")
    icon_path = tmp_path / "logo_icon.png"

    assert write_svg_icon(svg_path, icon_path) is False
    assert not icon_path.exists()
