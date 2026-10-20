from decimal import ROUND_HALF_UP, Decimal
from io import BytesIO

from num2words import num2words
from PIL import Image

MAX_IMAGE_SIZE = (900, 450)


def compress_image(upload):
    """Redimensionne une image (logo / signature) et la convertit en PNG optimisé."""
    image = Image.open(upload)
    image = image.convert("RGBA")
    image.thumbnail(MAX_IMAGE_SIZE)
    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue(), "image/png"


def amount_in_words(amount, currency_name="francs CFA"):
    """Convertit un montant en toutes lettres (français).

    >>> amount_in_words(Decimal("118000"))
    'Cent dix-huit mille francs CFA'
    """
    amount = Decimal(amount or 0).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    units = int(amount)
    cents = int((amount - units) * 100)
    words = num2words(units, lang="fr")
    if cents:
        words += f" {currency_name} et {num2words(cents, lang='fr')} centimes"
    else:
        words += f" {currency_name}"
    return words[:1].upper() + words[1:]


def format_amount(value, currency=""):
    """Formate un montant à la française : 1 250 000 ou 1 250,50."""
    value = Decimal(value or 0).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if value == value.to_integral():
        text = f"{int(value):,}".replace(",", " ")
    else:
        text = f"{value:,.2f}".replace(",", " ").replace(".", ",")
    return f"{text} {currency}".strip()


def format_quantity(value):
    value = Decimal(value or 0)
    if value == value.to_integral():
        return f"{int(value):,}".replace(",", " ")
    return f"{value.normalize():f}".replace(".", ",")
