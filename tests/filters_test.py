"""Tests for date slugs, date information helpers, context builders, and request forms."""

from datetime import datetime

import pytest

from tests.mocks import create_mock_entry
from main.database_layer.date_slugs import (
    get_valid_date_from_slug,
    convert_date_to_url_tuple,
    date_exists,
)


def test_valid_slug_returns_datetime():
    """A correctly formatted slug should return a datetime object."""
    result = get_valid_date_from_slug("2025-02-12")
    assert result == datetime(2025, 2, 12)


def test_invalid_slug_returns_none():
    """A malformed slug should return None."""
    assert get_valid_date_from_slug("not-a-date") is None


def test_impossible_date_returns_none():
    """February 30 doesn't exist, so the slug should return None."""
    assert get_valid_date_from_slug("2025-02-30") is None


def test_convert_date_to_url_tuple():
    """A datetime should be converted to a (year, month, day) string tuple."""
    result = convert_date_to_url_tuple(datetime(2025, 2, 12))
    assert result == ("2025", "February", "12")


def test_date_exists_valid():
    """A real date should return True."""
    assert date_exists(2025, "February", 12)


def test_date_exists_invalid():
    """An impossible date (Feb 31) should return False."""
    assert not date_exists(2025, "February", 31)


def test_date_exists_default_month_and_day():
    """With only a year argument, date_exists defaults to January 1."""
    assert date_exists(2025) is True


def test_context_with_no_month():
    """When no month kwarg is given, should return a valid context."""
    from main.database_layer.get_context import put_day_and_month_names_into_context

    result = put_day_and_month_names_into_context(year=2025)

    assert result is not None
    assert "full_day_names" in result
    assert "short_day_names" in result
    assert "months_in_year" in result
    assert result["year"] == 2025


def test_context_with_valid_month():
    """When a valid month name is given, the context should include it."""
    from main.database_layer.get_context import put_day_and_month_names_into_context

    result = put_day_and_month_names_into_context(year=2025, month="February")

    assert result is not None
    assert result["month"] == "February"


def test_context_returns_none_for_invalid_month():
    """An invalid month name like 'Smarch' should return None."""
    from main.database_layer.get_context import put_day_and_month_names_into_context

    result = put_day_and_month_names_into_context(year=2025, month="Smarch")
    assert result is None


# --- Date information helpers ---


def test_get_day_and_month_names():
    """Should return tuples of day/month names."""
    from main.database_layer.date_information import get_day_and_month_names

    result = get_day_and_month_names()

    assert "Monday" in result["full_day_names"]
    assert "Mon" in result["short_day_names"]
    assert "January" in result["months_in_year"]


def test_get_year_information():
    """Given a year, should return year, next_year, and prev_year."""
    from main.database_layer.date_information import get_year_information

    result = get_year_information(2025)

    assert result["year"] == 2025
    assert result["next_year"] == 2026
    assert result["prev_year"] == 2024


def test_get_month_information():
    """Given year and month, should compute navigation info."""
    from main.database_layer.date_information import get_month_information

    result = get_month_information(2025, "February")

    assert len(result["days_in_month"]) == 28
    assert result["next_month"] == "March"
    assert result["prev_month"] == "January"


def test_get_month_information_december():
    """December should wrap: next month is January of next year."""
    from main.database_layer.date_information import get_month_information

    result = get_month_information(2025, "December")

    assert result["next_month"] == "January"
    assert result["next_month_year"] == 2026
    assert result["prev_month"] == "November"


def test_get_month_information_january():
    """January should wrap: prev month is December of prev year."""
    from main.database_layer.date_information import get_month_information

    result = get_month_information(2025, "January")

    assert result["prev_month"] == "December"
    assert result["prev_month_year"] == 2024


def test_get_day_information():
    """Given year, day, and month_info, should compute date slug and navigation."""
    from main.database_layer.date_information import (
        get_month_information,
        get_day_information,
    )

    month_info = get_month_information(2025, "February")
    result = get_day_information(2025, 12, month_info)

    assert result["date_slug"] == "2025-02-12"
    assert result["day_suffix"] == "th"
    assert result["next_day"] == 13
    assert result["prev_day"] == 11


def test_get_day_information_first_suffix():
    """Day 1 should get suffix 'st'."""
    from main.database_layer.date_information import (
        get_month_information,
        get_day_information,
    )

    month_info = get_month_information(2025, "February")
    result = get_day_information(2025, 1, month_info)
    assert result["day_suffix"] == "st"


