"""Helpers for Django ErrorDict."""

from django.forms.utils import ErrorDict


def form_errors_message(errors: ErrorDict) -> str:
    """Flatten Django form errors into one string for JSON `error` fields."""
    parts = []
    for field, messages in errors.items():
        prefix = "" if field == "__all__" else f"{field}: "
        parts.extend(f"{prefix}{message}" for message in messages)
    return ". ".join(parts)
