import main.forms as forms
from django.shortcuts import render, redirect

from main.Helpers.date_information import (
    add_day_information,
    add_month_information,
    add_year_information,
)
from main.Helpers.date_request import put_day_and_month_names_into_context
from main.Helpers.date_slugs import date_exists
from main.Helpers.ajax_request import ajax_request
from main.Helpers.get_year_entry_data import get_year_entry_information
from main.Helpers.get_all_years_summary import (
    get_all_year_summary_information,
    get_all_entry_years,
)
from main.Helpers.get_latest_entry import get_latest_entry_tuple

from main.ContentGeneration.save_entry import updateOrGenerateEntry
from main.ContentGeneration.load_entry import loadContentForEntry, addDaysWithAnEntry
from main.ContentGeneration.delete_entry import delete_entry_and_content
from main.ContentGeneration.get_full_image import get_full_image_reponse
from main.ContentGeneration.get_full_video import getFullVideoResponse
from main.ContentGeneration.move_date import moveSourceDateToDestinationDate

# ToDo - Consider using type script and bundle to compile javascript functions
# ToDo - Add some tests for saving content from scratch


@put_day_and_month_names_into_context
def homePage(request, context):
    get_all_year_summary_information(context)
    return render(request=request, template_name="home.html", context=context)


def latestPage(_request):
    last_date_tuple = get_latest_entry_tuple()
    if last_date_tuple:
        return redirect(f"/edit/{'/'.join(last_date_tuple)}")
    return redirect("/")


@put_day_and_month_names_into_context
def yearPage(request, context):
    if not date_exists(context):
        return redirect("/date-not-found")

    add_year_information(context)
    get_year_entry_information(context)
    return render(request=request, template_name="year.html", context=context)


@put_day_and_month_names_into_context
def monthPage(request, context):
    if not date_exists(context):
        return redirect("/date-not-found")

    add_month_information(context)
    addDaysWithAnEntry(context)
    return render(request=request, template_name="month.html", context=context)


@put_day_and_month_names_into_context
def editEntryPage(request, context):
    if not date_exists(context):
        return redirect("/date-not-found")

    add_day_information(context)
    get_all_entry_years(context)
    loadContentForEntry(context)

    context["tiny_mce"] = forms.TinyMCEComponent()

    return render(request=request, template_name="day.html", context=context)


def showEntryPage(request, _day: int, _month: str, _year: int):
    return render(request=request, template_name="day.html")


def dateNotFoundPage(request):
    return render(request=request, template_name="DateNotFound.html")


@ajax_request
def deleteEntry(post_data: dict):
    return delete_entry_and_content(post_data)


@ajax_request
def saveEntry(post_data: dict):
    return updateOrGenerateEntry(post_data)


@ajax_request
def getImage(post_data: dict):
    return get_full_image_reponse(post_data)


@ajax_request
def getVideo(post_data: dict):
    return getFullVideoResponse(post_data)


@ajax_request
def moveEntryDate(post_data: dict):
    return moveSourceDateToDestinationDate(post_data)
