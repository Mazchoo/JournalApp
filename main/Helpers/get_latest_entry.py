import main.models as models
from main.Helpers.date_slugs import convertDateToUrlTuple


def getLatestEntryTuple():
    output = None
    all_entities = models.Entry.objects.all()

    if all_entities:
        output = convertDateToUrlTuple(all_entities.latest("last_edited").date)

    return output
