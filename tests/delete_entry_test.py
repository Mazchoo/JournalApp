"""Tests for the delete_entry AJAX view (URL: /ajax/delete-entry/)."""

import json
from datetime import datetime
from unittest.mock import patch

import pytest
from django.http import JsonResponse

from tests.mocks import create_mock_client, create_mock_entry, create_ajax_headers

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


@pytest.mark.django_db
def test_delete_entry_success():
    """Deleting an existing entry should return the success message."""
    client = create_mock_client()
    create_mock_entry()

    with patch(
        "main.views.delete_entry_and_content",
        return_value=JsonResponse({"success": "It's gone!"}),
    ):
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

    with patch(
        "main.views.delete_entry_and_content",
        return_value=JsonResponse({"error": {"entry": ["Invalid entry"]}}),
    ):
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

    with patch("main.views.delete_entry_and_content") as mock_delete:

        def side_effect(_):
            entry = Entry.objects.get(name="2025-04-01")
            entry.delete()
            return JsonResponse({"success": "It's gone!"})

        mock_delete.side_effect = side_effect

        client.post(
            "/ajax/delete-entry/",
            data="entry=2025-04-01",
            content_type=FORM_CONTENT_TYPE,
            **create_ajax_headers(),
        )

    assert not Entry.objects.filter(name="2025-04-01").exists()


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
