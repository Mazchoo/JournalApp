
import main.forms as forms

from django.shortcuts import render
from main.Helpers.date_helpers import (addDayInformation, addMonthInformation,
                                       addYearInformation, putVargsIntoContext)
from main.Helpers.ajax_request import ajaxRequest
from main.Helpers.get_year_entry_data import getYearEntryInformation

from main.ContentGeneration.save_entry import updateOrGenerateEntry
from main.ContentGeneration.load_entry import loadContentForEntry, addDaysWithAnEntry


def homePage(request):
    # ToDo - Show images on homepage
    return render(request=request, template_name='home.html')


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
    context['tiny_mce'] = forms.TinyMCEComponent()
    addDayInformation(context)
    context['saved_content'] = loadContentForEntry(context['date_slug'])

    return render(request=request, template_name='day.html', context=context)


def showEntryPage(request, _day: int, _month: str, _year: int):
    return render(request=request, template_name='month.html')


def latestPage(request):
    return render(request=request, template_name='home.html')


def dateNotFoundPage(request):
    return render(request=request, template_name='DateNotFound.html')


@ajaxRequest
def saveEntry(post_data: dict):
    return updateOrGenerateEntry(post_data)
    