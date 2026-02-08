"""Data validation to create or edit models"""

from pathlib import Path

from django import forms
from django.forms import ModelForm
from django.db import models as django_models
from tinymce.widgets import TinyMCE  # type: ignore

from main.models import Entry, EntryImage, EntryParagraph, EntryVideo, Content
from main.utils.image import move_image_to_save_path
from main.utils.file_io import (
    path_has_image_extension,
    get_stored_media_path,
    get_base_entry_path,
    make_image_path_relative,
    move_media_to_save_path,
)
from main.config.image_constants import ImageConstants
from main.config.video_constants import VideoConstants
from main.content_generation.content_factory_models import CONTENT_MODELS
from main.database_layer.date_slugs import get_valid_date_from_slug


class EntryForm(ModelForm):
    """A dated journal entry - at most one entry per date"""

    class Meta:
        model = Entry
        fields = ["name", "first_created", "last_edited", "date"]

    def clean_date(self):
        """Convert slug string into date object"""
        clean_data = super().clean()
        if clean_data is None:
            raise forms.ValidationError("Date is not defined")

        name = clean_data["name"]
        entry_date = get_valid_date_from_slug(name)

        if entry_date is None:
            raise forms.ValidationError(f"Entry must have a real date {name}")

        return entry_date


class ImageForm(ModelForm):
    """Image content that belongs to an entry form"""

    class Meta:
        model = EntryImage
        fields = "__all__"

    def clean_file_path(self):
        """Ensure file path refers to usuable file"""
        clean_data = super().clean()
        if clean_data is None:
            raise forms.ValidationError("File path is not defined")

        file_name = clean_data["file_path"]
        entry = clean_data["entry"]

        if len(file_name) == 0:
            raise forms.ValidationError("Path is empty")

        if "." not in file_name:
            raise forms.ValidationError(f"Path '{file_name}' has no extension")

        target_path = get_stored_media_path(file_name, entry.name)
        target_file_obj = Path(target_path)

        source_path = get_base_entry_path(file_name)
        source_file_obj = Path(source_path)

        if not target_file_obj.exists() and not source_file_obj.exists():
            raise forms.ValidationError(f"Cannot find '{file_name}' in Entries folder.")

        if target_file_obj.suffix.lower() not in ImageConstants.supported_extensions:
            message = f"Extension '{target_file_obj.suffix}' is not a recognised image extension"
            raise forms.ValidationError(message)

        if path_has_image_extension(target_file_obj):
            message = f"File '{target_file_obj.stem}' uses reserved tag in {ImageConstants.reserved_image_tags}"
            raise forms.ValidationError(message)

        move_image_to_save_path(target_path, file_name)

        return make_image_path_relative(target_path)


class VideoForm(ModelForm):
    """Form to create a video content for entry"""

    class Meta:
        model = EntryVideo
        fields = "__all__"

    def clean_file_path(self):
        """Ensure file path refers to usuable file"""
        clean_data = super().clean()
        if clean_data is None:
            raise forms.ValidationError("File path is not defined")

        file_name = clean_data["file_path"]
        entry = clean_data["entry"]

        if len(file_name) == 0:
            raise forms.ValidationError("Path is empty")

        if "." not in file_name:
            raise forms.ValidationError(f"Path '{file_name}' has no extension")

        target_path = get_stored_media_path(file_name, entry.name)
        target_file_obj = Path(target_path)

        source_path = get_base_entry_path(file_name)
        source_file_obj = Path(source_path)

        if not target_file_obj.exists() and not source_file_obj.exists():
            raise forms.ValidationError(f"Cannot find folder '{source_path}'")

        if target_file_obj.suffix.lower() not in VideoConstants.supported_extensions:
            message = f"Extension '{target_file_obj.suffix}' is not a recognised image extension"
            raise forms.ValidationError(message)

        move_media_to_save_path(target_path, file_name)
        return make_image_path_relative(target_path)


class ParagraphForm(ModelForm):
    """Text content in journal entry"""

    text = forms.CharField(
        widget=TinyMCE(attrs={"cols": 80, "rows": 30, "required": False})
    )
    entry = django_models.ForeignKey(Entry, on_delete=django_models.CASCADE)

    class Meta:
        model = EntryParagraph
        fields = "__all__"


class DeleteEntryForm(forms.Form):
    """Validate request to delete a journal entry"""

    entry = forms.SlugField(max_length=10)

    def clean_entry(self):
        """Ensure entry exists and return the entry object"""
        entry_name = self.cleaned_data["entry"]
        entry = Entry.objects.filter(name=entry_name).first()

        if entry is None:
            raise forms.ValidationError(f"Invalid entry {entry_name}")

        return entry


class ContentForm(ModelForm):
    """Generic content that applies to all content types e.g. image, text, ect."""

    class Meta:
        model = Content
        fields = "__all__"

    def clean(self):
        """Ensure content type can refer to model"""
        clean_data = super().clean()
        if clean_data is None:
            raise forms.ValidationError("No data provided")

        content_type = clean_data["content_type"]
        if content_type not in CONTENT_MODELS:
            raise forms.ValidationError(f"Content type {content_type} not recognised")
