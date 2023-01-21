
from django.http import HttpResponse, JsonResponse
from pathlib import Path
from django.forms.utils import ErrorDict
from django.forms import model_to_dict
from django.shortcuts import redirect

import main.models as models
import main.forms as forms

from main.ContentGeneration.request_forms import DateMoveForm
from main.Helpers.date_helpers import getValidDateFromSlug, convertDateToUrlTuple
from main.ContentGeneration.delete_entry import moveImagesOutOfADeleteFolder
from main.ContentGeneration.content_models import CONTENT_MODELS
from main.ContentGeneration.content_forms import CONTENT_FORMS


def checkMoveRequest(post_data):
    date_move_form = DateMoveForm(post_data)

    if not date_move_form.is_valid():
        return None, ErrorDict(date=date_move_form.errors)

    return date_move_form.cleaned_data, None


def updateEntryDate(source_slug, destination_slug):
    errors = ErrorDict()
    entry = models.Entry.objects.get(name=source_slug)
    moveImagesOutOfADeleteFolder(entry)

    entry_dict = model_to_dict(entry)
    entry_dict['name'] = destination_slug
    entry_dict['date'] = getValidDateFromSlug(destination_slug)
    entry_dict['content'] = []
    
    new_entry_form = forms.EntryForm(entry_dict)
    if new_entry_form.is_valid():
        new_entry_form.save(commit=True)
    else:
        errors["entry"] = new_entry_form.errors
        return None, errors

    content_ids = []
    # ToDo - Refactor this mess
    for content in entry.content.all():
        content_type = content.content_type
        
        Model = CONTENT_MODELS[content_type]
        obj = Model.objects.get(id=content.content_id)
        Form = CONTENT_FORMS[content_type]
        
        new_obj_dict = model_to_dict(obj)
        new_obj_dict['entry'] = destination_slug
        
        if content_type == "image":
            new_obj_dict["file_path"] = Path(new_obj_dict["file_path"]).name
        
        new_obj_form = Form(new_obj_dict)
        if new_obj_form.is_valid():
            new_obj_form.save(commit=True)
            obj.delete()
        else:
            errors[f'{content_type}-{obj.id}'] = new_obj_form.errors
            
        new_content_form = forms.ContentForm({
            'content_type': content_type,
            'content_id': new_obj_form.instance.pk
        })

        if new_content_form.is_valid():
            new_content_form.save(commit=True)
            content_ids.append(new_content_form.instance.pk)
            content.delete()
        else:
            errors[f'content-{content.id}'] = new_content_form.errors

    new_entry = models.Entry.objects.get(name=destination_slug)
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
