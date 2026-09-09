"""
Root conftest.py for pytest-django.

pytest-django reads DJANGO_SETTINGS_MODULE from setup.cfg's [tool:pytest]
section and handles Django initialization automatically.

Journal.settings loads the live ENTRY_FOLDER from security.json. Tests that
save, move, or delete the shared mock date (2025-02-12) must never touch that
folder. The autouse fixture below redirects every test onto pytest's temp dir
and refuses shutil.move calls that still resolve under the live journal.
"""

from pathlib import Path

import pytest
from django.conf import settings as django_settings

import main.content_generation.delete_entry as delete_entry
from main.utils import file_io


@pytest.fixture(scope="session")
def live_journal_root() -> Path:
    """Resolved live ENTRY_FOLDER captured before tests redirect it."""
    return Path(django_settings.ENTRY_FOLDER).resolve()


def _path_is_under(path: Path, root: Path) -> bool:
    resolved = path.resolve()
    return resolved == root or root in resolved.parents


@pytest.fixture(autouse=True)
def isolate_entry_folder(tmp_path, monkeypatch, settings, live_journal_root):
    """Point ENTRY_FOLDER at tmp_path and block moves into the live journal."""
    settings.ENTRY_FOLDER = str(tmp_path)
    monkeypatch.setattr("Journal.settings.ENTRY_FOLDER", str(tmp_path))
    monkeypatch.setattr(file_io, "ENTRY_FOLDER", str(tmp_path))
    monkeypatch.setattr(file_io, "RESOLVED_ENTRY_FOLDER", tmp_path.resolve())

    real_file_io_move = file_io.move
    real_delete_move = delete_entry.move

    def _deny_live_journal(src, dst) -> None:
        for raw in (src, dst):
            if _path_is_under(Path(raw), live_journal_root):
                raise RuntimeError(
                    f"Test tried to modify the live journal folder ({raw}). "
                    "File operations must use the isolated ENTRY_FOLDER temp directory."
                )

    def guarded_file_io_move(src, dst, *args, **kwargs):
        _deny_live_journal(src, dst)
        return real_file_io_move(src, dst, *args, **kwargs)

    def guarded_delete_move(src, dst, *args, **kwargs):
        _deny_live_journal(src, dst)
        return real_delete_move(src, dst, *args, **kwargs)

    monkeypatch.setattr(file_io, "move", guarded_file_io_move)
    monkeypatch.setattr(delete_entry, "move", guarded_delete_move)
