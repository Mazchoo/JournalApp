
import main.forms as forms
from django.shortcuts import render, redirect

from main.Helpers.date_helpers import (addGeneralInformation, addDayInformation, addMonthInformation,
                                       addYearInformation, putVargsIntoContext)
from main.Helpers.ajax_request import ajaxRequest
from main.Helpers.get_year_entry_data import getYearEntryInformation
from main.Helpers.get_all_years_summary import getAllYearSummaryInformation
from main.Helpers.get_latest_entry import getLatestEntryTuple

from main.ContentGeneration.save_entry import updateOrGenerateEntry
from main.ContentGeneration.load_entry import loadContentForEntry, addDaysWithAnEntry
from main.ContentGeneration.delete_entry import deleteEntryAndContent
from main.ContentGeneration.get_full_image import getFullImageReponse


@putVargsIntoContext
def homePage(request, context):
    addGeneralInformation(context)
    getAllYearSummaryInformation(context)
    return render(request=request, template_name='home.html', context=context)


def latestPage(_request):
    last_date_tuple = getLatestEntryTuple()
    if last_date_tuple:
        return redirect(f'/edit/{"/".join(last_date_tuple)}')
    return redirect('/')


@putVargsIntoContext
def yearPage(request, context):
    addYearInformation(context)
    getYearEntryInformation(context)
    return render(request=request, template_name='year.html', context=context)


@putVargsIntoContext
def monthPage(request, context):
    addMonthInformation(context)
    addDaysWithAnEntry(context)
    return render(request=request, template_name='month.html', context=context)


@putVargsIntoContext
def editEntryPage(request, context):
    addDayInformation(context)
    context['tiny_mce'] = forms.TinyMCEComponent()
    context['saved_content'] = loadContentForEntry(context['date_slug'])

    return render(request=request, template_name='day.html', context=context)


def showEntryPage(request, _day: int, _month: str, _year: int):
    return render(request=request, template_name='month.html')


def dateNotFoundPage(request):
    return render(request=request, template_name='DateNotFound.html')


@ajaxRequest
def deleteEntry(post_data: dict):
    return deleteEntryAndContent(post_data)


@ajaxRequest
def saveEntry(post_data: dict):
    return updateOrGenerateEntry(post_data)


@ajaxRequest
def getImage(post_data: dict):
    return getFullImageReponse(post_data)

# ToDo use flake8 on all files
# ToDo Add a .bat file to run and open webpage
# ToDo Add a request to move an entry to another date
