
from datetime import datetime
import re

def getValidDateFromSlug(slug: str):
    
    date_match = re.search(r"(\d{4})\-0?(\d+)\-0?(\d+)", slug)

    if not date_match:
        return None

    year, month, day = date_match.group(1), date_match.group(2), date_match.group(3)

    try:
        year, month, day = eval(year), eval(month), eval(day)
        slug_date = datetime(year, month, day)
    except:
        return None

    return slug_date


def convertDateToUrlTuple(date: datetime):
    return (
        str(date.year),
        date.strftime("%B"), 
        str(date.day)
    )
