"""Tests for the save_entry AJAX view (URL: /ajax/save-entry/)."""

import json

import pytest
from django.apps import apps

from tests.mocks import create_mock_client, create_ajax_headers

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


def _paragraph_post_data(
    name: str, text: str = "<p>Hello</p>", height: int = 200
) -> str:
    """Build a form-encoded body with one paragraph content item."""
    return (
        f"name={name}"
        f"&content[paragraph1][entry]={name}"
        f"&content[paragraph1][text]={text}"
        f"&content[paragraph1][height]={height}"
    )


@pytest.mark.django_db
def test_save_entry_success():
    """A well-formed save request should return a success JSON response."""
    client = create_mock_client()

    response = client.post(
        "/ajax/save-entry/",
        data=_paragraph_post_data("2025-03-01"),
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
        data=_paragraph_post_data("2025-03-01"),
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
        data=_paragraph_post_data(
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
def test_save_entry_replaces_existing_content():
    """Saving an entry that already exists should replace its content."""
    Entry = apps.get_model("main", "Entry")
    EntryParagraph = apps.get_model("main", "EntryParagraph")
    client = create_mock_client()
    headers = create_ajax_headers()

    # First save
    client.post(
        "/ajax/save-entry/",
        data=_paragraph_post_data("2025-03-01", text="<p>Original</p>"),
        content_type=FORM_CONTENT_TYPE,
        **headers,
    )

    # Second save with different content
    client.post(
        "/ajax/save-entry/",
        data=_paragraph_post_data("2025-03-01", text="<p>Updated</p>"),
        content_type=FORM_CONTENT_TYPE,
        **headers,
    )

    entry = Entry.objects.get(name="2025-03-01")
    assert entry.content.count() == 1

    content = entry.content.first()
    assert content is not None
    paragraph = EntryParagraph.objects.get(pk=content.content_id)
    assert paragraph.text == "<p>Updated</p>"


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
