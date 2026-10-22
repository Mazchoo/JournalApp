"""Stream a calendar icon without exposing the entry folder."""

from pathlib import Path

from django.conf import settings
from django.forms.utils import ErrorDict
from django.http import FileResponse, Http404
from django.urls import reverse

from main.content_generation.get_full_image import create_image_stream_response
from main.file_types import ReservedSuffix


def icons_root() -> Path:
    """Resolved directory that holds calendar icons."""
    return (Path(settings.ENTRY_FOLDER) / "icons").resolve()


def calendar_icon_url(icon_path: Path) -> str:
    """Public URL for an icon file, or the static missing-icon image."""
    icon_path = Path(icon_path)
    missing = Path(settings.MISSING_ICON_IMAGE)
    if icon_path == missing:
        return f"{settings.STATIC_URL}Image/backgrounds/missing_icon.png"

    year, month, name = icon_path.resolve().relative_to(icons_root()).parts
    return reverse("main:icon", kwargs={"year": year, "month": month, "name": name})


def calendar_icon_response(year: str, month: str, name: str) -> FileResponse:
    """Stream one icon file stored under icons/year/month."""
    if name in {".", ".."} or not Path(name).stem.endswith(ReservedSuffix.ICON):
        raise Http404()

    target = (icons_root() / year / month / name).resolve()
    if not target.is_relative_to(icons_root()) or not target.is_file():
        raise Http404()

    response = create_image_stream_response(str(target), ErrorDict())
    if response is None:
        raise Http404()
    return response
