"""Forms for page requests, full content, and date moves"""

from pathlib import Path
from typing import Optional

from django.forms import Form, SlugField, CharField, IntegerField, ValidationError

from main.config.date_constants import DateConstants
from main.database_layer.date_slugs import date_exists, get_valid_date_from_slug
from main.models import Entry
from main.utils.file_io import get_stored_media_path


class MonthNameForm(Form):
    """Validates that a month parameter is a valid month name."""

    month = CharField()

    def clean_month(self) -> str:
        """Ensure month is a valid month name."""
        month = self.cleaned_data["month"]
        if month not in DateConstants.month_names:
            raise ValidationError(f"month must be one of {DateConstants.month_names}")
        return month


class YearPageForm(Form):
    """Validated year parameter from URL."""

    year = IntegerField(min_value=1)

    def clean_year(self) -> int:
        """Ensure year exists in the database."""
        year = self.cleaned_data["year"]
        if not date_exists(year):
            raise ValidationError(f"Year {year} not found")
        return year


class MonthPageForm(Form):
    """Validated year and month parameters from URL."""

    year = IntegerField(min_value=1)
    month = CharField()

    def clean_month(self) -> str:
        """Ensure month is a valid month name."""
        month = self.cleaned_data["month"]
        if month not in DateConstants.month_names:
            raise ValidationError(f"month must be one of {DateConstants.month_names}")
        return month

    def clean(self) -> dict:
        """Ensure the year/month combination exists in the database."""
        cleaned_data = super().clean()
        if cleaned_data is None:
            return {}
        year = cleaned_data.get("year")
        month = cleaned_data.get("month")
        if year and month and not date_exists(year, month):
            raise ValidationError(f"{month} {year} not found")
        return cleaned_data


class DayPageForm(Form):
    """Validated year, month, and day parameters from URL."""

    year = IntegerField(min_value=1)
    month = CharField()
    day = IntegerField(min_value=1, max_value=31)

    def clean_month(self) -> str:
        """Ensure month is a valid month name."""
        month = self.cleaned_data["month"]
        if month not in DateConstants.month_names:
            raise ValidationError(f"month must be one of {DateConstants.month_names}")
        return month

    def clean(self) -> dict:
        """Ensure the year/month/day combination exists in the database."""
        cleaned_data = super().clean()
        if cleaned_data is None:
            return {}
        year = cleaned_data.get("year")
        month = cleaned_data.get("month")
        day = cleaned_data.get("day")
        if year and month and day and not date_exists(year, month, day):
            raise ValidationError(f"{day} {month} {year} not found")
        return cleaned_data


class FullContentPath(Form):
    """Request a full image or video path - not the reduced version"""

    name = SlugField()
    file = CharField(max_length=256)

    def clean_file(self) -> str:
        """Get validated file path"""
        clean_data = super().clean()
        if clean_data is None:
            raise ValidationError("FullContentPath has no file provided")

        target_path = get_stored_media_path(clean_data["file"], clean_data["name"])

        if not Path(target_path).exists():
            raise ValidationError(f"File {target_path} does not exist")

        return target_path


class DateMoveForm(Form):
    """Request to move from one date to another"""

    move_from = SlugField()
    move_to = SlugField()

    def clean_move_from(self) -> str:
        """Ensure moving from date is valid"""
        clean_data = super().clean()
        if clean_data is None:
            raise ValidationError("DateMoveForm no move_from provided")
        move_from = clean_data["move_from"]

        if not Entry.objects.filter(pk=move_from).exists():
            raise ValidationError(f"Source date {move_from} is not saved")

        return move_from

    def clean_move_to(self) -> str:
        """Ensure moving to date is valid"""
        clean_data = super().clean()
        if clean_data is None:
            raise ValidationError("DateMoveForm no move_to provided")
        move_to = clean_data["move_to"]

        if not get_valid_date_from_slug(move_to):
            raise ValidationError(f"Destination date must be a real date {move_to}")

        if Entry.objects.filter(pk=move_to).exists():
            raise ValidationError(f"Destination date {move_to} already exists")

        return move_to


class SaveEntryForm(Form):
    """Validate request to save a journal entry"""

    name = SlugField()

    def __init__(self, *args, content: Optional[dict] = None, **kwargs):
        super().__init__(*args, **kwargs)
        self.content: dict = content or {}

    def clean(self) -> dict:
        """Ensure content is provided"""
        cleaned_data = super().clean()
        if cleaned_data is None:
            return {}
        if not self.content:
            raise ValidationError("No content in entry")
        return cleaned_data
