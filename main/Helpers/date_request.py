"""Helpers to add general date information into requests"""

from typing import Callable

from django.shortcuts import redirect

from main.Helpers.date_contants import DateConstants


def add_day_and_month_names(context):
    """Add names of days and months"""
    context["full_day_names"] = DateConstants.day_names
    context["short_day_names"] = DateConstants.day_names_short
    context["months_in_year"] = DateConstants.month_names


# ToDo - checking the date is different from adding general information
# Needs more explicit decorators (or just function calls)
def put_day_and_month_names_into_context(func) -> Callable:
    """Put general date information from slug into context"""

    def wrap_function(request, **kwargs):
        """Inner function that sanity checks date and adds general information"""
        context = kwargs.copy()
        if "month" in context and context["month"] not in DateConstants.month_names:
            return redirect("/date-not-found")

        add_day_and_month_names(context)
        return func(request, context)

    return wrap_function
