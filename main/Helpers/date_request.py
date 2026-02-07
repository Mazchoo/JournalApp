"""Helpers to add general date information into requests"""

from typing import Callable

from django.shortcuts import redirect

from main.config.date_constants import DateConstants
from main.helpers.date_information import add_day_and_month_names


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
