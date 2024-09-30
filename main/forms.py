
from django import forms
from django.forms import ModelForm
from django.db import models as django_models
from pathlib import Path
from tinymce.widgets import TinyMCE  # type: ignore

import main.models as models
from main.Helpers.image_utils import moveImageToSavePath
from main.Helpers.image_constants import ImageConstants
from main.Helpers.video_constants import VideoConstants
from main.Helpers.file_utils import (pathHasImageTag, getStoredMediaPath,
                                     getMediaPath, makeImagePathRelative, moveMediaToSavePath)
from main.ContentGeneration.content_factory_models import CONTENT_MODELS
from main.Helpers.date_slugs import getValidDateFromSlug


class EntryForm(ModelForm):

    class Meta:
        model = models.Entry
        fields = ['name', 'first_created', 'last_edited', 'date']

    def clean_date(self):
        clean_data = super().clean()
        name = clean_data['name']

        entry_date = getValidDateFromSlug(name)

        if entry_date is None:
            raise forms.ValidationError(f"Entry must have a real date {name}")

        return entry_date


class ImageForm(ModelForm):

    class Meta:
        model = models.EntryImage
        fields = '__all__'

    def clean_file_path(self):
        clean_data = super().clean()
        file_name = clean_data['file_path']
        entry = clean_data['entry']

        if len(file_name) == 0:
            raise forms.ValidationError("Path is empty")

        if "." not in file_name:
            raise forms.ValidationError(f"Path '{file_name}' has no extension")

        target_path = getStoredMediaPath(file_name, entry.name)
        target_file_obj = Path(target_path)

        source_path = getMediaPath(file_name)
        source_file_obj = Path(source_path)

        if not target_file_obj.exists() and not source_file_obj.exists():
            raise forms.ValidationError(f"Cannot find '{file_name}' in /Images folder.")

        if target_file_obj.suffix.lower() not in ImageConstants.supported_extensions:
            message = f"Extension '{target_file_obj.suffix}' is not a recognised image extension"
            raise forms.ValidationError(message)

        if pathHasImageTag(target_file_obj):
            message = f"File '{target_file_obj.stem}' uses reserved tag in {ImageConstants.reserved_image_tags}"
            raise forms.ValidationError(message)

        moveImageToSavePath(target_path, file_name)

        return makeImagePathRelative(target_path)


class VideoForm(ModelForm):

    class Meta:
        model = models.EntryVideo
        fields = '__all__'

    def clean_file_path(self):
        clean_data = super().clean()
        file_name = clean_data['file_path']
        entry = clean_data['entry']

        if len(file_name) == 0:
            raise forms.ValidationError("Path is empty")

        if "." not in file_name:
            raise forms.ValidationError(f"Path '{file_name}' has no extension")

        target_path = getStoredMediaPath(file_name, entry.name)
        target_file_obj = Path(target_path)

        source_path = getMediaPath(file_name)
        source_file_obj = Path(source_path)

        if not target_file_obj.exists() and not source_file_obj.exists():
            raise forms.ValidationError(f"Cannot find folder '{source_path}'")

        if target_file_obj.suffix.lower() not in VideoConstants.supported_extensions:
            message = f"Extension '{target_file_obj.suffix}' is not a recognised image extension"
            raise forms.ValidationError(message)

        moveMediaToSavePath(target_path, file_name)

        return makeImagePathRelative(target_path)


class TinyMCEComponent(ModelForm):

    text = forms.CharField(widget=TinyMCE(
        attrs={'cols': 80, 'rows': 30, 'required': False}
    ))
    entry = django_models.ForeignKey(models.Entry, on_delete=django_models.CASCADE)

    class Meta:
        model = models.EntryParagraph
        fields = '__all__'


class ContentForm(ModelForm):

    class Meta:
        model = models.Content
        fields = '__all__'

    def clean(self):
        clean_data = super().clean()
        content_type = clean_data['content_type']
        if content_type not in CONTENT_MODELS:
            raise forms.ValidationError(f"Content type {content_type} not recognised")