def test_get_day_information_second_suffix():
    """Day 2 should get suffix 'nd'."""
    from main.database_layer.date_information import (
        get_month_information,
        get_day_information,
    )

    month_info = get_month_information(2025, "February")
    result = get_day_information(2025, 2, month_info)
    assert result["day_suffix"] == "nd"


def test_get_day_information_third_suffix():
    """Day 3 should get suffix 'rd'."""
    from main.database_layer.date_information import (
        get_month_information,
        get_day_information,
    )

    month_info = get_month_information(2025, "February")
    result = get_day_information(2025, 3, month_info)
    assert result["day_suffix"] == "rd"


def test_get_day_information_eleventh_suffix():
    """Day 11 should be 'th', not 'st'."""
    from main.database_layer.date_information import (
        get_month_information,
        get_day_information,
    )

    month_info = get_month_information(2025, "February")
    result = get_day_information(2025, 11, month_info)
    assert result["day_suffix"] == "th"


@pytest.mark.django_db
def test_get_days_with_entries_in_month():
    """Should return day numbers that have entries in the given month."""
    from main.database_layer.date_information import get_days_with_entries_in_month

    create_mock_entry()
    result = get_days_with_entries_in_month(2025, "February", "March", 2025)

    assert 12 in result["days_with_an_entry"]


@pytest.mark.django_db
def test_get_days_with_entries_empty_month():
    """An empty database should return an empty list of days."""
    from main.database_layer.date_information import get_days_with_entries_in_month

    result = get_days_with_entries_in_month(2025, "March", "April", 2025)
    assert result["days_with_an_entry"] == []


# --- Request form validation ---


def test_month_name_form_valid():
    """A real month name should pass validation."""
    from main.content_generation.request_forms import MonthNameForm

    form = MonthNameForm({"month": "February"})
    assert form.is_valid()


def test_month_name_form_invalid():
    """A fake month name should fail validation."""
    from main.content_generation.request_forms import MonthNameForm

    form = MonthNameForm({"month": "Smarch"})
    assert not form.is_valid()


@pytest.mark.django_db
def test_year_page_form_valid():
    """YearPageForm should be valid when entries exist for that year."""
    from main.content_generation.request_forms import YearPageForm

    create_mock_entry()
    form = YearPageForm({"year": 2025})
    assert form.is_valid()


@pytest.mark.django_db
def test_year_page_form_nonexistent_year():
    """Year 0 fails IntegerField(min_value=1) constraint."""
    from main.content_generation.request_forms import YearPageForm

    form = YearPageForm({"year": 0})
    assert not form.is_valid()


@pytest.mark.django_db
def test_day_page_form_valid():
    """A valid year/month/day combo should pass."""
    from main.content_generation.request_forms import DayPageForm

    create_mock_entry()
    form = DayPageForm({"year": 2025, "month": "February", "day": 12})
    assert form.is_valid()


@pytest.mark.django_db
def test_day_page_form_impossible_date():
    """February 31 should fail validation."""
    from main.content_generation.request_forms import DayPageForm

    form = DayPageForm({"year": 2025, "month": "February", "day": 31})
    assert not form.is_valid()


@pytest.mark.django_db
def test_save_entry_form_valid():
    """SaveEntryForm needs a name slug and non-empty content."""
    from main.content_generation.request_forms import SaveEntryForm

    form = SaveEntryForm(
        {"name": "2025-02-12"},
        content={"paragraph1": {"text": "Hello", "height": "200"}},
    )
    assert form.is_valid()


@pytest.mark.django_db
def test_save_entry_form_no_content():
    """SaveEntryForm should reject a submission with no content."""
    from main.content_generation.request_forms import SaveEntryForm

    form = SaveEntryForm({"name": "2025-02-12"}, content={})
    assert not form.is_valid()


@pytest.mark.django_db
def test_delete_entry_form_valid():
    """DeleteEntryForm should accept an existing entry slug."""
    from main.forms import DeleteEntryForm

    entry = create_mock_entry()
    form = DeleteEntryForm({"entry": "2025-02-12"})
    assert form.is_valid()
    assert form.cleaned_data["entry"] == entry


@pytest.mark.django_db
def test_delete_entry_form_nonexistent():
    """DeleteEntryForm should reject a slug not in the database."""
    from main.forms import DeleteEntryForm

    form = DeleteEntryForm({"entry": "9999-12-31"})
    assert not form.is_valid()


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
