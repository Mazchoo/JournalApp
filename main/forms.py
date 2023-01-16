
from django import forms
from django.forms import ModelForm, Form
from django.db import models as django_models
import re
from pathlib import Path
from datetime import datetime

import main.models as models
from main.Helpers.image_utils import moveImageToSavePath
from main.Helpers.image_constants import ImageConstants
from main.Helpers.file_utils import (pathHasImageTag, getStoredImagePath,
                                     getImageBaseFolderPath)

from tinymce.widgets import TinyMCE


class EntryForm(ModelForm):

    class Meta:
        model = models.Entry
        fields = ['name', 'first_created', 'last_edited', 'date']

    def clean_date(self):
        clean_data = super().clean()
        name = clean_data['name']
        date_match = re.search(r"(\d{4})\-0?(\d+)\-0?(\d+)", name)

        if not date_match:
            raise forms.ValidationError("Name must be a data slug yyyy-mm-dd")

        year, month, day = date_match.group(1), date_match.group(2), date_match.group(3)
        year, month, day = eval(year), eval(month), eval(day)

        try:
            entry_date = datetime(year, month, day)
        except:
            raise forms.ValidationError(f"Name must a real date {year}-{month}-{day}")

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
            raise forms.ValidationError(f"Path '{file_name}' has no extention")

        target_path = getStoredImagePath(file_name, entry.name)
        source_path = getImageBaseFolderPath(file_name)
        target_file_obj = Path(target_path)
        source_file_obj = Path(source_path)

        if not target_file_obj.exists() and not source_file_obj.exists():
            raise forms.ValidationError(f"Cannot find '{file_name}' in /Images folder.")

        if target_file_obj.suffix.lower() not in ImageConstants.supported_extensions:
            raise forms.ValidationError(f"Extension '{target_file_obj.suffix}' is not a recognised image extension")

        if pathHasImageTag(target_file_obj):
            raise forms.ValidationError(f"File '{target_file_obj.stem}' uses reserved tag in {ImageConstants.reserved_image_tags}")

        moveImageToSavePath(target_path, file_name)

        return target_path


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
        if content_type not in models.CONTENT_MODELS:
            raise forms.ValidationError(f"Content type {content_type} not recognised")


CONTENT_FORMS = {
    'image': ImageForm,
    'paragraph': TinyMCEComponent,
}


class FullImagePath(Form):
    name = forms.SlugField(max_length=10)
    file = forms.CharField(max_length=256)

    def clean_file(self):
        clean_data = super().clean()
        target_path = getStoredImagePath(clean_data["file"], clean_data["name"])

        if not Path(target_path).exists():
            raise forms.ValidationError(f"File {target_path} does not exist")

        return target_path
