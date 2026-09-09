"""Helper objects to test database and request interactions"""

from __future__ import annotations

import base64
from datetime import datetime
from io import BytesIO
from typing import TYPE_CHECKING, List
from urllib.parse import quote

from django.apps import apps
from django.test import Client

if TYPE_CHECKING:
    from main.models import Entry


def create_mock_client():
    """
    Return a Django test Client.

    The test Client is our "mock server": it can issue GET / POST requests to
    any URL defined in urls.py and returns the response object so we can
    inspect status codes, templates, redirects, and context data.
    """
    return Client()


def create_mock_entry() -> Entry:
    """
    Create and return a real Entry row in the mock database.

    This gives tests a single journal entry dated 2025-02-12 so that the
    page-level views (year, month, day) have data to find.
    """

    Entry = apps.get_model("main", "Entry")
    entry = Entry.objects.create(
        name="2025-02-12",
        year=2025,
        month=2,
        day=12,
        first_created=datetime(2025, 2, 12, 10, 0, 0),
        last_edited=datetime(2025, 2, 12, 15, 30, 0),
    )
    return entry


def create_mock_entry_with_paragraph() -> Entry:
    """
    Extend sample_entry with a paragraph Content record.

    This lets us test views that render entry content (the edit/show page).
    """
    entry = create_mock_entry()

    EntryParagraph = apps.get_model("main", "EntryParagraph")
    Content = apps.get_model("main", "Content")

    # Create the paragraph model instance
    paragraph = EntryParagraph.objects.create(
        entry=entry, text="<p>Hello World</p>", height=200, allow_ai_synthesis=True
    )

    # Create the generic Content record that links to the paragraph
    content = Content.objects.create(
        content_type="paragraph",
        content_id=paragraph.pk,
    )

    # Attach the content to the entry via the ManyToMany relationship
    entry.content.add(content)

    return entry


def create_multiple_mock_entries() -> List[Entry]:
    """
    Create entries across several years so the home page and year page
    have meaningful data to aggregate.
    """

    Entry = apps.get_model("main", "Entry")
    entries = []
    for year, month, day in [(2023, 6, 15), (2024, 1, 10), (2025, 2, 12)]:
        month_str = f"{month:02d}"
        day_str = f"{day:02d}"
        slug = f"{year}-{month_str}-{day_str}"
        entry = Entry.objects.create(
            name=slug,
            year=year,
            month=month,
            day=day,
            first_created=datetime(year, month, day, 8, 0, 0),
            last_edited=datetime(year, month, day, 18, 0, 0),
        )
        entries.append(entry)
    return entries


def create_mock_video_file(base_path, name="2025-02-12", file_name="clip.mp4"):
    """
    Create a video file inside a temporary entry folder structure.

    Returns the full path to the created file. Write it under the test
    ENTRY_FOLDER (pytest tmp_path).
    """
    from pathlib import Path

    year, month, day = name.split("-")
    video_dir = Path(base_path) / year / month / day
    video_dir.mkdir(parents=True, exist_ok=True)
    video_path = video_dir / file_name
    video_path.write_bytes(b"\x00\x00\x00\x1cftypisom")
    return video_path


def create_mock_image_file(base_path, name="2025-02-12", file_name="photo.jpg"):
    """
    Create a small JPEG file inside a temporary entry folder structure.

    Returns the full path to the created file. Write it under the test
    ENTRY_FOLDER (pytest tmp_path).
    """
    from pathlib import Path

    year, month, day = name.split("-")
    image_dir = Path(base_path) / year / month / day
    image_dir.mkdir(parents=True, exist_ok=True)
    image_path = image_dir / file_name
    # Minimal valid JPEG: SOI marker + EOI marker
    image_path.write_bytes(b"\xff\xd8\xff\xe0" + b"\x00" * 20 + b"\xff\xd9")
    return image_path


def create_mock_stored_mesh_file(base_path, name="2025-02-12", file_name="scan.glb"):
    """
    Create a dummy glb inside a temporary entry folder structure.

    Returns the full path to the created file. Write it under the test
    ENTRY_FOLDER (pytest tmp_path).
    """
    from pathlib import Path

    year, month, day = name.split("-")
    mesh_dir = Path(base_path) / year / month / day
    mesh_dir.mkdir(parents=True, exist_ok=True)
    mesh_path = mesh_dir / file_name
    mesh_path.write_bytes(b"glTF")
    return mesh_path


def create_mock_mesh_file(base_path, file_name="scan.glb"):
    """
    Create a dummy glb in the base entry folder so MeshForm can move it.

    Returns the full path to the created file. Write it under the test
    ENTRY_FOLDER (pytest tmp_path).
    """
    from pathlib import Path

    mesh_path = Path(base_path) / file_name
    mesh_path.write_bytes(b"glTF")
    return mesh_path


def mock_jpeg_data_url(color=(10, 20, 30)) -> str:
    """Return a small valid JPEG as a data URL for mesh frame_image payloads."""
    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", (32, 32), color=color).save(buffer, format="JPEG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"


def mock_mesh_post_data(
    name: str,
    file_name: str = "scan.glb",
    frame_image: str | None = None,
) -> str:
    """Build a form-encoded body with one mesh content item."""
    if frame_image is None:
        frame_image = mock_jpeg_data_url()
    encoded_frame = quote(frame_image, safe="")
    return (
        f"name={name}"
        f"&content[mesh1][entry]={name}"
        f"&content[mesh1][file_path]={file_name}"
        f"&content[mesh1][frame_image]={encoded_frame}"
        f"&content[mesh1][camera][right][0]=1"
        f"&content[mesh1][camera][right][1]=0"
        f"&content[mesh1][camera][right][2]=0"
        f"&content[mesh1][camera][up][0]=0"
        f"&content[mesh1][camera][up][1]=1"
        f"&content[mesh1][camera][up][2]=0"
        f"&content[mesh1][camera][forward][0]=0"
        f"&content[mesh1][camera][forward][1]=0"
        f"&content[mesh1][camera][forward][2]=-1"
        f"&content[mesh1][camera][radius]=3"
        f"&content[mesh1][camera][panX]=0"
        f"&content[mesh1][camera][panY]=0"
    )


def mock_paragraph_post_data(
    name: str,
    text: str = "<p>Hello</p>",
    height: int = 200,
    allow_ai_synthesis: bool = True,
) -> str:
    """Build a form-encoded body with one paragraph content item."""
    return (
        f"name={name}"
        f"&content[paragraph1][entry]={name}"
        f"&content[paragraph1][text]={text}"
        f"&content[paragraph1][height]={height}"
        f"&content[paragraph1][allow_ai_synthesis]={int(allow_ai_synthesis)}"
    )


def create_ajax_headers() -> dict:
    """
    Return HTTP headers that the @ajax_request decorator expects.

    The decorator checks for the XMLHttpRequest header to distinguish
    AJAX calls from normal browser requests.  Without this header the
    decorated views return Http404.
    """
    return {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}
