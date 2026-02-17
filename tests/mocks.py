"""Helper objects to test database and request interactions"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List

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
        date=datetime(2025, 2, 12),
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
        entry=entry,
        text="<p>Hello World</p>",
        height=200,
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
            date=datetime(year, month, day),
            first_created=datetime(year, month, day, 8, 0, 0),
            last_edited=datetime(year, month, day, 18, 0, 0),
        )
        entries.append(entry)
    return entries


def create_ajax_headers() -> dict:
    """
    Return HTTP headers that the @ajax_request decorator expects.

    The decorator checks for the XMLHttpRequest header to distinguish
    AJAX calls from normal browser requests.  Without this header the
    decorated views return Http404.
    """
    return {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}
