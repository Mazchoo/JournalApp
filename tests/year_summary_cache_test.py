"""Home-page year summary cache invalidation when an entry introduces a year."""

from datetime import datetime
from unittest.mock import patch

import pytest

from main.database_layer.get_all_years_summary import get_all_year_summary_information
from main.forms import EntryForm
from main.models import Entry


def _entry_form(name: str) -> EntryForm:
    form = EntryForm(
        {
            "name": name,
            "first_created": datetime(2026, 1, 2, 9, 0, 0),
            "last_edited": datetime(2026, 1, 2, 9, 0, 0),
        }
    )
    assert form.is_valid(), form.errors
    return form


def _prime_cache(years: tuple[int, ...]):
    get_all_year_summary_information.cache_clear()
    with patch(
        "main.database_layer.get_all_years_summary.get_random_images_from_year",
        return_value=["icon"],
    ):
        get_all_year_summary_information(years)
    assert get_all_year_summary_information.cache_info().currsize == 1


@pytest.mark.django_db
def test_first_entry_in_a_year_clears_the_year_summary_cache(
    django_capture_on_commit_callbacks,
):
    """Saving an entry into a year that has none drops the cached home-page icons."""
    _prime_cache((2025,))

    with django_capture_on_commit_callbacks(execute=True):
        _entry_form("2026-01-02").save()

    assert get_all_year_summary_information.cache_info().currsize == 0
    get_all_year_summary_information.cache_clear()


@pytest.mark.django_db
def test_another_entry_in_an_existing_year_keeps_the_year_summary_cache(
    django_capture_on_commit_callbacks,
):
    """A new entry in a year that already has one leaves the cached icons in place."""
    Entry.objects.create(
        name="2026-01-01",
        year=2026,
        month=1,
        day=1,
        first_created=datetime(2026, 1, 1, 9, 0, 0),
        last_edited=datetime(2026, 1, 1, 9, 0, 0),
    )
    _prime_cache((2026,))

    with django_capture_on_commit_callbacks(execute=True):
        _entry_form("2026-03-04").save()

    assert get_all_year_summary_information.cache_info().currsize == 1
    get_all_year_summary_information.cache_clear()
