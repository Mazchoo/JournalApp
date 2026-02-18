"""Definition of all urls and routing to functions in website"""

from django.urls import path
from main.views import (
    home_page,
    year_page,
    month_page,
    edit_entry_page,
    latest_page,
    date_not_found_page,
    save_entry,
    delete_entry,
    get_image,
    get_downsized_image,
    get_video,
    get_downsized_video_image,
    move_entry_date,
)

app_name = "main"

urlpatterns = [
    path("", home_page, name="homepage"),
    path("year/<int:year>/", year_page, name="year"),
    path("month/<int:year>/<str:month>/", month_page, name="month"),
    path("edit/<int:year>/<str:month>/<int:day>/", edit_entry_page, name="edit"),
    path("show/<int:year>/<str:month>/<int:day>/", edit_entry_page, name="show"),
    path("latest", latest_page, name="latest"),
    path("date-not-found", date_not_found_page, name="date-not-found"),
    path("ajax/save-entry/", save_entry, name="save-entry"),
    path("ajax/delete-entry/", delete_entry, name="delete-entry"),
    path("ajax/get-image/", get_image, name="get-image"),
    path("ajax/get-downsized-image/", get_downsized_image, name="get-downsized-image"),
    path("ajax/get-video/", get_video, name="get-video"),
    path(
        "ajax/get-downsized-video-image/",
        get_downsized_video_image,
        name="get-downsized-video-image",
    ),
    path("ajax/move-date/", move_entry_date, name="move-date"),
]
