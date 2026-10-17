"""Save an entry to the database"""

from datetime import datetime
import re
from typing import List, NamedTuple, Optional

from django.db import transaction
from django.http import JsonResponse
from django.forms import ModelForm
from django.forms.utils import ErrorDict, ErrorList

from main.models import Entry
from main.forms import EntryForm, ContentForm
from main.utils.errors import form_errors_message
from main.content_generation.delete_entry import (
    delete_entry_content,
    remove_files_from_entry,
)
from main.config import ALLOWED_CONTENT_TYPES
from main.content_generation.content_factory_forms import ContentFormFactory
from main.content_generation.request_forms import SaveEntryForm


class PendingContent(NamedTuple):
    """Validated content form that has not been saved."""

    content_type: str
    model_form: ModelForm


def generate_new_entry(name: str, errors: ErrorDict) -> Optional[Entry]:
    """If entry form is valid return new entry referred to by name"""
    entry_form = EntryForm(
        {
            "name": name,
            "first_created": datetime.now(),
            "last_edited": datetime.now(),
        }
    )

    if entry_form.is_valid():
        entry_form.save(commit=True)
        return entry_form.instance

    errors["entry"] = ErrorList(
        [f"Invalid entry {form_errors_message(entry_form.errors)}"]
    )
    return None


def create_or_get_entry(name: str, errors: ErrorDict) -> Optional[Entry]:
    """Create entry if it doesn't exist else return it"""
    entry_query = Entry.objects.all().filter(name=name)

    if entry_query.exists():
        return entry_query[0]

    return generate_new_entry(name, errors)


def parse_submitted_new_content(
    key: str, value: dict, errors: ErrorDict
) -> Optional[PendingContent]:
    """Validate one content item and return its unsaved form."""
    content_type_match = re.search(r"([A-Za-z]+)\d+", key)
    if not content_type_match:
        errors[f"{key}"] = ErrorList([" => Invalid content syntax"])
        return None

    content_type = content_type_match.group(1)
    if content_type not in ALLOWED_CONTENT_TYPES:
        errors[f"{key}"] = ErrorList([" => Invalid content type"])
        return None

    content_fields = dict(value)
    model_form = ContentFormFactory.get(content_type)(content_fields)  # type: ignore

    if not model_form.is_valid():
        for field_name, message in model_form.errors.items():
            errors[f"{key}.{field_name}"] = message
        return None

    return PendingContent(content_type, model_form)


def process_content_submitted(
    content_dict: dict, errors: ErrorDict
) -> List[PendingContent]:
    """Validate submitted content. Nothing is written yet."""
    pending: List[PendingContent] = []

    for key, value in content_dict.items():
        try:
            parsed = parse_submitted_new_content(key, value, errors)
        except Exception as e:  # pylint: disable=broad-exception-caught
            errors[f"{key}"] = ErrorList([f" => Internal server error: {e}"])
            continue

        if parsed is not None:
            pending.append(parsed)

    return pending


def save_new_content(
    pending_content: List[PendingContent], entry: Entry, errors: ErrorDict
) -> List[int]:
    """Save mapping of content type to its id"""
    content_ids = []
    with transaction.atomic():
        for content_type, model_form in pending_content:
            model_form.instance.entry = entry
            model_form.save(commit=True)
            content_form = ContentForm(
                {"content_type": content_type, "content_id": model_form.instance.pk}
            )
            if not content_form.is_valid():
                for field_name, message in content_form.errors.items():
                    errors[f"{content_type}.{field_name}"] = message
                transaction.set_rollback(True)
                return []
            content_form.save(commit=True)
            content_ids.append(content_form.instance.pk)
    return content_ids


def update_or_generate_from_request(post_data: dict):
    """
    Delete all previous objects associated with entry and save the object again.
    Each entry has content which are content objects with types and a foreign key.
    Content that cannot be saved will return an error message.
    """
    errors = ErrorDict()

    form = SaveEntryForm(post_data, content=post_data.get("content"))
    if not form.is_valid():
        return JsonResponse({"error": form_errors_message(form.errors)})

    pending_content = process_content_submitted(form.content, errors)
    if errors:
        return JsonResponse({"error": f"Invalid content {form_errors_message(errors)}"})

    entry = create_or_get_entry(form.cleaned_data["name"], errors)
    if entry is None:
        return JsonResponse({"error": form_errors_message(errors)})

    delete_entry_content(entry)
    remove_files_from_entry(entry, ignore_file_names=form.media_file_names)

    content_ids = save_new_content(pending_content, entry, errors)
    if errors:
        return JsonResponse({"error": f"Invalid content {form_errors_message(errors)}"})

    entry.last_edited = datetime.now()
    entry.content.set(content_ids)
    entry.save()

    return JsonResponse({"success": "Entry Saved Successfully"})
