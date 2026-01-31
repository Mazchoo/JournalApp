import main.forms as forms
from django.shortcuts import render, redirect

from main.Helpers.date_information import (
    addDayInformation,
    addMonthInformation,
    addYearInformation,
)
from main.Helpers.date_request import putVargsIntoContext
from main.Helpers.date_slugs import date_exists
from main.Helpers.ajax_request import ajaxRequest
from main.Helpers.get_year_entry_data import get_year_entry_information
from main.Helpers.get_all_years_summary import (
    get_all_year_summary_information,
    get_all_entry_years,
)
from main.Helpers.get_latest_entry import get_latest_entry_tuple

from main.ContentGeneration.save_entry import updateOrGenerateEntry
from main.ContentGeneration.load_entry import loadContentForEntry, addDaysWithAnEntry
from main.ContentGeneration.delete_entry import deleteEntryAndContent
from main.ContentGeneration.get_full_image import getFullImageReponse
from main.ContentGeneration.get_full_video import getFullVideoResponse
from main.ContentGeneration.move_date import moveSourceDateToDestinationDate

# ToDo - Add streaming request for videos
# ToDo - Consider using type script and bundle to compile javascript functions
# ToDo - Add some tests for saving content from scratch


@putVargsIntoContext
def homePage(request, context):
    get_all_year_summary_information(context)
    return render(request=request, template_name="home.html", context=context)


def latestPage(_request):
    last_date_tuple = get_latest_entry_tuple()
    if last_date_tuple:
        return redirect(f"/edit/{'/'.join(last_date_tuple)}")
    return redirect("/")


@putVargsIntoContext
def yearPage(request, context):
    if not date_exists(context):
        return redirect("/date-not-found")

    addYearInformation(context)
    get_year_entry_information(context)
    return render(request=request, template_name="year.html", context=context)


@putVargsIntoContext
def monthPage(request, context):
    if not date_exists(context):
        return redirect("/date-not-found")

    addMonthInformation(context)
    addDaysWithAnEntry(context)
    return render(request=request, template_name="month.html", context=context)


@putVargsIntoContext
def editEntryPage(request, context):
    if not date_exists(context):
        return redirect("/date-not-found")

    addDayInformation(context)
    get_all_entry_years(context)
    loadContentForEntry(context)

    context["tiny_mce"] = forms.TinyMCEComponent()

    return render(request=request, template_name="day.html", context=context)


def showEntryPage(request, _day: int, _month: str, _year: int):
    return render(request=request, template_name="day.html")


def dateNotFoundPage(request):
    return render(request=request, template_name="DateNotFound.html")


@ajaxRequest
def deleteEntry(post_data: dict):
    return deleteEntryAndContent(post_data)


@ajaxRequest
def saveEntry(post_data: dict):
    return updateOrGenerateEntry(post_data)


@ajaxRequest
def getImage(post_data: dict):
    return getFullImageReponse(post_data)


@ajaxRequest
def getVideo(post_data: dict):
    return getFullVideoResponse(post_data)


@ajaxRequest
def moveEntryDate(post_data: dict):
    return moveSourceDateToDestinationDate(post_data)
