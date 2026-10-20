from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

from .utils import amount_in_words

TWO_PLACES = Decimal("0.01")


def money(value):
    return Decimal(value).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def company_upload_path(instance, filename):
    return f"company/{instance.owner_id}/{filename}"


class Company(models.Model):
    """Informations de l'entreprise émettrice (une par utilisateur)."""

    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="company")
    name = models.CharField("raison sociale", max_length=200, default="Mon Entreprise")
    slogan = models.CharField(max_length=200, blank=True)
    address = models.CharField("adresse", max_length=300, blank=True)
    phone = models.CharField("téléphone", max_length=60, blank=True)
    email = models.EmailField(blank=True)
    website = models.CharField(max_length=200, blank=True)
    legal_ids = models.CharField("RCCM / NCC / IFU", max_length=300, blank=True)
    bank_details = models.CharField("coordonnées bancaires", max_length=300, blank=True)
    logo = models.ImageField(upload_to=company_upload_path, blank=True, null=True)
    signature = models.ImageField(upload_to=company_upload_path, blank=True, null=True)
    signatory_name = models.CharField("nom du signataire", max_length=150, blank=True)
    signatory_title = models.CharField("titre du signataire", max_length=150, default="La Direction")
    currency_code = models.CharField("symbole monétaire", max_length=10, default="FCFA")
    currency_name = models.CharField("devise en lettres", max_length=50, default="francs CFA")
    default_tva_rate = models.DecimalField("TVA par défaut (%)", max_digits=5, decimal_places=2, default=18)
    invoice_prefix = models.CharField("préfixe des factures", max_length=10, default="FAC")
    footer_note = models.CharField("mention de bas de page", max_length=300, blank=True)
    primary_color = models.CharField("couleur principale", max_length=7, default="#1F3A5F")

    class Meta:
        verbose_name = "entreprise"

    def __str__(self):
        return self.name


class Client(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="clients")
    name = models.CharField("nom / raison sociale", max_length=200)
    address = models.CharField("adresse", max_length=300, blank=True)
    phone = models.CharField("téléphone", max_length=60, blank=True)
    email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class InvoiceSequence(models.Model):
    """Compteur annuel par utilisateur, verrouillé pour garantir des numéros uniques et continus."""

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    year = models.PositiveIntegerField()
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("owner", "year")

    @classmethod
    def next_number(cls, owner, prefix, year):
        with transaction.atomic():
            seq, _ = cls.objects.select_for_update().get_or_create(owner=owner, year=year)
            seq.last_number += 1
            seq.save(update_fields=["last_number"])
            return f"{prefix}-{year}-{seq.last_number:04d}"


class Invoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Brouillon"
        ISSUED = "issued", "Émise"
        PAID = "paid", "Payée"
        CANCELLED = "cancelled", "Annulée"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="invoices")
    number = models.CharField("facture N°", max_length=30, editable=False)
    date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ISSUED)

    # « Doit à » : copie des informations client au moment de la facturation
    client = models.ForeignKey(Client, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    client_name = models.CharField("doit à", max_length=200)
    client_address = models.CharField(max_length=300, blank=True)
    client_phone = models.CharField(max_length=60, blank=True)
    client_email = models.EmailField(blank=True)

    tva_rate = models.DecimalField("TVA (%)", max_digits=5, decimal_places=2, default=18)
    notes = models.TextField("observations", blank=True)

    total_ht = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    tva_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    total_ttc = models.DecimalField(max_digits=16, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        unique_together = ("owner", "number")

    def __str__(self):
        return self.number

    def save(self, *args, **kwargs):
        if not self.number:
            company = Company.objects.filter(owner=self.owner).first()
            prefix = company.invoice_prefix if company else "FAC"
            self.number = InvoiceSequence.next_number(self.owner, prefix, self.date.year)
        super().save(*args, **kwargs)

    def recompute_totals(self, save=True):
        total = sum((item.amount for item in self.items.all()), Decimal("0"))
        self.total_ht = money(total)
        self.tva_amount = money(self.total_ht * Decimal(self.tva_rate) / 100)
        self.total_ttc = money(self.total_ht + self.tva_amount)
        if save:
            self.save(update_fields=["total_ht", "tva_amount", "total_ttc", "updated_at"])

    @property
    def amount_in_words(self):
        company = getattr(self.owner, "company", None)
        currency = company.currency_name if company else "francs CFA"
        return amount_in_words(self.total_ttc, currency)


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    position = models.PositiveIntegerField(default=0)
    designation = models.CharField("désignation", max_length=500)
    quantity = models.DecimalField("quantité", max_digits=12, decimal_places=2, default=1)
    unit_price = models.DecimalField("prix unitaire", max_digits=14, decimal_places=2, default=0)
    amount = models.DecimalField("montant", max_digits=16, decimal_places=2, default=0, editable=False)

    class Meta:
        ordering = ["position", "id"]

    def save(self, *args, **kwargs):
        # Montant = Quantité × Prix unitaire
        self.amount = money(Decimal(self.quantity) * Decimal(self.unit_price))
        super().save(*args, **kwargs)
