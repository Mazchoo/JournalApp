"""SVG specific helpers.

A vector image needs no downsized derivative, so the only thing an SVG needs
beyond the shared image pipeline is a rasterised calendar icon. SVG bytes are
only ever delivered inside an ``<img>`` data URL, never inlined as markup, so
scripts and external references in the file cannot run.
"""

from pathlib import Path

from lxml.etree import XMLSyntaxError  # type: ignore
from PIL import Image
from reportlab.graphics import renderPM  # type: ignore
from reportlab.graphics.renderPM import RenderPMError  # type: ignore
from svglib.svglib import svg2rlg  # type: ignore

from main.config import ImageConstants
from main.file_types import ImageFileType
from main.utils.pil_image_wrapper import get_square_resized_image


def is_svg_path(file_path: Path) -> bool:
    """True if the path points at a vector image."""
    return file_path.suffix.lower() == ImageFileType.SVG


def rasterize_svg(svg_path: Path, longest_side: int) -> Image.Image:
    """Render a vector image into a PIL image with its longest side at longest_side."""
    drawing = svg2rlg(str(svg_path))
    if drawing is None:
        raise ValueError(f"SVG {svg_path} has no drawable content")

    scale = longest_side / max(drawing.width, drawing.height)
    drawing.width, drawing.height = drawing.width * scale, drawing.height * scale
    drawing.scale(scale, scale)

    return renderPM.drawToPIL(drawing, bg=None, backendFmt="ARGB32")


def write_svg_icon(svg_path: Path, icon_path: Path) -> bool:
    """Write the square calendar icon for a vector image.

    Returns False when the file cannot be rendered, so that a vector image
    svglib does not understand cannot stop an entry from being saved.
    """
    try:
        image = rasterize_svg(svg_path, 256)
    except (ValueError, OSError, XMLSyntaxError, RenderPMError) as exc:
        print(f"Error! Cannot rasterise SVG {svg_path}: {exc}")
        return False

    icon = get_square_resized_image(image, ImageConstants.icon_size)
    icon_path.parent.mkdir(parents=True, exist_ok=True)
    icon.save(icon_path)
    return True
