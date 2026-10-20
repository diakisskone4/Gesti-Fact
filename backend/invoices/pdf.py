"""Génération PDF des factures (ReportLab)."""
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

from .utils import format_amount, format_quantity

PAGE_W, PAGE_H = A4
MARGIN = 15 * mm
CONTENT_W = PAGE_W - 2 * MARGIN
MIN_ROWS = 6

INK = colors.HexColor("#1E2329")
MUTED = colors.HexColor("#6B7280")
LINE = colors.HexColor("#D9DEE5")
SOFT = colors.HexColor("#F3F5F8")


def _color(value, fallback="#1F3A5F"):
    try:
        return colors.HexColor(value or fallback)
    except ValueError:
        return colors.HexColor(fallback)


def _esc(text):
    return (str(text or "")).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _image(data, max_w, max_h):
    """Retourne un flowable Image (depuis des octets) redimensionné en conservant les proportions, ou None."""
    if not data:
        return None
    try:
        width, height = ImageReader(BytesIO(data)).getSize()
    except Exception:
        return None
    ratio = min(max_w / width, max_h / height)
    img = Image(BytesIO(data), width=width * ratio, height=height * ratio)
    img.hAlign = "LEFT"
    return img


def _styles(primary):
    base = dict(fontName="Helvetica", fontSize=9, leading=12, textColor=INK)
    return {
        "body": ParagraphStyle("body", **base),
        "small": ParagraphStyle("small", **{**base, "fontSize": 8, "leading": 10.5, "textColor": MUTED}),
        "company": ParagraphStyle("company", **{**base, "fontName": "Helvetica-Bold", "fontSize": 13, "leading": 16}),
        "title": ParagraphStyle(
            "title", **{**base, "fontName": "Helvetica-Bold", "fontSize": 30, "leading": 34,
                        "textColor": primary, "alignment": TA_RIGHT}
        ),
        "label": ParagraphStyle(
            "label", **{**base, "fontName": "Helvetica-Bold", "fontSize": 8, "textColor": primary}
        ),
        "client": ParagraphStyle("client", **{**base, "fontName": "Helvetica-Bold", "fontSize": 11, "leading": 14}),
        "th": ParagraphStyle(
            "th", **{**base, "fontName": "Helvetica-Bold", "textColor": colors.white, "alignment": TA_CENTER}
        ),
        "cell": ParagraphStyle("cell", **base),
        "num": ParagraphStyle("num", **{**base, "alignment": TA_RIGHT}),
        "center": ParagraphStyle("center", **{**base, "alignment": TA_CENTER}),
        "words": ParagraphStyle("words", **{**base, "fontSize": 9.5, "leading": 14}),
        "sign": ParagraphStyle("sign", **{**base, "fontName": "Helvetica-Bold", "alignment": TA_CENTER}),
        "sign_name": ParagraphStyle("sign_name", **{**base, "alignment": TA_CENTER}),
        "left": ParagraphStyle("left", **{**base, "alignment": TA_LEFT}),
    }


def _header(invoice, company, st):
    left = []
    logo = _image(company.image_bytes("logo"), 55 * mm, 24 * mm)
    if logo:
        left += [logo, Spacer(1, 3 * mm)]
    left.append(Paragraph(_esc(company.name), st["company"]))
    if company.slogan:
        left.append(Paragraph(f"<i>{_esc(company.slogan)}</i>", st["small"]))
    if company.address:
        left.append(Paragraph(_esc(company.address), st["small"]))

    right = [Paragraph("FACTURE", st["title"])]
    if invoice.status == invoice.Status.CANCELLED:
        right.append(Paragraph("<font color='#B91C1C'><b>ANNULÉE</b></font>", st["num"]))

    table = Table([[left, right]], colWidths=[CONTENT_W * 0.58, CONTENT_W * 0.42])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def _parties(invoice, st, primary):
    """Bloc gauche « Doit à », bloc droit Facture N° / Date / Téléphone / Email."""
    doit = [Paragraph("DOIT À", st["label"]), Spacer(1, 1.5 * mm),
            Paragraph(_esc(invoice.client_name), st["client"])]
    if invoice.client_address:
        doit.append(Paragraph(_esc(invoice.client_address), st["body"]))

    rows = [
        ("Facture N°", f"<b>{_esc(invoice.number)}</b>"),
        ("Date", invoice.date.strftime("%d/%m/%Y")),
        ("Téléphone", _esc(invoice.client_phone) or "—"),
        ("Email", _esc(invoice.client_email) or "—"),
    ]
    info = Table(
        [[Paragraph(f"<b>{k}</b>", st["body"]), Paragraph(v, st["num"])] for k, v in rows],
        colWidths=[26 * mm, CONTENT_W * 0.45 - 26 * mm],
    )
    info.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), SOFT),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, primary),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))

    gap = CONTENT_W * 0.04
    table = Table([[doit, "", info]], colWidths=[CONTENT_W * 0.51, gap, CONTENT_W * 0.45])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (0, 0), SOFT),
        ("LINEBEFORE", (0, 0), (0, 0), 2.5, primary),
        ("LEFTPADDING", (0, 0), (0, 0), 8),
        ("TOPPADDING", (0, 0), (0, 0), 7),
        ("BOTTOMPADDING", (0, 0), (0, 0), 7),
        ("LEFTPADDING", (1, 0), (-1, 0), 0),
        ("RIGHTPADDING", (0, 0), (-1, 0), 0),
        ("TOPPADDING", (2, 0), (2, 0), 0),
    ]))
    return table


