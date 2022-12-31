
import main.models as models


def getLatestEntryTuple():
    output = None
    latest_entry = models.Entry.objects.all().latest('last_edited')
    
    if latest_entry:
        latest_date = latest_entry.date
        output = (
            str(latest_date.year),
            latest_date.strftime("%B"), 
            str(latest_date.day)
        )

    return output
