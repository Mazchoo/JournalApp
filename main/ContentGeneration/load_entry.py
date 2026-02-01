"""Request information from single entries"""

from datetime import datetime

from main.models import Entry
from main.ContentGeneration.content_factory_models import CONTENT_MODELS


def load_all_content_from_entry(context: dict):
    """For content with a given date slug return content information about the entry"""
    entry_query = Entry.objects.all().filter(name=context["date_slug"])
    output = {}

    context["entry_exists"] = entry_query.exists()
    if context["entry_exists"]:
        entry = entry_query[0]
        content_ids = entry.content.get_queryset()

        for content in content_ids:
            Model = CONTENT_MODELS[
                content.content_type
            ]  # ToDo - Make an abstract class for this type
            content_obj = Model.objects.get(pk=content.content_id)
            output[str(content)] = content_obj.view()  # type: ignore

    context["saved_content"] = output


# ToDo - this is month information, it should be moved somewhere else
def addDaysWithAnEntry(context):
    """Given month information in context, add list of days where entries exist."""
    month_ind = context["months_in_year"].index(context["month"]) + 1
    next_month_ind = context["months_in_year"].index(context["next_month"]) + 1
    first_day = datetime(context["year"], month_ind, 1)
    last_day = datetime(context["next_month_year"], next_month_ind, 1)

    entries = (
        Entry.objects.all()
        .filter(date__date__gte=first_day)
        .filter(date__date__lt=last_day)
    )

    context["days_with_an_entry"] = [entry.date.day for entry in entries]
