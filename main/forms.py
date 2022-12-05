
from django import forms
from django.forms import ModelForm
import re
import os
from pathlib import Path
from datetime import datetime

import main.models as models

from tinymce.widgets import TinyMCE


class TinyMCEComponent(ModelForm):

    content = forms.CharField(widget=TinyMCE(
        attrs={'cols': 80, 'rows': 30, 'required': False}
    ))
    name = forms.SlugField(max_length=10)

    class Meta:
        model = models.Entry
        fields = '__all__'


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
        file_path = self.cleaned_data['file_path']

        if len(file_path) == 0:
            raise forms.ValidationError("Path is empty")

        if "." not in file_path:
            raise forms.ValidationError(f"Path '{file_path}' has no extention")

        file_path = f"{os.getcwd()}\\Images\\{file_path}"
        file_obj = Path(file_path)
        if not file_obj.exists():
            raise forms.ValidationError(f"Cannot find '{file_path}' in <b>Images</b> folder")

        if file_obj.suffix.lower() not in ['.png', '.jpg', '.jpeg']:
            raise forms.ValidationError(f"Extension '{file_obj.suffix}' is not a recognised image extension")

        return file_path


class ParagraphForm(ModelForm):

    class Meta:
        model = models.EntryParagraph
        fields = '__all__'


CONTENT_FORMS = {
    'image': ImageForm,
    'paragraph': ParagraphForm,
}


class ContentForm(ModelForm):

    class Meta:
        model = models.Content
        fields = '__all__'

    def clean(self):
        clean_data = super().clean()
        content_type = clean_data['content_type']
        if content_type not in models.CONTENT_MODELS:
            raise forms.ValidationError(f"Content type {content_type} not recognised")
