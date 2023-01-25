
from datetime import datetime
from main.Helpers.date_contants import DateConstants
import re


def getValidDateFromSlug(slug: str):
    date_match = re.search(r"(\d{4})\-0?(\d+)\-0?(\d+)", slug)

    if not date_match:
        return None

    year, month, day = date_match.group(1), date_match.group(2), date_match.group(3)

    try:
        year, month, day = eval(year), eval(month), eval(day)
        slug_date = datetime(year, month, day)
    except (ValueError, SyntaxError):
        return None

    return slug_date


def convertDateToUrlTuple(date: datetime):
    return (
        str(date.year),
        date.strftime("%B"),
        str(date.day)
    )


def dateExists(context):
    day = context['day'] if 'day' in context else 1

    month = context['month'] if 'month' in context else 'January'
    month_names = DateConstants.month_names
    month_ind = month_names.index(month) + 1

    year = context['year']

    try:
        datetime(year, month_ind, day)
    except ValueError:
        return False
    else:
        return True
