from django.urls import path

from . import views

urlpatterns = [
    path("stats/", views.DevStatsView.as_view(), name="dev-stats"),
    path("users/", views.DevUserListView.as_view(), name="dev-users"),
    path("users/<int:pk>/", views.DevUserDetailView.as_view(), name="dev-user-detail"),
    path("events/", views.DevLoginEventListView.as_view(), name="dev-events"),
]
