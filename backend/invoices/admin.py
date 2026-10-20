from django.contrib import admin

from .models import Client, Company, Invoice, InvoiceItem


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    readonly_fields = ["amount"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["number", "date", "client_name", "total_ttc", "status", "owner"]
    list_filter = ["status", "date"]
    search_fields = ["number", "client_name"]
    readonly_fields = ["number", "total_ht", "tva_amount", "total_ttc"]
    inlines = [InvoiceItemInline]


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "phone", "email"]


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "phone", "email"]
    search_fields = ["name", "email"]
