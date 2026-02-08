"""Forms to get full images and move an entry to another date"""

from pathlib import Path

from django.forms import Form, SlugField, CharField, ValidationError

from main.utils.file_io import get_stored_media_path
from main.models import Entry
from main.database_layer.date_slugs import get_valid_date_from_slug
# ToDo - forms probably belong in one place


class FullImagePath(Form):
    """Request a full image path"""

    name = SlugField()
    file = CharField(max_length=256)

    def clean_file(self) -> CharField:
        """Get validated file path"""
        clean_data = super().clean()
        target_path = get_stored_media_path(clean_data["file"], clean_data["name"])

        if not Path(target_path).exists():
            raise ValidationError(f"File {target_path} does not exist")

        return target_path


class DateMoveForm(Form):
    """Request to move from one date to another"""

    move_from = SlugField()
    move_to = SlugField()

    def clean_move_from(self) -> SlugField:
        """Ensure moving from date is valid"""
        clean_data = super().clean()
        move_from = clean_data["move_from"]

        if not Entry.objects.filter(pk=move_from).exists():
            raise ValidationError(f"Source date {move_from} is not saved")

        return move_from

    def clean_move_to(self) -> SlugField:
        """Ensure moving to date is valid"""
        clean_data = super().clean()
        move_to = clean_data["move_to"]

        if not get_valid_date_from_slug(move_to):
            raise ValidationError(f"Destination date must be a real date {move_to}")

        if Entry.objects.filter(pk=move_to).exists():
            raise ValidationError(f"Destination date {move_to} already exists")

        return move_to
