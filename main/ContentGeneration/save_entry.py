
from datetime import datetime
import re
from django.http import HttpResponse
from django.forms.utils import ErrorDict

import main.models as models
import main.forms as forms


def generateNewEntry(name: str):
    entry_form = forms.EntryForm({
        'name': name,
        'first_created': datetime.now(),
        'last_edited': datetime.now(),
        'date': datetime.strptime(name, '%Y-%m-%d'),
    })

    if entry_form.is_valid():
        entry_form.save(commit=True)
        entry = entry_form.instance
    else:
        error = HttpResponse(entry_form.errors, content_type='text/plain')
        return error, None

    return None, entry


def getPostEntry(name: str):
    entry = models.Entry.objects.all().filter(name=name)
    error = None

    if entry.exists():
        entry = entry[0]
    else:
        error, entry = generateNewEntry(name)

    return error, entry


def generateNewContent(model_form, entry_type):

    if model_form.is_valid():
        model_form.save(commit=True)
        content_form = forms.ContentForm({
            'content_type': entry_type,
            'content_id': model_form.instance.pk
        })

        if content_form.is_valid():
            content_form.save(commit=True)
            content_key = content_form.instance.pk
        else:
            model_form.instance.delete()
            return content_form.errors, None
    else:
        return model_form.errors, None

    return None, content_key

def getSavedContentIds(content_dict: dict):
    content_keys = []
    errors = ErrorDict()

    for key, value in content_dict.items():
        content_type_match = re.search(r"(\w+)\d+", key)
        if not content_type_match:
            errors[f"{key}"] = f'Invalid content syntax'
            continue

        entry_type = content_type_match.group(1)
        if entry_type not in forms.CONTENT_FORMS:
            errors[f"{key}"] = f'Invalid content type'
            continue

        content_fields = dict(value)
        model_form = forms.CONTENT_FORMS[entry_type](content_fields)

        error, content_key = generateNewContent(model_form, entry_type)
        if error:
            for field_name, message in error.items():
                errors[f"{key}.{field_name}"] = message
            continue

        content_keys.append(content_key)

    return errors, content_keys


def deleteOldContent(entry: models.Entry):
    old_content_ids = entry.content.get_queryset()
    models.Content.objects.filter(id__in=old_content_ids).delete()

    for Model in models.CONTENT_MODELS.values():
        Model.objects.filter(entry=entry.name).delete()


def updateOrGenerateEntry(post_data):
    '''
        Delete all previous objects associated with entry and save the object again.
        Each entry has content which are content objects with types and a foreign key.
    '''
    if 'name' not in post_data:
        return HttpResponse('Entry name not specified', content_type='text/plain')
    
    error, entry = getPostEntry(post_data['name'])
    if error is not None:
        return error

    if 'content' not in post_data:
        return HttpResponse('No content in entry', content_type='text/plain')

    deleteOldContent(entry)
    errors, content_ids = getSavedContentIds(post_data['content'])

    entry.last_edited = datetime.now()
    entry.content.set(content_ids)
    entry.save()
    
    if errors:
        return HttpResponse(f'Invalid content {errors}', content_type='text/plain')

    return HttpResponse('Entry Saved Successfully', content_type='text/plain')