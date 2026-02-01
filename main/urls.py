from django.urls import path
import main.views as views

app_name = "main"

urlpatterns = [
    path("", views.home_page, name="homepage"),
    path("year/<int:year>/", views.year_page, name="year"),
    path("month/<int:year>/<str:month>/", views.month_page, name="month"),
    path("edit/<int:year>/<str:month>/<int:day>/", views.edit_entry_page, name="edit"),
    path("show/<int:year>/<str:month>/<int:day>/", views.edit_entry_page, name="show"),
    path("latest", views.latest_page, name="latest"),
    path("date-not-found", views.date_not_found_page, name="date-not-found"),
    path("ajax/save-entry/", views.save_entry, name="save-entry"),
    path("ajax/delete-entry/", views.delete_entry, name="delete-entry"),
    path("ajax/get-image/", views.get_image, name="get-image"),
    path("ajax/get-video/", views.get_video, name="get-video"),
    path("ajax/move-date/", views.move_entry_date, name="move-date"),
]
