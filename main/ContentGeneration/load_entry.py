
from datetime import datetime

import main.models as models
from main.ContentGeneration.content_factory_models import CONTENT_MODELS


def loadContentForEntry(context: dict):
    entry_query = models.Entry.objects.all().filter(name=context['date_slug'])
    output = {}

    context['entry_exists'] = entry_query.exists()
    if context['entry_exists']:
        entry = entry_query[0]
        content_ids = entry.content.get_queryset()

        for content in content_ids:
            Model = CONTENT_MODELS[content.content_type]  # ToDo - Make an abstract class for this type
            content_obj = Model.objects.get(pk=content.content_id)
            output[str(content)] = content_obj.view()

    context['saved_content'] = output


def addDaysWithAnEntry(context):
    ''' Given month information in context, add list of days where entry exists. '''
    month_ind = context['months_in_year'].index(context["month"]) + 1
    next_month_ind = context['months_in_year'].index(context["next_month"]) + 1
    first_day = datetime(context["year"], month_ind, 1)
    last_day = datetime(context["next_month_year"], next_month_ind, 1)

    entries = models.Entry.objects.all()
    entries = entries.filter(date__date__gte=first_day)
    entries = entries.filter(date__date__lt=last_day)

    context["days_with_an_entry"] = [entry.date.day for entry in entries]
