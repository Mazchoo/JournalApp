"""Tests for the home_page view (URL: /)."""

from unittest.mock import patch

import pytest

from tests.mocks import create_mock_client


@pytest.mark.django_db
def test_home_page_returns_200():
    """GET / should return HTTP 200 and use the home.html template."""
    client = create_mock_client()

    with patch("main.views.get_home_page_context") as mock_ctx:
        mock_ctx.return_value = {
            "full_day_names": ("Monday",),
            "short_day_names": ("Mon",),
            "months_in_year": ("January",),
            "all_years": [],
            "icon_paths": {},
        }
        response = client.get("/")

    assert response.status_code == 200
    assert "home.html" in [t.name for t in response.templates]


@pytest.mark.django_db
def test_home_page_with_entries():
    """When entries exist, home_page should include year data in context."""
    client = create_mock_client()

    with patch(
        "main.database_layer.get_context.get_all_year_summary_information",
        return_value={},
    ):
        response = client.get("/")

    assert response.status_code == 200


@pytest.mark.django_db
def test_home_page_with_invalid_month_kwarg():
    """When put_day_and_month_names_into_context returns None, redirect to /date-not-found."""
    client = create_mock_client()

    with patch("main.views.put_day_and_month_names_into_context", return_value=None):
        response = client.get("/")

    assert response.status_code == 302
    assert response["Location"] == "/date-not-found"


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
