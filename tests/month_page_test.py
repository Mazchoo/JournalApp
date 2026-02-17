"""Tests for the month_page view (URL: /month/<int:year>/<str:month>/)."""

import pytest

from tests.mocks import create_mock_client, create_mock_entry


@pytest.mark.django_db
def test_month_page_returns_200_for_valid_month():
    """GET /month/2025/February/ should return 200 with the month.html template."""
    client = create_mock_client()
    create_mock_entry()
    response = client.get("/month/2025/February/")

    assert response.status_code == 200
    assert "month.html" in [t.name for t in response.templates]


@pytest.mark.django_db
def test_month_page_redirects_for_invalid_month_name():
    """GET /month/2025/Smarch/ should redirect to /date-not-found."""
    client = create_mock_client()
    response = client.get("/month/2025/Smarch/")

    assert response.status_code == 302
    assert response["Location"] == "/date-not-found"


@pytest.mark.django_db
def test_month_page_redirects_for_nonexistent_year():
    """GET /month/0/January/ should redirect (year 0 fails validation)."""
    client = create_mock_client()
    response = client.get("/month/0/January/")

    assert response.status_code == 302
    assert response["Location"] == "/date-not-found"


@pytest.mark.django_db
def test_month_page_context_contains_day_names():
    """The month page context should include day-of-week names."""
    client = create_mock_client()
    create_mock_entry()
    response = client.get("/month/2025/February/")

    assert response.status_code == 200
    assert "full_day_names" in response.context


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
