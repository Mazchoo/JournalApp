"""Defintition of information need to use dated entries and contents of entries"""

from pathlib import Path

from django.db.models import Model
from django.db import models


class Content(Model):
    """Stored data added to an entry (e.g. text, image, ect.)"""

    content_type = models.CharField(max_length=10)
    content_id = models.BigIntegerField()

    def __str__(self):
        return f"{self.content_type}{self.content_id}"


class Entry(Model):
    """A dated journal entry"""

    name = models.SlugField(max_length=10, primary_key=True)
    date = models.DateTimeField()
    first_created = models.DateTimeField()
    last_edited = models.DateTimeField()
    content = models.ManyToManyField(Content)  # type: models.ManyToManyField

    def __str__(self):
        return f"Entry {self.name} - last modified - {self.last_edited}"


class EntryImage(Model):
    """Image content added to an entry"""

    entry = models.ForeignKey(Entry, on_delete=models.CASCADE)
    file_path = models.CharField(max_length=256)
    original = models.BooleanField()

    def __repr__(self):
        return f"image{self.pk} - Entry {self.entry.name}"

    def __str__(self):
        return str(self.file_path)

    def view(self) -> dict:
        """Web displayable view - returns image_id for async loading"""
        file_name = Path(self.file_path).name
        return {
            "image_id": self.pk,
            "file_name": file_name,
            "original": int(self.original),
        }


class EntryVideo(Model):
    """Video content added to an entry"""

    entry = models.ForeignKey(Entry, on_delete=models.CASCADE)
    file_path = models.CharField(max_length=256)
    original = models.BooleanField()

    def __repr__(self):
        return f"video{self.pk} - Entry {self.entry.name}"

    def __str__(self):
        return str(self.file_path)

    def view(self) -> dict:
        """Web displayable view - returns video_id for async loading"""
        file_name = Path(self.file_path).name
        return {
            "video_id": self.pk,
            "file_name": file_name,
            "original": int(self.original),
        }


class EntryParagraph(Model):
    """Text added to an entry"""

    entry = models.ForeignKey(Entry, on_delete=models.CASCADE)
    text = models.TextField()
    height = models.IntegerField()

    def __repr__(self):
        return f"paragraph{self.pk} - Entry {self.entry.name}"

    def __str__(self):
        return str(self.text)

    def view(self) -> dict:
        """Web displayable view"""
        return {"text": self.text, "height": self.height}
