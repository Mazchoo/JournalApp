"""Helpers to convert form content to usable content"""

from typing import Optional


def coerce_string_int_to_bool(content) -> Optional[bool]:
    """Some json conventions stop booleans being treated as key words and so ints are used instead"""
    # If already expected type do nothing
    if isinstance(content, bool):
        return content

    # Assume was passed in 0, 1 boolean convention
    if isinstance(content, int) and content in [0, 1]:
        return bool(content)

    # Assume was passed in '0', '1' boolean convention
    if isinstance(content, str) and content.isdigit() and int(content) in [0, 1]:
        return bool(int(content))

    return None
