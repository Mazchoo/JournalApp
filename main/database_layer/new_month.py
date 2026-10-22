"""Queries for the first icon stored in a month."""

from django.db.models import Model

from main.models import EntryImage, EntryMesh, EntryVideo

_ICON_MODELS = (EntryImage, EntryVideo, EntryMesh)


def _month_has_icon(year: int, month: int) -> bool:
    """True when this month already stores an image, video, or mesh."""
    return any(
        model.objects.filter(entry__year=year, entry__month=month).exists()
        for model in _ICON_MODELS
    )


def is_new_month_icon(instance: Model) -> bool:
    """True when this unsaved row is the month's first image, video, or mesh."""
    entry = getattr(instance, "entry", None)
    if entry is None:
        return False

    if type(instance).objects.filter(pk=instance.pk).exists():
        return False

    return not _month_has_icon(entry.year, entry.month)
