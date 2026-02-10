"""Save an entry to the database"""

from datetime import datetime
import re
from typing import List, Optional

from django.http import JsonResponse
from django.forms import ModelForm
from django.forms.utils import ErrorDict, ErrorList

from main.models import Entry
from main.forms import EntryForm, ContentForm
from main.content_generation.delete_entry import delete_entry_content
from main.config import ALLOWED_CONTENT_TYPES
from main.content_generation.content_factory_forms import ContentFormFactory
from main.content_generation.request_forms import SaveEntryForm


def generate_new_entry(name: str, errors: ErrorDict) -> Optional[Entry]:
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
        return entry_form.instance

    errors["entry"] = ErrorList([f"Invalid entry {entry_form.errors}"])
    return None


def create_or_get_entry(name: str, errors: ErrorDict) -> Optional[Entry]:
    """Create entry if it doesn't exist else return it"""
    entry_query = Entry.objects.all().filter(name=name)

    if entry_query.exists():
        return entry_query[0]

    return generate_new_entry(name, errors)


def generate_new_content(
    model_form: ModelForm, entry_type: str, key: str, errors: ErrorDict
) -> Optional[str]:
    """Delegate content type to its form and check the form is valid"""
    if not model_form.is_valid():
        for field_name, message in model_form.errors.items():
            errors[f"{key}.{field_name}"] = message
        return None

    model_form.save(commit=True)
    content_form = ContentForm(
        {"content_type": entry_type, "content_id": model_form.instance.pk}
    )

    if content_form.is_valid():
        content_form.save(commit=True)
        return content_form.instance.pk

    model_form.instance.delete()
    for field_name, message in content_form.errors.items():
        errors[f"{key}.{field_name}"] = message
    return None


def parse_submitted_new_content(
    key: str, value: dict, errors: ErrorDict, content_keys: List[str]
) -> None:
    """Create new content from post data"""
    content_type_match = re.search(r"([A-Za-z]+)\d+", key)
    if not content_type_match:
        errors[f"{key}"] = ErrorList([" => Invalid content syntax"])
        return

    content_type = content_type_match.group(1)
    if content_type not in ALLOWED_CONTENT_TYPES:
        errors[f"{key}"] = ErrorList([" => Invalid content type"])
        return

    content_fields = dict(value)
    model_form = ContentFormFactory.get(content_type)(content_fields)  # type: ignore

    content_key = generate_new_content(model_form, content_type, key, errors)
    if content_key is not None:
        content_keys.append(content_key)


def process_content_submitted(content_dict: dict, errors: ErrorDict) -> List[str]:
    """For all content in post save content to database"""
    content_keys = []  # type: list

    for key, value in content_dict.items():
        try:
            parse_submitted_new_content(key, value, errors, content_keys)
        except Exception as e:  # pylint: disable=broad-exception-caught
            errors[f"{key}"] = ErrorList([f" => Internal server error: {e}"])

    return content_keys


def update_or_generate_from_request(post_data: dict):
    """
    Delete all previous objects associated with entry and save the object again.
    Each entry has content which are content objects with types and a foreign key.
    Content that cannot be saved will return an error message.
    """
    errors = ErrorDict()

    form = SaveEntryForm(post_data, content=post_data.get("content"))
    if not form.is_valid():
        return JsonResponse({"error": form.errors})

    entry = create_or_get_entry(form.cleaned_data["name"], errors)
    if entry is None:
        return JsonResponse({"error": errors})

    delete_entry_content(entry)
    content_ids = process_content_submitted(form.content, errors)

    entry.last_edited = datetime.now()
    entry.content.set(content_ids)
    entry.save()

    # Expect user to resolve content (e.g. text region) on their current page else it is gone
    if errors:
        return JsonResponse({"error": f"Invalid content {errors}"})

    return JsonResponse({"success": "Entry Saved Successfully"})
