
import main.models as models
from datetime import datetime


def loadContentForEntry(entry_name: str):
    entry = models.Entry.objects.all().filter(name=entry_name)
    output = {}

    if entry.exists():
        entry = entry[0]
        content_ids = entry.content.get_queryset()

        for content in content_ids:
            Model = models.CONTENT_MODELS[content.content_type]
            content_obj = Model.objects.get(pk=content.content_id)
            output[str(content)] = content_obj.view()

    return output


def addDaysWithAnEntry(context):
    ''' Given month information in context, add list of days where entry exists. '''
    month_ind = context['months_in_year'].index(context["month"]) + 1
    next_month_ind = context['months_in_year'].index(context["next_month"]) + 1
    first_day = datetime(context["year"], month_ind, 1)
    last_day = datetime(context["next_month_year"], next_month_ind, 1)

    entries = models.Entry.objects.all(). \
            filter(date__date__gte=first_day). \
            filter(date__date__lt=last_day)

    context["days_with_an_entry"] = [entry.date.day for entry in entries]
