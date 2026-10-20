from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import LoginEvent, User


class UserSerializer(serializers.ModelSerializer):
    is_developer = serializers.BooleanField(read_only=True)
    is_online = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "username", "first_name", "last_name", "phone",
            "role", "is_developer", "is_online", "last_seen", "date_joined",
        ]
        read_only_fields = ["id", "email", "role", "last_seen", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["email", "username", "first_name", "last_name", "phone", "password"]
        extra_kwargs = {"username": {"required": False}}

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cet email.")
        return value.lower()

    def validate(self, attrs):
        validate_password(attrs["password"], User(email=attrs["email"], username=attrs.get("username", "")))
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        email = validated_data.pop("email")
        return User.objects.create_user(email=email, password=password, **validated_data)


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class DevUserSerializer(UserSerializer):
    invoice_count = serializers.IntegerField(read_only=True)
    total_invoiced = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True, default="")

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + [
            "is_active", "is_connected", "last_login", "invoice_count", "total_invoiced", "company_name",
        ]
        read_only_fields = [f for f in fields if f not in ("role", "is_active")]


class LoginEventSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = LoginEvent
        fields = ["id", "user", "email", "kind", "kind_label", "ip_address", "user_agent", "created_at"]
