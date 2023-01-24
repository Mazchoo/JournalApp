
from django.shortcuts import redirect

from main.Helpers.date_contants import DateConstants


def addGeneralInformation(context):
    context['full_day_names'] = DateConstants.day_names
    context['short_day_names'] = DateConstants.day_names_short
    context['months_in_year'] = DateConstants.month_names


def putVargsIntoContext(func):
    ''' Put general date information from slug into context '''

    def wrapFunc(request, **kwargs):
        context = kwargs.copy()
        if 'month' in context and context['month'] not in DateConstants.month_names:
            return redirect('/date-not-found')

        addGeneralInformation(context)
        return func(request, context)

    return wrapFunc
