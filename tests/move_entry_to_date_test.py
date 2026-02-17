"""Tests for the move_entry_date AJAX view (URL: /ajax/move-date/)."""

import json
from unittest.mock import patch

import pytest
from django.http import JsonResponse

from tests.mocks import create_mock_client, create_mock_entry, create_ajax_headers

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


@pytest.mark.django_db
def test_move_entry_success():
    """Moving an entry to a valid new date should return JSON with the new_date URL."""
    client = create_mock_client()
    create_mock_entry()

    with patch(
        "main.views.move_source_date_to_desination_request",
        return_value=JsonResponse({"new_date": "/edit/2025/March/1"}),
    ):
        response = client.post(
            "/ajax/move-date/",
            data="move_from=2025-02-12&move_to=2025-03-01",
            content_type=FORM_CONTENT_TYPE,
            **create_ajax_headers(),
        )

    data = json.loads(response.content)
    assert "new_date" in data
    assert "/edit/2025/March/1" in data["new_date"]


@pytest.mark.django_db
def test_move_entry_to_existing_date_returns_error():
    """Moving to a date that already has an entry should return an error."""
    client = create_mock_client()

    with patch(
        "main.views.move_source_date_to_desination_request",
        return_value=JsonResponse({"error": "Destination date already exists"}),
    ):
        response = client.post(
            "/ajax/move-date/",
            data="move_from=2025-02-12&move_to=2024-01-10",
            content_type=FORM_CONTENT_TYPE,
            **create_ajax_headers(),
        )

    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_move_entry_from_nonexistent_source_returns_error():
    """Moving from a nonexistent date should return an error."""
    client = create_mock_client()

    with patch(
        "main.views.move_source_date_to_desination_request",
        return_value=JsonResponse({"error": "Source date not found"}),
    ):
        response = client.post(
            "/ajax/move-date/",
            data="move_from=1900-01-01&move_to=2025-03-01",
            content_type=FORM_CONTENT_TYPE,
            **create_ajax_headers(),
        )

    data = json.loads(response.content)
    assert "error" in data


@pytest.mark.django_db
def test_move_entry_non_ajax_returns_404():
    """A non-AJAX POST to /ajax/move-date/ should return 404."""
    client = create_mock_client()
    response = client.post(
        "/ajax/move-date/",
        data="move_from=2025-02-12&move_to=2025-03-01",
        content_type=FORM_CONTENT_TYPE,
    )
    assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
