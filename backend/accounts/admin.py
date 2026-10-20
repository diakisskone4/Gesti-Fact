from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import LoginEvent, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["-date_joined"]
    list_display = ["email", "username", "role", "is_connected", "last_seen", "is_active"]
    list_filter = ["role", "is_active", "is_connected"]
    search_fields = ["email", "username", "first_name", "last_name"]
    fieldsets = BaseUserAdmin.fieldsets + (("Gesti-Fact", {"fields": ("role", "phone", "last_seen", "is_connected")}),)
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "username", "role", "password1", "password2")}),
    )


@admin.register(LoginEvent)
class LoginEventAdmin(admin.ModelAdmin):
    list_display = ["created_at", "email", "kind", "ip_address"]
    list_filter = ["kind"]
    search_fields = ["email", "ip_address"]
