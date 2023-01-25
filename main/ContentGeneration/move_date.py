
from django.http import JsonResponse
from django.forms.utils import ErrorDict
from django.forms import model_to_dict

import main.models as models
import main.forms as forms

from main.ContentGeneration.request_forms import DateMoveForm
from main.Helpers.date_slugs import getValidDateFromSlug, convertDateToUrlTuple
from main.ContentGeneration.delete_entry import moveImagesOutOfADeleteFolder
from main.ContentGeneration.content_factory_models import CONTENT_MODELS
from main.ContentGeneration.content_factory_update import CONTENT_UPDATE_DATE


def checkMoveRequest(post_data):
    date_move_form = DateMoveForm(post_data)

    if not date_move_form.is_valid():
        return None, ErrorDict(date=date_move_form.errors)

    return date_move_form.cleaned_data, None


def createNewEntry(source_entry, destination_slug):
    errors = ErrorDict()
    new_entry = None
    moveImagesOutOfADeleteFolder(source_entry)

    entry_dict = model_to_dict(source_entry)
    entry_dict['name'] = destination_slug
    entry_dict['date'] = getValidDateFromSlug(destination_slug)
    entry_dict['content'] = []

    new_entry_form = forms.EntryForm(entry_dict)
    if new_entry_form.is_valid():
        new_entry_form.save(commit=True)
        new_entry = models.Entry.objects.get(name=destination_slug)
    else:
        errors["entry"] = new_entry_form.errors

    return new_entry, errors


def generateNewContentObjectFromSource(content, new_slug, errors):
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
        errors[f'{content_type}-{obj.id}'] = new_obj_form.errors

    return new_instance_id


def generateNewContentRecordFromSource(content, new_instance_id, errors):
    new_content_form = forms.ContentForm({
        'content_type': content.content_type,
        'content_id': new_instance_id
    })

    new_content_record_id = None
    if new_content_form.is_valid():
        new_content_form.save(commit=True)
        new_content_record_id = new_content_form.instance.pk
        content.delete()
    else:
        errors[f'content-{content.id}'] = new_content_form.errors

    return new_content_record_id


def updateNewContentIds(content, destination_slug, content_ids, errors):
    new_instance_id = generateNewContentObjectFromSource(content, destination_slug, errors)
    if content_id := generateNewContentRecordFromSource(content, new_instance_id, errors):
        content_ids.append(content_id)


def updateEntryDate(source_slug, destination_slug):
    entry = models.Entry.objects.get(name=source_slug)
    moveImagesOutOfADeleteFolder(entry)

    new_entry, errors = createNewEntry(entry, destination_slug)
    if errors:
        return new_entry, errors

    errors = ErrorDict()
    content_ids = []
    for content in entry.content.all():
        updateNewContentIds(content, destination_slug, content_ids, errors)

    new_entry.content.set(content_ids)
    new_entry.save()
    if not errors:
        entry.delete()

    return new_entry, errors


def moveSourceDateToDestinationDate(post_data):
    cleaned_data, error = checkMoveRequest(post_data)

    if error is not None:
        return JsonResponse({"error": f'Invalid dates {error}'})

    new_entry, error = updateEntryDate(cleaned_data['move_from'], cleaned_data['move_to'])

    if error:
        return JsonResponse({"error": f'Update errors {error}'})

    date_tuple = convertDateToUrlTuple(new_entry.date)

    if date_tuple:
        return JsonResponse({"new_date": f'/edit/{"/".join(date_tuple)}'})
    else:
        return JsonResponse({"error": f'Update errors {error}'})
