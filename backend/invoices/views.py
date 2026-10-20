from datetime import date

from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Client, Company, Invoice
from .pdf import render_invoice_pdf
from .serializers import ClientSerializer, CompanySerializer, InvoiceListSerializer, InvoiceSerializer
from .utils import amount_in_words


def get_company(user):
    company, _ = Company.objects.get_or_create(
        owner=user, defaults={"email": user.email, "phone": user.phone}
    )
    return company


class CompanyView(generics.RetrieveUpdateAPIView):
    serializer_class = CompanySerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_object(self):
        return get_company(self.request.user)


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer

    def get_queryset(self):
        qs = Client.objects.filter(owner=self.request.user).annotate(invoice_count=Count("invoices"))
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(email__icontains=search) | Q(phone__icontains=search))
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class InvoiceViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        return InvoiceListSerializer if self.action == "list" else InvoiceSerializer

    def get_queryset(self):
        qs = Invoice.objects.filter(owner=self.request.user).select_related("owner__company")
        params = self.request.query_params
        if params.get("search"):
            s = params["search"]
            qs = qs.filter(Q(number__icontains=s) | Q(client_name__icontains=s))
        if params.get("status"):
            qs = qs.filter(status=params["status"])
        if self.action != "list":
            qs = qs.prefetch_related("items")
        return qs

    def perform_create(self, serializer):
        get_company(self.request.user)
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        invoice = get_object_or_404(self.get_queryset().prefetch_related("items"), pk=pk)
        content = render_invoice_pdf(invoice, get_company(request.user))
        disposition = "attachment" if request.query_params.get("download") == "1" else "inline"
        response = HttpResponse(content, content_type="application/pdf")
        response["Content-Disposition"] = f'{disposition}; filename="Facture-{invoice.number}.pdf"'
        return response

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = Invoice.objects.filter(owner=request.user).exclude(status=Invoice.Status.CANCELLED)
        today = date.today()
        month = qs.filter(date__year=today.year, date__month=today.month)
        return Response({
            "count": qs.count(),
            "total_ttc": qs.aggregate(s=Sum("total_ttc"))["s"] or 0,
            "month_count": month.count(),
            "month_total": month.aggregate(s=Sum("total_ttc"))["s"] or 0,
            "paid_total": qs.filter(status=Invoice.Status.PAID).aggregate(s=Sum("total_ttc"))["s"] or 0,
            "unpaid_total": qs.filter(status=Invoice.Status.ISSUED).aggregate(s=Sum("total_ttc"))["s"] or 0,
            "clients": Client.objects.filter(owner=request.user).count(),
            "recent": InvoiceListSerializer(qs[:5], many=True).data,
        })


class AmountInWordsView(APIView):
    """Aperçu en direct du montant en lettres pendant la saisie."""

    def get(self, request):
        try:
            amount = request.query_params.get("amount", "0")
            currency = get_company(request.user).currency_name
            return Response({"words": amount_in_words(amount, currency)})
        except Exception:
            return Response({"words": ""})
