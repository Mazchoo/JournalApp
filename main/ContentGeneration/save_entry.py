"""Save an entry to the database"""

from datetime import datetime
import re
from typing import Tuple, List, Optional

from django.http import JsonResponse
from django.forms.utils import ErrorDict
from django.forms import ModelForm

from main.models import Entry
from main.forms import EntryForm, ContentForm
from main.ContentGeneration.delete_entry import delete_entry_content
from main.ContentGeneration.content_factory_forms import CONTENT_FORMS

# ToDo - Errors as return should probably be single type and not return tuple


def generate_new_entry(name: str) -> Tuple[Optional[str], Optional[Entry]]:
    """If entry form is valid return new entry referred to by name"""
    entry_form = EntryForm(
        {
            "name": name,
            "first_created": datetime.now(),
            "last_edited": datetime.now(),
            "date": datetime.now(),
        }
    )

    if entry_form.is_valid():
        entry_form.save(commit=True)
        entry = entry_form.instance
    else:
        error = f"Invalid entry {entry_form.errors}"
        return error, None

    return None, entry


def create_or_get_entry(name: str) -> Tuple[Optional[str], Optional[Entry]]:
    """Create entry if it doesn't exist else return it"""
    entry_query = Entry.objects.all().filter(name=name)
    error = None

    if entry_query.exists():
        entry = entry_query[0]
    else:
        error, entry = generate_new_entry(name)

    return error, entry


def generate_new_content(
    model_form: ModelForm, entry_type: str
) -> Tuple[Optional[ErrorDict], Optional[str]]:
    """Delegate content type to its form and check the form is valid"""
    if model_form.is_valid():
        model_form.save(commit=True)
        content_form = ContentForm(
            {"content_type": entry_type, "content_id": model_form.instance.pk}
        )

        if content_form.is_valid():
            content_form.save(commit=True)
            content_key = content_form.instance.pk
        else:
            model_form.instance.delete()
            return content_form.errors, None
    else:
        return model_form.errors, None

    return None, content_key


def parse_submitted_new_content(
    key: str, value: dict, errors: ErrorDict, content_keys: List[str]
) -> bool:
    """Create new content from post data"""
    content_type_match = re.search(r"([A-Za-z]+)\d+", key)
    if not content_type_match:
        errors[f"{key}"] = " => Invalid content syntax"
        return False

    entry_type = content_type_match.group(1)
    if entry_type not in CONTENT_FORMS:
        errors[f"{key}"] = " => Invalid content type"
        return False

    content_fields = dict(value)
    model_form = CONTENT_FORMS[entry_type](content_fields)

    error, content_key = generate_new_content(model_form, entry_type)
    if error:
        for field_name, message in error.items():
            errors[f"{key}.{field_name}"] = message
        return False

    content_keys.append(content_key)
    return True


def process_content_submitted(content_dict: dict) -> Tuple[ErrorDict, List[str]]:
    """For all content in post save content to database"""
    content_keys = []  # type: list
    errors = ErrorDict()

    for key, value in content_dict.items():
        try:
            parse_submitted_new_content(key, value, errors, content_keys)
        except Exception as e:  # pylint: disable=broad-exception-caught
            errors[f"{key}"] = f" => Internal server error: {e}"

    return errors, content_keys


def update_or_generate_from_request(post_data: dict):
    """
    Delete all previous objects associated with entry and save the object again.
    Each entry has content which are content objects with types and a foreign key.
    Content that cannot be saved will return an error message.
    """
    if "name" not in post_data:
        return JsonResponse({"error": "Entry name not specified"})

    error, entry = create_or_get_entry(post_data["name"])
    if error is not None:
        return JsonResponse({"error": error})

    if "content" not in post_data:
        return JsonResponse({"error": "No content in entry"})

    delete_entry_content(entry)
    content_errors, content_ids = process_content_submitted(post_data["content"])

    entry.last_edited = datetime.now()
    entry.content.set(content_ids)
    entry.save()

    if content_errors:
        return JsonResponse({"error": f"Invalid content {content_errors}"})

    return JsonResponse({"success": "Entry Saved Successfully"})