def _items(invoice, st, primary, currency):
    widths = [0.07, 0.43, 0.12, 0.19, 0.19]
    data = [[Paragraph(h, st["th"]) for h in ("N°", "Désignation", "Quantité", "Prix unitaire", "Montant")]]
    items = list(invoice.items.all())
    for index, item in enumerate(items, start=1):
        data.append([
            Paragraph(str(index), st["center"]),
            Paragraph(_esc(item.designation), st["cell"]),
            Paragraph(format_quantity(item.quantity), st["center"]),
            Paragraph(format_amount(item.unit_price), st["num"]),
            Paragraph(format_amount(item.amount), st["num"]),
        ])
    for _ in range(max(0, MIN_ROWS - len(items))):
        data.append(["", "", "", "", ""])

    heights = [None] * (len(items) + 1) + [7 * mm] * (len(data) - len(items) - 1)
    table = Table(data, colWidths=[CONTENT_W * w for w in widths], repeatRows=1, rowHeights=heights)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), primary),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LINEAFTER", (0, 0), (-2, -1), 0.4, LINE),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for row in range(2, len(data), 2):
        style.append(("BACKGROUND", (0, row), (-1, row), SOFT))
    table.setStyle(TableStyle(style))
    return table


def _totals(invoice, st, primary, currency):
    notes = []
    if invoice.notes:
        notes = [Paragraph("OBSERVATIONS", st["label"]), Spacer(1, 1.5 * mm),
                 Paragraph(_esc(invoice.notes).replace("\n", "<br/>"), st["body"])]

    tva = format_quantity(invoice.tva_rate)
    rows = [
        ["Total HT", format_amount(invoice.total_ht, currency)],
        [f"TVA ({tva} %)", format_amount(invoice.tva_amount, currency)],
        ["NET À PAYER TTC", format_amount(invoice.total_ttc, currency)],
    ]
    totals = Table(rows, colWidths=[CONTENT_W * 0.22, CONTENT_W * 0.20])
    totals.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINE),
        ("BACKGROUND", (0, 0), (-1, 1), SOFT),
        ("BACKGROUND", (0, -1), (-1, -1), primary),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, -1), (-1, -1), 10.5),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))

    table = Table([[notes, totals]], colWidths=[CONTENT_W * 0.56, CONTENT_W * 0.44])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def _words(invoice, st, primary):
    text = (
        "Arrêtée la présente facture à la somme de : "
        f"<b>{_esc(invoice.amount_in_words)}</b> toutes taxes comprises."
    )
    table = Table([[Paragraph(text, st["words"])]], colWidths=[CONTENT_W])
    table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 3, primary),
        ("BACKGROUND", (0, 0), (-1, -1), SOFT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def _signature(company, st):
    block = [Paragraph(_esc(company.signatory_title or "La Direction"), st["sign"]), Spacer(1, 2 * mm)]
    sig = _image(company.image_bytes("signature"), 45 * mm, 20 * mm)
    if sig:
        sig.hAlign = "CENTER"
        block.append(sig)
    else:
        block.append(Spacer(1, 18 * mm))
    block.append(Paragraph(_esc(company.signatory_name) or "&nbsp;", st["sign_name"]))

    sign_w = CONTENT_W * 0.40
    inner = Table([[block]], colWidths=[sign_w])
    inner.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.6, LINE)]))
    table = Table([["", inner]], colWidths=[CONTENT_W - sign_w, sign_w])
    table.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def _page_decor(company, primary):
    footer_lines = [
        " · ".join(filter(None, [company.name, company.address])),
        " · ".join(filter(None, [
            f"Tél : {company.phone}" if company.phone else "",
            company.email, company.website,
        ])),
        " · ".join(filter(None, [company.legal_ids, company.bank_details])),
        company.footer_note,
    ]
    footer_lines = [line for line in footer_lines if line]

    def draw(canvas, doc):
        canvas.saveState()
        # Bandeau supérieur
        canvas.setFillColor(primary)
        canvas.rect(0, PAGE_H - 6 * mm, PAGE_W, 6 * mm, stroke=0, fill=1)
        canvas.setFillColor(colors.HexColor("#C9A227"))
        canvas.rect(0, PAGE_H - 7.2 * mm, PAGE_W, 1.2 * mm, stroke=0, fill=1)
        # Pied de page
        y = 10 * mm + 3.6 * mm * (len(footer_lines) - 1)
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.6)
        canvas.line(MARGIN, y + 5 * mm, PAGE_W - MARGIN, y + 5 * mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(MUTED)
        for line in footer_lines:
            canvas.drawCentredString(PAGE_W / 2, y, line[:160])
            y -= 3.6 * mm
        canvas.drawRightString(PAGE_W - MARGIN, 5 * mm, f"Page {doc.page}")
        canvas.restoreState()

    return draw


def render_invoice_pdf(invoice, company):
    buffer = BytesIO()
    primary = _color(company.primary_color)
    currency = company.currency_code
    st = _styles(primary)
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=30 * mm,
        title=f"Facture {invoice.number}", author=company.name, subject=f"Facture {invoice.number}",
    )
    story = [
        _header(invoice, company, st),
        Spacer(1, 7 * mm),
        _parties(invoice, st, primary),
        Spacer(1, 7 * mm),
        _items(invoice, st, primary, currency),
        Spacer(1, 5 * mm),
        KeepTogether([
            _totals(invoice, st, primary, currency),
            Spacer(1, 5 * mm),
            _words(invoice, st, primary),
        ]),
        Spacer(1, 6 * mm),
        KeepTogether([_signature(company, st)]),
    ]
    decor = _page_decor(company, primary)
    doc.build(story, onFirstPage=decor, onLaterPages=decor)
    return buffer.getvalue()
