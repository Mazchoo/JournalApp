"""Tests for content request forms."""

from main.content_generation.request_forms import FullContentPath


def test_full_content_path_rejects_file_outside_entry_folder(tmp_path, monkeypatch):
    """A `file` containing `..` must not validate."""
    entries = tmp_path / "entries"
    (entries / "2025" / "02" / "12").mkdir(parents=True)
    (tmp_path / "secret.txt").write_text("private")
    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(entries))
    monkeypatch.setattr("main.utils.file_io.RESOLVED_ENTRY_FOLDER", entries.resolve())

    form = FullContentPath({"name": "2025-02-12", "file": "../../../../secret.txt"})

    assert not form.is_valid()


def test_full_content_path_rejects_malformed_date_name(tmp_path, monkeypatch):
    """A `name` that is not year-month-day must not validate."""
    entries = tmp_path / "entries"
    monkeypatch.setattr("main.utils.file_io.ENTRY_FOLDER", str(entries))
    monkeypatch.setattr("main.utils.file_io.RESOLVED_ENTRY_FOLDER", entries.resolve())

    form = FullContentPath({"name": "abc", "file": "photo.jpg"})

    assert not form.is_valid()
    assert "file" in form.errors
