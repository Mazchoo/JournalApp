"""Helpers to add general date information into requests"""

from typing import Callable

from django.shortcuts import redirect

from main.config.date_constants import DateConstants
from main.database_layer.date_information import get_day_and_month_names


def put_day_and_month_names_into_context(func) -> Callable:
    """Put general date information from slug into context"""

    def wrap_function(request, **kwargs):
        """Inner function that sanity checks date and adds general information"""
        if "month" in kwargs and kwargs["month"] not in DateConstants.month_names:
            return redirect("/date-not-found")

        day_month_context = get_day_and_month_names()
        context = day_month_context.to_dict()
        context.update(kwargs)
        return func(request, context)

    return wrap_function
