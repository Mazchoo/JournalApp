"""Tests for the date_not_found_page view (URL: /date-not-found)."""

import pytest

from tests.mocks import create_mock_client


@pytest.mark.django_db
def test_date_not_found_returns_200():
    """GET /date-not-found should always return 200 with the error template."""
    client = create_mock_client()
    response = client.get("/date-not-found")

    assert response.status_code == 200
    assert "DateNotFound.html" in [t.name for t in response.templates]


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
