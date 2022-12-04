from django.db.models import Model
from django.db import models
import base64
from pathlib import Path


class Content(Model):
    content_type = models.CharField(max_length=10)
    content_id   = models.BigIntegerField()

    def __str__(self):
        return f"{self.content_type}{self.content_id}"


class Entry(Model):
    name           = models.SlugField(max_length=10, primary_key=True)
    date           = models.DateTimeField()
    first_created  = models.DateTimeField()
    last_edited    = models.DateTimeField()
    content        = models.ManyToManyField(Content)
    thumbnail_path = models.CharField(max_length=256)

    def __str__(self):
        return f"Entry {self.name} - last modified - {self.last_edited}"


class EntryImage(Model):
    entry     = models.ForeignKey(Entry, on_delete=models.CASCADE)
    file_path = models.CharField(max_length=256)
    original  = models.BooleanField()

    def __repr__(self):
        return f"image{self.pk} - Entry {self.entry.name}"

    def __str__(self):
        return self.base64

    def view(self):
        with open(self.file_path, "rb") as img_file:
            b64_string = base64.b64encode(img_file.read()).decode('utf-8')
        file_path = Path(self.file_path)
        file_name = file_path.stem + file_path.suffix

        if file_path.suffix in [".jpg", ".jpeg"]:
            ecoding_type = "jpeg"
        elif file_path.suffix == ".png":
            ecoding_type = "png"
        else:
            raise ValueError("Unknown image extension")

        return  {
            "base64":    f"data:image/{ecoding_type};base64,{b64_string}",
            "file_name": file_name,
            "original":  int(self.original)
        }


class EntryParagraph(Model):
    entry = models.ForeignKey(Entry, on_delete=models.CASCADE)
    text  = models.TextField()

    def __repr__(self):
        return f"paragraph{self.pk} - Entry {self.entry.name}"

    def __str__(self):
        return self.text
    
    def view(self):
        return  {
            "text": self.text,
        }


CONTENT_MODELS = {
    'image': EntryImage,
    'paragraph': EntryParagraph,
}
