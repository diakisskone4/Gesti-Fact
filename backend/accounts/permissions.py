from rest_framework.permissions import BasePermission


class IsDeveloper(BasePermission):
    """Accès réservé à l'espace développeur."""

    message = "Accès réservé aux développeurs."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_developer)
