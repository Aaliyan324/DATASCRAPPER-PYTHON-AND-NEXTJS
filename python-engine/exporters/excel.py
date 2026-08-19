from __future__ import annotations

from pathlib import Path
from datetime import datetime

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment

from ai.schemas import SearchPlan
from models.place import PlaceRecord


def export_excel(records: list[PlaceRecord], plan: SearchPlan) -> str:
    Path("exports").mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = Path("exports") / f"results_{stamp}.xlsx"

    wb = Workbook()
    ws = wb.active
    ws.title = "Places"

    headers = [
        "Business Name", "Category", "Area", "Address", "Phone Number",
        "Website", "Google Maps URL", "Rating", "Review Count", "Status"
    ]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)
        cell.alignment = Alignment(horizontal="center")

    for r in records:
        ws.append([
            r.business_name or "N/A",
            r.category or "N/A",
            r.area or "N/A",
            r.address or "Not publicly available",
            r.phone or "Not publicly available",
            r.website or "Not publicly available",
            r.google_maps_url or "Not publicly available",
            r.rating if r.rating is not None else "N/A",
            r.review_count if r.review_count is not None else "N/A",
            r.business_status or "N/A",
        ])

    widths = [30, 18, 20, 45, 20, 35, 45, 10, 14, 18]
    for idx, width in enumerate(widths, 1):
        ws.column_dimensions[chr(64 + idx)].width = width
    ws.freeze_panes = "A2"
    wb.save(path)
    return str(path)
