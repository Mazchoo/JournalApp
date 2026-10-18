"""Tests for the year_page view (URL: /year/<int:year>/)."""

from datetime import datetime
from unittest.mock import patch

import pytest
from django.apps import apps

from main.database_layer.get_year_entry_data import get_year_entry_information
from tests.mocks import create_mock_client


@pytest.mark.django_db
def test_year_page_returns_200_for_valid_year(client):
    """GET /year/2025/ should return HTTP 200 with the year.html template."""
    with patch(
        "main.database_layer.get_context.get_year_entry_information",
        return_value={
            "icon_paths": {},
            "nr_entries_per_month": {},
            "month_last_edited": {},
        },
    ):
        response = client.get("/year/2025/")

    assert response.status_code == 200
    assert "year.html" in [t.name for t in response.templates]


@pytest.mark.django_db
def test_year_page_redirects_for_nonexistent_year(client):
    """GET /year/0/ should redirect to /date-not-found (year 0 fails validation)."""
    response = client.get("/year/0/")

    assert response.status_code == 302
    assert "/date-not-found" in response.url


@pytest.mark.django_db
def test_year_page_redirects_for_invalid_month_context():
    """If put_day_and_month_names_into_context returns None, redirect to error page."""
    client = create_mock_client()
    with patch("main.views.put_day_and_month_names_into_context", return_value=None):
        response = client.get("/year/2025/")

    assert response.status_code == 302
    assert response["Location"] == "/date-not-found"


@pytest.mark.django_db
def test_year_entry_information_aggregates_in_four_queries(django_assert_num_queries):
    """Counts, last-edited, and icon paths come from one stats query plus three path queries."""
    Entry = apps.get_model("main", "Entry")
    EntryImage = apps.get_model("main", "EntryImage")
    Entry.objects.create(
        name="2025-02-01",
        year=2025,
        month=2,
        day=1,
        first_created=datetime(2025, 2, 1, 8, 0, 0),
        last_edited=datetime(2025, 2, 1, 9, 0, 0),
    )
    Entry.objects.create(
        name="2025-02-12",
        year=2025,
        month=2,
        day=12,
        first_created=datetime(2025, 2, 12, 8, 0, 0),
        last_edited=datetime(2025, 2, 12, 18, 0, 0),
    )
    march = Entry.objects.create(
        name="2025-03-03",
        year=2025,
        month=3,
        day=3,
        first_created=datetime(2025, 3, 3, 8, 0, 0),
        last_edited=datetime(2025, 3, 3, 12, 0, 0),
    )
    EntryImage.objects.create(
        entry=march, file_path="2025/03/03/photo.jpg", allow_ai_synthesis=False
    )
    EntryImage.objects.create(
        entry=march, file_path="2025/03/03/other.jpg", allow_ai_synthesis=False
    )

    with django_assert_num_queries(4):
        info = get_year_entry_information(2025)

    assert info["nr_entries_per_month"]["February"] == 2
    assert info["nr_entries_per_month"]["March"] == 1
    assert info["nr_entries_per_month"]["January"] == 0
    assert info["month_last_edited"]["February"] == datetime(2025, 2, 12, 18, 0, 0)
    assert info["month_last_edited"]["March"] == datetime(2025, 3, 3, 12, 0, 0)
    assert info["month_last_edited"]["January"] == "never"


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
