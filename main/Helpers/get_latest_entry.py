
import main.models as models
from main.Helpers.date_slugs import convertDateToUrlTuple


def getLatestEntryTuple():
    output = None
    latest_entry = models.Entry.objects.all().latest('last_edited')
    
    if latest_entry:
        output = convertDateToUrlTuple(latest_entry.date)

    return output
