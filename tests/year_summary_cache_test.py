"""Home-page year summary cache invalidation when a month icon is new."""

from datetime import datetime
from unittest.mock import patch

import pytest

from main.database_layer.get_all_years_summary import get_all_year_summary_information
from main.forms import ImageForm, MeshForm, VideoForm
from main.models import Camera, Entry


def _prime_cache(years: tuple[int, ...]):
    get_all_year_summary_information.cache_clear()
    with patch(
        "main.database_layer.get_all_years_summary.get_random_images_from_year",
        return_value=["icon"],
    ):
        get_all_year_summary_information(years)
    assert get_all_year_summary_information.cache_info().currsize == 1


def _entry(name: str, year: int, month: int, day: int) -> Entry:
    return Entry.objects.create(
        name=name,
        year=year,
        month=month,
        day=day,
        first_created=datetime(year, month, day, 9, 0, 0),
        last_edited=datetime(year, month, day, 9, 0, 0),
    )


def _save_without_files(form, entry: Entry, file_path: str, cleaned: dict):
    """Persist icon-bearing content without moving files or writing icons."""
    form.instance.entry = entry
    form.instance.file_path = file_path
    form._errors = {}
    form.cleaned_data = cleaned
    return form.save()


def _save_image(entry: Entry, file_path: str):
    """Persist an image without moving files or writing icons."""
    form = ImageForm({"file_path": file_path, "allow_ai_synthesis": "0"})
    form.instance.allow_ai_synthesis = False
    return _save_without_files(
        form,
        entry,
        file_path,
        {"file_path": file_path, "allow_ai_synthesis": False},
    )


def _save_video(entry: Entry, file_path: str):
    """Persist a video without moving files or writing icons."""
    form = VideoForm({"file_path": file_path, "allow_ai_synthesis": "0"})
    form.instance.allow_ai_synthesis = False
    return _save_without_files(
        form,
        entry,
        file_path,
        {"file_path": file_path, "allow_ai_synthesis": False},
    )


def _save_mesh(entry: Entry, file_path: str):
    """Persist a mesh without moving files or writing icons."""
    form = MeshForm({"file_path": file_path, "image_path": "preview.jpeg"})
    form.instance.image_path = "preview.jpeg"
    return _save_without_files(
        form,
        entry,
        file_path,
        {"file_path": file_path, "image_path": "preview.jpeg", "camera": Camera()},
    )


@pytest.mark.django_db
def test_first_image_in_a_month_clears_the_year_summary_cache(
    django_capture_on_commit_callbacks,
):
    """The first image in a month drops the cached home-page icons."""
    january = _entry("2026-01-01", 2026, 1, 1)
    _prime_cache((2026,))

    with django_capture_on_commit_callbacks(execute=True):
        _save_image(january, "photo.jpg")

    assert get_all_year_summary_information.cache_info().currsize == 0
    get_all_year_summary_information.cache_clear()


@pytest.mark.django_db
def test_first_image_in_another_month_clears_the_year_summary_cache(
    django_capture_on_commit_callbacks,
):
    """A year that already has images still drops the cache for a new month."""
    january = _entry("2026-01-01", 2026, 1, 1)
    march = _entry("2026-03-04", 2026, 3, 4)
    _save_image(january, "january.jpg")
    _prime_cache((2026,))

    with django_capture_on_commit_callbacks(execute=True):
        _save_image(march, "march.jpg")

    assert get_all_year_summary_information.cache_info().currsize == 0
    get_all_year_summary_information.cache_clear()


@pytest.mark.django_db
def test_another_image_in_the_same_month_keeps_the_year_summary_cache(
    django_capture_on_commit_callbacks,
):
    """A further image in a month that already has one leaves the cache in place."""
    january = _entry("2026-01-01", 2026, 1, 1)
    _save_image(january, "first.jpg")
    _prime_cache((2026,))

    with django_capture_on_commit_callbacks(execute=True):
        _save_image(january, "second.jpg")

    assert get_all_year_summary_information.cache_info().currsize == 1
    get_all_year_summary_information.cache_clear()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "save_media, file_path",
    [(_save_video, "clip.mp4"), (_save_mesh, "scan.glb")],
)
def test_first_video_or_mesh_in_a_month_clears_the_year_summary_cache(
    django_capture_on_commit_callbacks,
    save_media,
    file_path,
):
    """The first video or mesh in a month drops the cached home-page icons."""
    january = _entry("2026-01-01", 2026, 1, 1)
    _prime_cache((2026,))

    with django_capture_on_commit_callbacks(execute=True):
        save_media(january, file_path)

    assert get_all_year_summary_information.cache_info().currsize == 0
    get_all_year_summary_information.cache_clear()


@pytest.mark.django_db
def test_video_in_a_month_that_already_has_an_image_keeps_the_cache(
    django_capture_on_commit_callbacks,
):
    """A month that already has an icon keeps the cache when a video is added."""
    january = _entry("2026-01-01", 2026, 1, 1)
    _save_image(january, "photo.jpg")
    _prime_cache((2026,))

    with django_capture_on_commit_callbacks(execute=True):
        _save_video(january, "clip.mp4")

    assert get_all_year_summary_information.cache_info().currsize == 1
    get_all_year_summary_information.cache_clear()


@pytest.mark.django_db
def test_image_in_a_month_that_already_has_a_mesh_keeps_the_cache(
    django_capture_on_commit_callbacks,
):
    """A month that already has a mesh keeps the cache when an image is added."""
    january = _entry("2026-01-01", 2026, 1, 1)
    _save_mesh(january, "scan.glb")
    _prime_cache((2026,))

    with django_capture_on_commit_callbacks(execute=True):
        _save_image(january, "photo.jpg")

    assert get_all_year_summary_information.cache_info().currsize == 1
    get_all_year_summary_information.cache_clear()
