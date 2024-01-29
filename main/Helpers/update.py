from typing import Callable

import main.models as models


def updateEntryImage(entry_image: models.EntryImage) -> models.EntryImage:
    return entry_image


def updateImages(func: Callable):
    for entry_image in models.EntryImage.objects.all():
        entry_image = func(entry_image)
        entry_image.save()
