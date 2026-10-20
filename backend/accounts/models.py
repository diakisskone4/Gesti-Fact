from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.utils import timezone


class EmailUserManager(UserManager):
    """Gestionnaire qui utilise l'email comme identifiant de connexion."""

    def _create_user(self, username, email, password, **extra_fields):
        if not email:
            raise ValueError("L'adresse email est obligatoire.")
        email = self.normalize_email(email)
        username = username or email.split("@")[0]
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, username=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(username, email, password, **extra_fields)

    def create_superuser(self, email, password=None, username=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.DEVELOPER)
        return self._create_user(username, email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        USER = "user", "Utilisateur"
        DEVELOPER = "developer", "Développeur"

    email = models.EmailField("email", unique=True)
    username = models.CharField("nom d'utilisateur", max_length=150)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    phone = models.CharField("téléphone", max_length=30, blank=True)
    last_seen = models.DateTimeField("dernière activité", null=True, blank=True)
    is_connected = models.BooleanField("connecté", default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    objects = EmailUserManager()

    class Meta:
        verbose_name = "utilisateur"
        ordering = ["-last_seen", "-date_joined"]

    def __str__(self):
        return self.get_full_name() or self.email

    @property
    def is_developer(self):
        return self.is_superuser or self.role == self.Role.DEVELOPER

    @property
    def is_online(self):
        if not self.is_connected or not self.last_seen:
            return False
        window = timedelta(minutes=settings.ONLINE_WINDOW_MINUTES)
        return timezone.now() - self.last_seen <= window


class LoginEvent(models.Model):
    class Kind(models.TextChoices):
        LOGIN = "login", "Connexion"
        LOGOUT = "logout", "Déconnexion"
        FAILED = "failed", "Échec de connexion"

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="login_events")
    email = models.EmailField(blank=True)
    kind = models.CharField(max_length=10, choices=Kind.choices)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "événement de connexion"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_kind_display()} — {self.email} — {self.created_at:%d/%m/%Y %H:%M}"
