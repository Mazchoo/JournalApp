
from django import forms
from django.forms import Form
from pathlib import Path

from main.Helpers.file_utils import getStoredImagePath
import main.models as models
from main.Helpers.date_slugs import getValidDateFromSlug


class FullImagePath(Form):
    name = forms.SlugField(max_length=10)
    file = forms.CharField(max_length=256)

    def clean_file(self):
        clean_data = super().clean()
        target_path = getStoredImagePath(clean_data["file"], clean_data["name"])

        if not Path(target_path).exists():
            raise forms.ValidationError(f"File {target_path} does not exist")

        return target_path


class DateMoveForm(Form):
    move_from = forms.SlugField(max_length=10)
    move_to = forms.SlugField(max_length=10)

    def clean_move_from(self):
        clean_data = super().clean()
        move_from = clean_data['move_from']

        if not models.Entry.objects.filter(pk=move_from).exists():
            raise forms.ValidationError(f"Source date {move_from} is not saved")
        
        return move_from

    def clean_move_to(self):
        clean_data = super().clean()
        move_to = clean_data['move_to']

        if not getValidDateFromSlug(move_to):
            raise forms.ValidationError(f"Destination date must be a real date {move_to}")

        if models.Entry.objects.filter(pk=move_to).exists():
            raise forms.ValidationError(f"Destination date {move_to} already exists")
        
        return move_to
