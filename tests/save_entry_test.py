"""Tests for the save_entry AJAX view (URL: /ajax/save-entry/)."""

import json
from datetime import datetime
from unittest.mock import patch

import pytest
from django.http import JsonResponse

from tests.mocks import create_mock_client, create_ajax_headers

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


@pytest.mark.django_db
def test_save_entry_success():
    """A well-formed save request should return a success JSON response."""
    client = create_mock_client()

    with patch(
        "main.views.update_or_generate_from_request",
        return_value=JsonResponse({"success": "Entry Saved Successfully"}),
    ):
        response = client.post(
            "/ajax/save-entry/",
            data="name=2025-02-12",
            content_type=FORM_CONTENT_TYPE,
            **create_ajax_headers(),
        )

    data = json.loads(response.content)
    assert "success" in data
    assert data["success"] == "Entry Saved Successfully"


@pytest.mark.django_db
def test_save_entry_with_invalid_data():
    """When SaveEntryForm validation fails, return a JSON error response."""
    client = create_mock_client()

    with patch(
        "main.views.update_or_generate_from_request",
        return_value=JsonResponse({"error": "No content in entry"}),
    ):
        response = client.post(
            "/ajax/save-entry/",
            data="name=2025-02-12",
            content_type=FORM_CONTENT_TYPE,
            **create_ajax_headers(),
        )

    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_save_entry_creates_new_entry_in_db():
    """Calling save_entry should create an Entry in the database."""
    from main.models import Entry

    client = create_mock_client()

    with patch("main.views.update_or_generate_from_request") as mock_update:

        def side_effect(_):
            Entry.objects.create(
                name="2025-03-01",
                date=datetime(2025, 3, 1),
                first_created=datetime.now(),
                last_edited=datetime.now(),
            )
            return JsonResponse({"success": "Entry Saved Successfully"})

        mock_update.side_effect = side_effect

        client.post(
            "/ajax/save-entry/",
            data="name=2025-03-01",
            content_type=FORM_CONTENT_TYPE,
            **create_ajax_headers(),
        )

    assert Entry.objects.filter(name="2025-03-01").exists()


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
