"""Tests for content request forms."""

from main.content_generation.request_forms import FullContentPath


def test_full_content_path_rejects_file_outside_entry_folder(tmp_path, settings):
    """A `file` containing `..` must not validate."""
    entries = tmp_path / "entries"
    (entries / "2025" / "02" / "12").mkdir(parents=True)
    (tmp_path / "secret.txt").write_text("private")
    settings.ENTRY_FOLDER = str(entries)

    form = FullContentPath({"name": "2025-02-12", "file": "../../../../secret.txt"})

    assert not form.is_valid()


def test_full_content_path_rejects_malformed_date_name():
    """A `name` that is not year-month-day must not validate."""
    form = FullContentPath({"name": "abc", "file": "photo.jpg"})

    assert not form.is_valid()
    assert "file" in form.errors
