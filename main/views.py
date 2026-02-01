"""Routing for all requests"""

from django.shortcuts import render, redirect

from main.forms import ParagraphForm
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

from main.ContentGeneration.save_entry import update_or_generate_from_request
from main.ContentGeneration.load_entry import (
    load_all_content_from_entry,
    add_statistics_from_entries_in_month,
)
from main.ContentGeneration.delete_entry import delete_entry_and_content
from main.ContentGeneration.get_full_image import get_full_image_reponse
from main.ContentGeneration.get_full_video import getFullVideoResponse
from main.ContentGeneration.move_date import move_source_date_to_desination_request

# ToDo - Consider using type script and bundle to compile javascript functions
# ToDo - Add some tests for saving content from scratch


@put_day_and_month_names_into_context
def home_page(request, context):
    """Home page summarising all years"""
    get_all_year_summary_information(context)
    return render(request=request, template_name="home.html", context=context)


def latest_page(_request):
    """Return latest entry"""
    last_date_tuple = get_latest_entry_tuple()
    if last_date_tuple:
        return redirect(f"/edit/{'/'.join(last_date_tuple)}")
    return redirect("/")


@put_day_and_month_names_into_context
def year_page(request, context):
    """Return page that summarises a year"""
    if not date_exists(context):
        return redirect("/date-not-found")

    add_year_information(context)
    get_year_entry_information(context)
    return render(request=request, template_name="year.html", context=context)


@put_day_and_month_names_into_context
def month_page(request, context):
    """Return page that summarises a month"""
    if not date_exists(context):
        return redirect("/date-not-found")

    add_month_information(context)
    add_statistics_from_entries_in_month(context)
    return render(request=request, template_name="month.html", context=context)


@put_day_and_month_names_into_context
def edit_entry_page(request, context):
    """Return content for single entry page"""
    if not date_exists(context):
        return redirect("/date-not-found")

    add_day_information(context)
    get_all_entry_years(context)
    load_all_content_from_entry(context)

    context["tiny_mce"] = ParagraphForm()

    return render(request=request, template_name="day.html", context=context)


def show_entry_page(request, _day: int, _month: str, _year: int):
    """Placeholder for extra content generated from a single entry"""
    return render(request=request, template_name="day.html")


def date_not_found_page(request):
    """Return page for date that does not exist"""
    return render(request=request, template_name="DateNotFound.html")


@ajax_request
def delete_entry(post_data):
    """Async delete an entry"""
    return delete_entry_and_content(post_data)


@ajax_request
def save_entry(post_data):
    """Async save an entry"""
    return update_or_generate_from_request(post_data)


@ajax_request
def get_image(post_data):
    """Async get a full image (not downsized one)"""
    return get_full_image_reponse(post_data)


@ajax_request
def get_video(post_data):
    """Async stream a video"""
    return getFullVideoResponse(post_data)


@ajax_request
def move_entry_date(post_data):
    """Async move entry to a different date"""
    return move_source_date_to_desination_request(post_data)
