from __future__ import annotations

from pathlib import Path
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from ai.schemas import SearchPlan
from models.place import PlaceRecord


def _font():
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            try:
                pdfmetrics.registerFont(TTFont("EngineFont", p))
                return "EngineFont"
            except Exception:
                pass
    return "Helvetica"


def export_pdf(records: list[PlaceRecord], plan: SearchPlan) -> str:
    Path("exports").mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = Path("exports") / f"results_{stamp}.pdf"
    font = _font()

    doc = SimpleDocTemplate(
        str(path),
        pagesize=landscape(A4),
        rightMargin=24, leftMargin=24, topMargin=24, bottomMargin=24
    )
    styles = getSampleStyleSheet()
    styles["Title"].fontName = font
    styles["BodyText"].fontName = font

    story = [
        Paragraph("Pakistan Data Engine — Place Research Report", styles["Title"]),
        Spacer(1, 8),
        Paragraph(f"<b>Search:</b> {plan.original_query}", styles["BodyText"]),
        Paragraph(f"<b>Location:</b> {plan.location.display_name()}", styles["BodyText"]),
        Paragraph(f"<b>Category:</b> {plan.category}", styles["BodyText"]),
        Paragraph(f"<b>Retrieved:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["BodyText"]),
        Spacer(1, 12),
    ]

    headers = ["#", "Business", "Category", "Area", "Address", "Phone", "Website", "Rating"]
    data = [headers]
    for i, r in enumerate(records, 1):
        data.append([
            str(i), r.business_name or "N/A", r.category or "N/A",
            r.area or "N/A", r.address or "Not publicly available",
            r.phone or "Not publicly available",
            r.website or "Not publicly available",
            str(r.rating) if r.rating is not None else "N/A",
        ])

    table = Table(data, repeatRows=1, colWidths=[22, 120, 75, 70, 180, 100, 150, 45])
    table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), font),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8eef5")),
        ("FONTNAME", (0, 0), (-1, 0), font),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(table)
    doc.build(story)
    return str(path)
