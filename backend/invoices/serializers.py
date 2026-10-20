from django.db import transaction
from rest_framework import serializers

from .models import Client, Company, Invoice, InvoiceItem


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        exclude = ["owner"]

    def to_internal_value(self, data):
        # En multipart, envoyer "" efface le logo / la signature
        if hasattr(data, "copy"):
            data = data.copy()
        for field in ("logo", "signature"):
            if data.get(field) == "":
                data[field] = None
        return super().to_internal_value(data)


class ClientSerializer(serializers.ModelSerializer):
    invoice_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Client
        fields = ["id", "name", "address", "phone", "email", "invoice_count", "created_at"]


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ["id", "position", "designation", "quantity", "unit_price", "amount"]
        read_only_fields = ["id", "amount"]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("La quantité doit être positive.")
        return value

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Le prix unitaire ne peut pas être négatif.")
        return value


class InvoiceListSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "number", "date", "status", "status_label", "client_name",
            "total_ht", "tva_rate", "tva_amount", "total_ttc",
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    amount_in_words = serializers.CharField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "number", "date", "status", "status_label",
            "client", "client_name", "client_address", "client_phone", "client_email",
            "tva_rate", "notes", "items",
            "total_ht", "tva_amount", "total_ttc", "amount_in_words",
            "created_at", "updated_at",
        ]
        read_only_fields = ["number", "total_ht", "tva_amount", "total_ttc", "created_at", "updated_at"]
        extra_kwargs = {"client_name": {"required": False, "allow_blank": True}}

    def validate_client(self, client):
        if client and client.owner_id != self.context["request"].user.id:
            raise serializers.ValidationError("Client introuvable.")
        return client

    def validate_tva_rate(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Le taux de TVA doit être compris entre 0 et 100.")
        return value

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("Ajoutez au moins une ligne à la facture.")
        return items

    def validate(self, attrs):
        client = attrs.get("client")
        # Pré-remplit « Doit à » depuis la fiche client si les champs sont vides
        if client:
            for field in ("name", "address", "phone", "email"):
                key = f"client_{field}"
                if not attrs.get(key):
                    attrs[key] = getattr(client, field)
        if not attrs.get("client_name") and not (self.instance and self.instance.client_name):
            raise serializers.ValidationError({"client_name": "Indiquez le client (Doit à)."})
        return attrs

    def _save_items(self, invoice, items):
        invoice.items.all().delete()
        for index, item in enumerate(items):
            item.pop("position", None)
            InvoiceItem.objects.create(invoice=invoice, position=index, **item)
        invoice.recompute_totals()

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop("items")
        invoice = Invoice.objects.create(**validated_data)
        self._save_items(invoice, items)
        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        items = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items is not None:
            self._save_items(instance, items)
        else:
            instance.recompute_totals()
        return instance
