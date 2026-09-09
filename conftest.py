"""
Root conftest.py for pytest-django.

pytest-django reads DJANGO_SETTINGS_MODULE from setup.cfg's [tool:pytest]
section and handles Django initialization automatically.
"""

import pytest


@pytest.fixture(autouse=True)
def isolate_entry_folder(tmp_path, settings):
    """Point ENTRY_FOLDER at pytest's temp dir so tests never touch live media."""
    settings.ENTRY_FOLDER = str(tmp_path)
