"""Tests for the delete_entry AJAX view (URL: /ajax/delete-entry/)."""

import json
from datetime import datetime

import pytest

from tests.mocks import create_mock_client, create_mock_entry, create_ajax_headers

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


@pytest.mark.django_db
def test_delete_entry_success():
    """Deleting an existing entry should return the success message."""
    client = create_mock_client()
    create_mock_entry()

    response = client.post(
        "/ajax/delete-entry/",
        data="entry=2025-02-12",
        content_type=FORM_CONTENT_TYPE,
        **create_ajax_headers(),
    )

    data = json.loads(response.content)
    assert data["success"] == "It's gone!"


@pytest.mark.django_db
def test_delete_nonexistent_entry_returns_error():
    """Trying to delete a nonexistent entry should return an error."""
    client = create_mock_client()

    response = client.post(
        "/ajax/delete-entry/",
        data="entry=9999-01-01",
        content_type=FORM_CONTENT_TYPE,
        **create_ajax_headers(),
    )

    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_delete_entry_removes_from_db():
    """A deleted entry should be removed from the database."""
    from main.models import Entry

    client = create_mock_client()

    Entry.objects.create(
        name="2025-04-01",
        date=datetime(2025, 4, 1),
        first_created=datetime.now(),
        last_edited=datetime.now(),
    )
    assert Entry.objects.filter(name="2025-04-01").exists()

    client.post(
        "/ajax/delete-entry/",
        data="entry=2025-04-01",
        content_type=FORM_CONTENT_TYPE,
        **create_ajax_headers(),
    )

    assert not Entry.objects.filter(name="2025-04-01").exists()


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
