from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("clients", views.ClientViewSet, basename="client")
router.register("invoices", views.InvoiceViewSet, basename="invoice")

urlpatterns = [
    path("company/", views.CompanyView.as_view(), name="company"),
    path("amount-in-words/", views.AmountInWordsView.as_view(), name="amount-in-words"),
    path("", include(router.urls)),
]
