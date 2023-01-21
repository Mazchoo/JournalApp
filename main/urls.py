from django.urls import path
import main.views as views

app_name = 'main'

urlpatterns = [
    path('', views.homePage, name='homepage'),
    path('year/<int:year>/', views.yearPage, name='year'),
    path('month/<int:year>/<str:month>/', views.monthPage, name='month'),
    path('edit/<int:year>/<str:month>/<int:day>/', views.editEntryPage, name='edit'),
    path('show/<int:year>/<str:month>/<int:day>/', views.editEntryPage, name='show'),
    path('latest', views.latestPage, name='latest'),
    path('date-not-found', views.homePage, name='date-not-found'),
    path('ajax/save-entry/', views.saveEntry, name='save-entry'),
    path('ajax/delete-entry/', views.deleteEntry, name='delete-entry'),
    path('ajax/get-image/', views.getImage, name='get-image'),
    path('ajax/move-date/', views.moveEntryDate, name='move-date'),
]
