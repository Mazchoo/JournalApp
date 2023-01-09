
from django.http import HttpResponse

import main.models as models


def deleteEntryContent(entry: models.Entry):
    delete_content_ids = entry.content.get_queryset()
    models.Content.objects.filter(id__in=delete_content_ids).delete()

    for Model in models.CONTENT_MODELS.values():
        Model.objects.filter(entry=entry.name).delete()


def deleteEntryAndContent(post_data):
    if "name" not in post_data:
        return HttpResponse(f'No name in post data', content_type='text/plain')
    
    name = post_data["name"]
    entry = models.Entry.objects.all().filter(name=name)
    
    if not entry.exists():
        return HttpResponse(f'Invalid entry {name}', content_type='text/plain')
    
    entry = entry[0]
    deleteEntryContent(entry)
    entry.delete()

    return HttpResponse("It's gone! Reload the page to delete your local copy.", content_type='text/plain')
    