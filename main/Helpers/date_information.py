
from datetime import datetime
from main.Helpers.date_contants import DateConstants


def addYearInformation(context):
    if 'year' not in context:
        print('addYearInformation: request does not have year', context)
        return

    year = context['year']
    context['next_year'] = year + 1
    context['prev_year'] = year - 1

    return year


def addMonthInformation(context):
    if 'month' not in context or 'year' not in context:
        print('addMonthInformation: Request does not have month or year.', context)
        return

    month_names = DateConstants.month_names
    day_names = DateConstants.day_names

    year = addYearInformation(context)
    month_ind = month_names.index(context['month']) + 1

    # One based indices
    next_month_ind  = month_ind + 1 if month_ind < 12 else 1
    next_month_year = year if month_ind < 12 else year + 1
    prev_month_ind  = month_ind - 1 if month_ind > 1 else 12
    prev_month_year = year if month_ind > 1 else year - 1

    context['next_month'] = month_names[next_month_ind - 1]
    context['next_month_year'] = next_month_year
    context['prev_month'] = month_names[prev_month_ind - 1]
    context['prev_month_year'] = prev_month_year

    delta_curr_to_next_month = datetime(next_month_year, next_month_ind, 1) - datetime(year, month_ind, 1)
    nr_days_in_month = delta_curr_to_next_month.days
    delta_prev_to_curr_month = datetime(year, month_ind, 1) - datetime(prev_month_year, prev_month_ind, 1)
    nr_days_in_last_month = delta_prev_to_curr_month.days

    first_day_name = datetime(year, month_ind, 1).strftime("%A")
    last_day_name = datetime(year, month_ind, nr_days_in_month).strftime("%A")

    first_day_ind = day_names.index(first_day_name)
    preceding_days = [nr_days_in_last_month - i for i in range(first_day_ind)]
    last_day_ind = day_names.index(last_day_name)

    context['preceding_days'] = list(reversed(preceding_days))
    context['trailing_days'] = [i + 1 for i in range(6 - last_day_ind)]
    context['days_in_month'] = list(range(1, nr_days_in_month + 1))
    context['nr_days_in_prev_month'] = nr_days_in_last_month
    context['min_day_to_max_day'] = list(range(1, 32))

    return year, month_ind


def addDayInformation(context):
    if 'day' not in context or 'month' not in context or 'year' not in context:
        print('addDayInformation: request does not have day, month or year', context)
        return

    month_names = DateConstants.month_names

    day = context['day']
    year, month_ind = addMonthInformation(context)

    day_str = ('0' + str(day))[-2:]
    month_str = ('0' + str(month_ind))[-2:]
    context['date_slug'] = f"{year}-{month_str}-{day_str}"

    if day != 11 and day % 10 == 1:
        suffix = "st"
    elif day != 12 and day % 10 == 2:
        suffix = "nd"
    elif day != 13 and day % 10 == 3:
        suffix = "rd"
    else:
        suffix = "th"

    context['day_suffix'] = suffix

    next_day       = day + 1 if day < len(context['days_in_month']) else 1
    next_day_month = month_ind if next_day != 1 else month_ind + 1
    next_day_month = next_day_month if next_day_month != 13 else 1
    next_day_year  = year if next_day != 1 or next_day_month != 1 else year + 1

    context['next_day'] = next_day
    context['next_day_month'] = month_names[next_day_month - 1]
    context['next_day_year'] = next_day_year

    prev_day       = day - 1 if day > 1 else context['nr_days_in_prev_month']
    prev_day_month = month_ind if prev_day != context['nr_days_in_prev_month'] else month_ind - 1
    prev_day_month = prev_day_month if prev_day_month != 0 else 12
    prev_day_year  = year if prev_day != 31 or prev_day_month != 12 else year - 1

    context['prev_day'] = prev_day
    context['prev_day_month'] = month_names[prev_day_month - 1]
    context['prev_day_year'] = prev_day_year

    context['day_name'] = datetime(year, month_ind, day).strftime("%A")

    return year, month_ind, day
