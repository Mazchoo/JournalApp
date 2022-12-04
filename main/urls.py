from django.urls import path
import main.views as views

app_name = 'main'

urlpatterns = [
    path('', views.homePage, name='homepage'),
    path('year/<int:year>/', views.yearPage, name='year'),
    path('month/<int:year>/<str:month>/', views.monthPage, name='month'),
    path('edit/<int:year>/<str:month>/<int:day>/', views.editEntryPage, name='edit'),
    path('show/<int:year>/<str:month>/<int:day>/', views.showEntryPage, name='show'),
    path('latest', views.homePage, name='latest'),
    path('date-not-found', views.homePage, name='date-not-found'),
    path('ajax/save-entry/', views.saveEntry, name='save-entry'),
]
