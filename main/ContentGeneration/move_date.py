"""Handle moving an entry from one date to another"""

from typing import Optional, Tuple, Any, Dict, List

from django.http import JsonResponse
from django.forms.utils import ErrorDict
from django.forms import model_to_dict

from main.models import Entry, Content
from main.forms import EntryForm, ContentForm

from main.ContentGeneration.request_forms import DateMoveForm
from main.Helpers.date_slugs import get_valid_date_from_slug, convert_date_to_url_tuple
from main.ContentGeneration.delete_entry import move_files_from_entry
from main.ContentGeneration.content_factory_models import CONTENT_MODELS
from main.ContentGeneration.content_factory_update import CONTENT_UPDATE_DATE


def check_move_request(
    post_data: dict,
) -> Tuple[Optional[Dict[str, Any]], Optional[ErrorDict]]:
    """Return cleaned data of moved request else errors"""
    date_move_form = DateMoveForm(post_data)

    if not date_move_form.is_valid():
        return None, ErrorDict(date=date_move_form.errors)

    return date_move_form.cleaned_data, None


def create_new_entry_at_new_date(
    source_entry: Entry, destination_slug: str
) -> Tuple[Optional[Entry], ErrorDict]:
    """Moves an entry to destination date"""
    errors = ErrorDict()
    new_entry = None
    move_files_from_entry(source_entry)

    entry_dict = model_to_dict(source_entry)
    entry_dict["name"] = destination_slug
    entry_dict["date"] = get_valid_date_from_slug(destination_slug)
    entry_dict["content"] = []

    new_entry_form = EntryForm(entry_dict)
    if new_entry_form.is_valid():
        new_entry_form.save(commit=True)
        new_entry = Entry.objects.get(name=destination_slug)
    else:
        errors["entry"] = new_entry_form.errors

    return new_entry, errors


def generate_new_content_from_source(
    content: Content, new_slug: str, errors: ErrorDict
) -> Optional[int]:
    """Create new content with updated slugs, return optional key if it was success else update error log"""
    content_type = content.content_type

    Model = CONTENT_MODELS[content_type]
    obj = Model.objects.get(id=content.content_id)
    new_obj_form = CONTENT_UPDATE_DATE[content_type](obj, new_slug)

    new_instance_id = None
    if new_obj_form.is_valid():
        new_obj_form.save(commit=True)
        new_instance_id = new_obj_form.instance.pk
        obj.delete()
    else:
        errors[f"{content_type}-{obj.id}"] = new_obj_form.errors

    return new_instance_id


def generate_content_linked_to_new_entry(
    content: Content, new_instance_id: int, errors: ErrorDict
) -> Optional[int]:
    """Validate form for updated content"""
    new_content_form = ContentForm(
        {"content_type": content.content_type, "content_id": new_instance_id}
    )

    new_content_record_id = None
    if new_content_form.is_valid():
        new_content_form.save(commit=True)
        new_content_record_id = new_content_form.instance.pk
        content.delete()
    else:
        errors[f"content-{content.id}"] = new_content_form.errors

    return new_content_record_id


def update_all_content_with_new_entry(content: Content, destination_slug: str, content_ids: List[int], errors: ErrorDict):
    """Each each content id move all content to destination date"""
    new_instance_id = generate_new_content_from_source(
        content, destination_slug, errors
    )
    if content_id := generate_content_linked_to_new_entry(
        content, new_instance_id, errors
    ):
        content_ids.append(content_id)


def update_entry_date(source_slug: str, destination_slug: str) -> Tuple[Optional[Entry], ErrorDict]:
    """Load and move entry from source date slug to destination date slug"""
    entry = Entry.objects.get(name=source_slug)
    move_files_from_entry(entry)

    new_entry, errors = create_new_entry_at_new_date(entry, destination_slug)
    if errors:
        return new_entry, errors

    errors = ErrorDict()
    content_ids = []
    for content in entry.content.all():
        update_all_content_with_new_entry(content, destination_slug, content_ids, errors)

    new_entry.content.set(content_ids)
    new_entry.save()
    if not errors:
        entry.delete()

    return new_entry, errors


def move_source_date_to_desination_request(post_data: dict) -> JsonResponse:
    """Handle request to change the date of an entry"""
    cleaned_data, error = check_move_request(post_data)

    if error is not None:
        return JsonResponse({"error": f"Invalid dates {error}"})

    new_entry, error = update_entry_date(
        cleaned_data["move_from"], cleaned_data["move_to"]
    )

    if error:
        return JsonResponse({"error": f"Update errors {error}"})

    date_tuple = convert_date_to_url_tuple(new_entry.date)

    if date_tuple:
        return JsonResponse({"new_date": f"/edit/{'/'.join(date_tuple)}"})

    return JsonResponse({"error": f"Update errors {error}"})
