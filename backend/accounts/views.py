from datetime import timedelta

from django.conf import settings
from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .authentication import client_ip
from .models import LoginEvent, User
from .permissions import IsDeveloper
from .serializers import (
    DevUserSerializer, LoginEventSerializer, LoginSerializer, RegisterSerializer, UserSerializer,
)


def log_event(request, kind, user=None, email=""):
    LoginEvent.objects.create(
        user=user,
        email=email or (user.email if user else ""),
        kind=kind,
        ip_address=client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:300],
    )


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


def mark_connected(user):
    now = timezone.now()
    User.objects.filter(pk=user.pk).update(last_seen=now, last_login=now, is_connected=True)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        mark_connected(user)
        log_event(request, LoginEvent.Kind.LOGIN, user)
        user.refresh_from_db()
        return Response({**tokens_for(user), "user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        email = request.data.get("email", "")
        try:
            serializer.is_valid(raise_exception=True)
        except (AuthenticationFailed, ValidationError):
            log_event(request, LoginEvent.Kind.FAILED, User.objects.filter(email__iexact=email).first(), email)
            return Response(
                {"detail": "Email ou mot de passe incorrect."}, status=status.HTTP_401_UNAUTHORIZED
            )
        user = serializer.user
        mark_connected(user)
        log_event(request, LoginEvent.Kind.LOGIN, user)
        return Response(serializer.validated_data)


class LogoutView(APIView):
    def post(self, request):
        refresh = request.data.get("refresh")
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass
        User.objects.filter(pk=request.user.pk).update(is_connected=False)
        log_event(request, LoginEvent.Kind.LOGOUT, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    def post(self, request):
        user = request.user
        if not user.check_password(request.data.get("old_password", "")):
            return Response({"old_password": ["Mot de passe actuel incorrect."]}, status=400)
        new_password = request.data.get("new_password", "")
        if len(new_password) < 6:
            return Response({"new_password": ["6 caractères minimum."]}, status=400)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"detail": "Mot de passe modifié."})


# ---------------------------------------------------------------- Espace développeur

def dev_users_queryset():
    return User.objects.select_related("company").annotate(
        invoice_count=Count("invoices", distinct=True),
        total_invoiced=Coalesce(
            Sum("invoices__total_ttc"), Value(0), output_field=DecimalField(max_digits=18, decimal_places=2)
        ),
    )


class DevUserListView(generics.ListAPIView):
    serializer_class = DevUserSerializer
    permission_classes = [IsDeveloper]

    def get_queryset(self):
        qs = dev_users_queryset()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(email__icontains=search) | Q(username__icontains=search)
                | Q(first_name__icontains=search) | Q(last_name__icontains=search)
            )
        if self.request.query_params.get("online") == "1":
            since = timezone.now() - timedelta(minutes=settings.ONLINE_WINDOW_MINUTES)
            qs = qs.filter(is_connected=True, last_seen__gte=since)
        return qs.order_by("-is_connected", "-last_seen", "-date_joined")


class DevUserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = DevUserSerializer
    permission_classes = [IsDeveloper]

    def get_queryset(self):
        return dev_users_queryset()

    def perform_update(self, serializer):
        user = serializer.save()
        if not user.is_active:
            User.objects.filter(pk=user.pk).update(is_connected=False)


class DevLoginEventListView(generics.ListAPIView):
    serializer_class = LoginEventSerializer
    permission_classes = [IsDeveloper]

    def get_queryset(self):
        qs = LoginEvent.objects.all()
        user_id = self.request.query_params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs


class DevStatsView(APIView):
    permission_classes = [IsDeveloper]

    def get(self, request):
        from invoices.models import Invoice

        now = timezone.now()
        since = now - timedelta(minutes=settings.ONLINE_WINDOW_MINUTES)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return Response({
            "users_total": User.objects.count(),
            "users_online": User.objects.filter(is_connected=True, last_seen__gte=since).count(),
            "users_active_today": User.objects.filter(last_seen__gte=today).count(),
            "logins_today": LoginEvent.objects.filter(kind=LoginEvent.Kind.LOGIN, created_at__gte=today).count(),
            "failed_logins_today": LoginEvent.objects.filter(
                kind=LoginEvent.Kind.FAILED, created_at__gte=today
            ).count(),
            "invoices_total": Invoice.objects.count(),
            "amount_total": Invoice.objects.aggregate(s=Sum("total_ttc"))["s"] or 0,
            "online_window_minutes": settings.ONLINE_WINDOW_MINUTES,
        })
