"""Tests for the latest_page view (URL: /latest) and get_latest_entry_tuple."""

import pytest

from tests.mocks import (
    create_mock_client,
    create_mock_entry,
    create_multiple_mock_entries,
)


@pytest.mark.django_db
def test_latest_page_redirects_to_most_recent_entry():
    """When entries exist, /latest should redirect to the edit page for the most recently edited entry."""
    client = create_mock_client()
    create_mock_entry()
    response = client.get("/latest")

    assert response.status_code == 302
    assert response["Location"] == "/edit/2025/February/12"


@pytest.mark.django_db
def test_latest_page_with_no_entries_redirects_home(client):
    """When the database is empty, /latest should redirect to the home page."""
    response = client.get("/latest")

    assert response.status_code == 302
    assert response.url == "/"


@pytest.mark.django_db
def test_latest_picks_most_recently_edited():
    """When several entries exist, /latest should redirect to the most recently edited one."""
    client = create_mock_client()
    create_mock_entry()
    response = client.get("/latest")

    assert response.status_code == 302
    assert response["Location"] == "/edit/2025/February/12"


@pytest.mark.django_db
def test_get_latest_entry_tuple_returns_none_when_no_entries():
    """When the database is empty, get_latest_entry_tuple should return None."""
    from main.database_layer.get_latest_entry import get_latest_entry_tuple

    assert get_latest_entry_tuple() is None


@pytest.mark.django_db
def test_get_latest_entry_tuple_returns_tuple_for_latest_entry():
    """When entries exist, it should return a (year, month, day) tuple."""
    from main.database_layer.get_latest_entry import get_latest_entry_tuple

    create_mock_entry()
    result = get_latest_entry_tuple()
    assert result == ("2025", "February", "12")


@pytest.mark.django_db
def test_get_latest_entry_tuple_returns_most_recent_among_multiple():
    """Among multiple entries, the one with the latest last_edited should be returned."""
    from main.database_layer.get_latest_entry import get_latest_entry_tuple

    create_multiple_mock_entries()
    result = get_latest_entry_tuple()
    assert result == ("2025", "February", "12")


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
