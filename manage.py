#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path
from typing import List


def main(command: List[str]):
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Journal.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(command)


if __name__ == '__main__':
    ''' Ensure database exists before running server. '''
    if not Path(f"{os.getcwd()}/db.sqlite3").exists():
        main([__file__, "migrate"])
    main(sys.argv)
