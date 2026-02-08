"""Routing for all requests"""

from django.shortcuts import render, redirect

from main.forms import ParagraphForm
from main.database_layer.fe_interfaces import DayAndMonthNamesContext
from main.database_layer.date_request import put_day_and_month_names_into_context
from main.database_layer.date_slugs import date_exists
from main.database_layer.ajax_request import ajax_request
from main.database_layer.get_context import (
    get_home_page_context,
    get_year_page_context,
    get_month_page_context,
    get_day_page_context,
)
from main.database_layer.get_latest_entry import get_latest_entry_tuple

from main.content_generation.save_entry import update_or_generate_from_request
from main.content_generation.delete_entry import delete_entry_and_content
from main.content_generation.get_full_image import get_full_image_reponse
from main.content_generation.get_full_video import getFullVideoResponse
from main.content_generation.move_date import move_source_date_to_desination_request


@put_day_and_month_names_into_context
def home_page(request, context: DayAndMonthNamesContext):
    """Home page summarising all years"""
    page_context = get_home_page_context(context)
    return render(request=request, template_name="home.html", context=page_context)


def latest_page(_request):
    """Return latest entry"""
    last_date_tuple = get_latest_entry_tuple()
    if last_date_tuple:
        return redirect(f"/edit/{'/'.join(last_date_tuple)}")
    return redirect("/")


@put_day_and_month_names_into_context
def year_page(request, context: DayAndMonthNamesContext):
    """Return page that summarises a year"""
    year: int = context["year"]  # type: ignore[typeddict-item]

    if not date_exists(year):
        return redirect("/date-not-found")

    page_context = get_year_page_context(context, year)
    return render(request=request, template_name="year.html", context=page_context)


@put_day_and_month_names_into_context
def month_page(request, context: DayAndMonthNamesContext):
    """Return page that summarises a month"""
    year: int = context["year"]  # type: ignore[typeddict-item]
    month: str = context["month"]  # type: ignore[typeddict-item]

    if not date_exists(year, month):
        return redirect("/date-not-found")

    page_context = get_month_page_context(context, year, month)
    return render(request=request, template_name="month.html", context=page_context)


@put_day_and_month_names_into_context
def edit_entry_page(request, context: DayAndMonthNamesContext):
    """Return content for single entry page"""
    year: int = context["year"]  # type: ignore[typeddict-item]
    month: str = context["month"]  # type: ignore[typeddict-item]
    day: int = context["day"]  # type: ignore[typeddict-item]

    if not date_exists(year, month, day):
        return redirect("/date-not-found")

    page_context = get_day_page_context(context, year, month, day)
    page_context["tiny_mce"] = ParagraphForm()  # type: ignore[typeddict-unknown-key]

    return render(request=request, template_name="day.html", context=page_context)


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
