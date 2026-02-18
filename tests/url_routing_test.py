"""Tests that URL patterns in main/urls.py map to the expected views."""

import pytest
from django.urls import resolve


def test_homepage_url_resolves():
    """The root URL '' should resolve to the home_page view."""
    match = resolve("/")
    assert match.func.__name__ == "home_page"


def test_year_url_resolves():
    """URL /year/<int:year>/ should resolve to year_page."""
    match = resolve("/year/2025/")
    assert match.func.__name__ == "year_page"


def test_month_url_resolves():
    """URL /month/<year>/<month>/ should resolve to month_page."""
    match = resolve("/month/2025/February/")
    assert match.func.__name__ == "month_page"


def test_edit_url_resolves():
    """URL /edit/<year>/<month>/<day>/ should resolve to edit_entry_page."""
    match = resolve("/edit/2025/February/12/")
    assert match.func.__name__ == "edit_entry_page"


def test_show_url_resolves_to_edit_view():
    """URL /show/ should also resolve to edit_entry_page."""
    match = resolve("/show/2025/February/12/")
    assert match.func.__name__ == "edit_entry_page"


def test_latest_url_resolves():
    """URL /latest should resolve to latest_page."""
    match = resolve("/latest")
    assert match.func.__name__ == "latest_page"


def test_date_not_found_url_resolves():
    """URL /date-not-found should resolve to date_not_found_page."""
    match = resolve("/date-not-found")
    assert match.func.__name__ == "date_not_found_page"


def test_save_entry_url_resolves():
    """URL /ajax/save-entry/ should resolve via its URL name."""
    match = resolve("/ajax/save-entry/")
    assert match.url_name == "save-entry"


def test_delete_entry_url_resolves():
    """URL /ajax/delete-entry/ should resolve via its URL name."""
    match = resolve("/ajax/delete-entry/")
    assert match.url_name == "delete-entry"


def test_get_image_url_resolves():
    """URL /ajax/get-image/ should resolve via its URL name."""
    match = resolve("/ajax/get-image/")
    assert match.url_name == "get-image"


def test_get_downsized_image_url_resolves():
    """URL /ajax/get-downsized-image/ should resolve via its URL name."""
    match = resolve("/ajax/get-downsized-image/")
    assert match.url_name == "get-downsized-image"


def test_get_video_url_resolves():
    """URL /ajax/get-video/ should resolve via its URL name."""
    match = resolve("/ajax/get-video/")
    assert match.url_name == "get-video"


def test_move_date_url_resolves():
    """URL /ajax/move-date/ should resolve via its URL name."""
    match = resolve("/ajax/move-date/")
    assert match.url_name == "move-date"


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
