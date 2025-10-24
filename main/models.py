from django.db.models import Model
from django.db import models
from pathlib import Path

from main.Helpers.image_utils import parseBase64ImageData
from main.Helpers.file_utils import getMediaPath
from main.Helpers.video_utils import getCollageBase64Data


class Content(Model):
    content_type = models.CharField(max_length=10)
    content_id = models.BigIntegerField()

    def __str__(self):
        return f"{self.content_type}{self.content_id}"


class Entry(Model):
    name = models.SlugField(max_length=10, primary_key=True)
    date = models.DateTimeField()
    first_created = models.DateTimeField()
    last_edited = models.DateTimeField()
    content = models.ManyToManyField(Content)  # type: models.ManyToManyField

    def __str__(self):
        return f"Entry {self.name} - last modified - {self.last_edited}"


class EntryImage(Model):
    entry = models.ForeignKey(Entry, on_delete=models.CASCADE)
    file_path = models.CharField(max_length=256)
    original = models.BooleanField()

    def __repr__(self):
        return f"image{self.pk} - Entry {self.entry.name}"

    def __str__(self):
        return self.file_path

    def view(self):
        full_path = getMediaPath(self.file_path)
        file_name = Path(self.file_path).name
        b64_string = parseBase64ImageData(full_path)

        return {
            "base64": b64_string,
            "file_name": file_name,
            "original": int(self.original),
        }


class EntryVideo(Model):
    entry = models.ForeignKey(Entry, on_delete=models.CASCADE)
    file_path = models.CharField(max_length=256)
    original = models.BooleanField()

    def __repr__(self):
        return f"video{self.pk} - Entry {self.entry.name}"

    def __str__(self):
        return self.file_path

    def view(self):
        full_path = getMediaPath(self.file_path)
        file_name = Path(self.file_path).name
        b64_string = getCollageBase64Data(full_path)

        return {
            "base64": b64_string,
            "file_name": file_name,
            "original": int(self.original),
        }


class EntryParagraph(Model):
    entry = models.ForeignKey(Entry, on_delete=models.CASCADE)
    text = models.TextField()
    height = models.IntegerField()

    def __repr__(self):
        return f"paragraph{self.pk} - Entry {self.entry.name}"

    def __str__(self):
        return self.text

    def view(self):
        return {"text": self.text, "height": self.height}
