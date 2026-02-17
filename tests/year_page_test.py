"""Tests for the year_page view (URL: /year/<int:year>/)."""

from unittest.mock import patch

import pytest

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


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
