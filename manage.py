#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""

import os
import sys
from pathlib import Path
from typing import List
import re
import json

from django.core.management.utils import get_random_secret_key

USERNAME_REGEX = "^[A-Za-z_][A-Za-z0-9_]*"


def generateSecurityDict(username: str, password: str):
    security_dict = {
        "ADMIN_USERNAME": username,
        "ADMIN_PASSWORD": password,
        "SECRET_KEY": f"django-insecure-{get_random_secret_key()}",
    }
    with open(f"{os.getcwd()}/security.json", "w") as f:
        json.dump(security_dict, f)


def addSecurityKey():
    print("No security details detected")
    username = ""
    while not re.search(USERNAME_REGEX, username):
        username = input("Create a valid username :")

    password = ""
    while len(password) < 8:
        password = input("Create a password with 8 characters or more :")

    generateSecurityDict(username, password)


def main(command: List[str]):
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Journal.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(command)


if __name__ == "__main__":
    """ Ensure security details exist. """
    if not Path(f"{os.getcwd()}/security.json").exists():
        addSecurityKey()

    """ Ensure database exists. """
    if not Path(f"{os.getcwd()}/db.sqlite3").exists():
        main([__file__, "migrate"])

    main(sys.argv)
