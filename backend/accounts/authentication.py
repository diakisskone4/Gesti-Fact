from datetime import timedelta

from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import User

# Évite d'écrire en base à chaque requête : on rafraîchit au plus une fois par minute
TOUCH_INTERVAL = timedelta(seconds=60)


class ActivityJWTAuthentication(JWTAuthentication):
    """Authentification JWT qui enregistre la dernière activité de l'utilisateur."""

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None
        user, token = result
        now = timezone.now()
        if not user.is_connected or not user.last_seen or now - user.last_seen > TOUCH_INTERVAL:
            User.objects.filter(pk=user.pk).update(last_seen=now, is_connected=True)
            user.last_seen, user.is_connected = now, True
        return user, token


def client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
