"""
Renders real downloadable reports (CSV / Excel / PDF) from the same
aggregated data analytics_service.py exposes to the dashboard — so the
Reports Center's exports always match what the Analytics page shows.
"""
import csv
import io
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.services import analytics_service, report_service


def _gather_report_data(db: Session) -> dict:
    summary = report_service.summary(db)
    breakdown = analytics_service.severity_breakdown(db)
    workers = analytics_service.worker_risk_ranking(db, limit=15)
    zones = analytics_service.zone_ranking(db, limit=15)
    cameras = analytics_service.camera_statistics(db)
    exec_summary = analytics_service.executive_summary(db)
    return {
        "summary": summary,
        "severity_breakdown": breakdown,
        "workers": workers,
        "zones": zones,
        "cameras": cameras,
        "executive": exec_summary,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    }


def generate_csv_report(db: Session) -> bytes:
    data = _gather_report_data(db)
    buffer = io.StringIO()
    writer = csv.writer(buffer)

    writer.writerow(["Sentinel Safety Report", data["generated_at"]])
    writer.writerow([])
    writer.writerow(["Summary"])
    for key, value in data["summary"].items():
        writer.writerow([key, value])
    writer.writerow([])

    writer.writerow(["Severity Breakdown"])
    writer.writerow(["Severity", "Count"])
    for severity, count in data["severity_breakdown"].items():
        writer.writerow([severity, count])
    writer.writerow([])

    writer.writerow(["Worker Risk Ranking"])
    writer.writerow(["Name", "Department", "Risk Score", "Compliance Score"])
    for w in data["workers"]:
        writer.writerow([w["name"], w["department"], w["risk_score"], w["compliance_score"]])
    writer.writerow([])

    writer.writerow(["Zone Ranking"])
    writer.writerow(["Zone", "Type", "Violations"])
    for z in data["zones"]:
        writer.writerow([z["name"], z["zone_type"], z["violation_count"]])
    writer.writerow([])

    writer.writerow(["Camera Statistics"])
    writer.writerow(["Camera", "Status", "Violations"])
    for c in data["cameras"]:
        writer.writerow([c["name"], c["status"], c["violation_count"]])

    return buffer.getvalue().encode("utf-8")


def generate_excel_report(db: Session) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font

    data = _gather_report_data(db)
    wb = Workbook()

    ws = wb.active
    ws.title = "Summary"
    ws.append(["Sentinel Safety Report", data["generated_at"]])
    ws["A1"].font = Font(bold=True, size=14)
    ws.append([])
    for key, value in data["summary"].items():
        ws.append([key, value])
    ws.append([])
    ws.append(["Live compliance %", data["executive"]["live_compliance"]])
    ws.append(["Today's violations", data["executive"]["todays_violations"]])
    ws.append(["Weekly violations", data["executive"]["weekly_violations"]])
    ws.append(["Monthly violations", data["executive"]["monthly_violations"]])
    ws.append(["Avg. confidence %", data["executive"]["average_confidence"]])
    ws.append(["Model FPS", data["executive"]["fps"]])
    ws.append(["Model latency (ms)", data["executive"]["latency_ms"]])

    ws2 = wb.create_sheet("Workers")
    ws2.append(["Name", "Department", "Risk Score", "Compliance Score"])
    for cell in ws2[1]:
        cell.font = Font(bold=True)
    for w in data["workers"]:
        ws2.append([w["name"], w["department"], w["risk_score"], w["compliance_score"]])

    ws3 = wb.create_sheet("Zones")
    ws3.append(["Zone", "Type", "Violations"])
    for cell in ws3[1]:
        cell.font = Font(bold=True)
    for z in data["zones"]:
        ws3.append([z["name"], z["zone_type"], z["violation_count"]])

    ws4 = wb.create_sheet("Cameras")
    ws4.append(["Camera", "Status", "Violations"])
    for cell in ws4[1]:
        cell.font = Font(bold=True)
    for c in data["cameras"]:
        ws4.append([c["name"], c["status"], c["violation_count"]])

    ws5 = wb.create_sheet("Severity Breakdown")
    ws5.append(["Severity", "Count"])
    for cell in ws5[1]:
        cell.font = Font(bold=True)
    for severity, count in data["severity_breakdown"].items():
        ws5.append([severity, count])

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def generate_pdf_report(db: Session) -> bytes:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    data = _gather_report_data(db)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.6 * inch, bottomMargin=0.6 * inch)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("Sentinel AI Workplace Safety Platform", styles["Title"]))
    story.append(Paragraph(f"Safety Report — generated {data['generated_at']}", styles["Normal"]))
    story.append(Spacer(1, 0.25 * inch))

    story.append(Paragraph("Executive Summary", styles["Heading2"]))
    exec_rows = [["Metric", "Value"]] + [
        ["Live compliance", f"{data['executive']['live_compliance']}%"],
        ["Today's violations", str(data["executive"]["todays_violations"])],
        ["Weekly violations", str(data["executive"]["weekly_violations"])],
        ["Monthly violations", str(data["executive"]["monthly_violations"])],
        ["Average confidence", f"{data['executive']['average_confidence']}%"],
        ["Model FPS", str(data["executive"]["fps"])],
        ["Model latency", f"{data['executive']['latency_ms']}ms"],
    ]
    story.append(_styled_table(exec_rows))
    story.append(Spacer(1, 0.25 * inch))

    story.append(Paragraph("Worker Risk Ranking", styles["Heading2"]))
    worker_rows = [["Name", "Department", "Risk Score", "Compliance"]] + [
        [w["name"], w["department"], str(w["risk_score"]), f"{w['compliance_score']}%"] for w in data["workers"]
    ]
    story.append(_styled_table(worker_rows))
    story.append(Spacer(1, 0.25 * inch))

    story.append(Paragraph("Zone Statistics", styles["Heading2"]))
    zone_rows = [["Zone", "Type", "Violations"]] + [
        [z["name"], z["zone_type"], str(z["violation_count"])] for z in data["zones"]
    ]
    story.append(_styled_table(zone_rows))
    story.append(Spacer(1, 0.25 * inch))

    story.append(Paragraph("Camera Statistics", styles["Heading2"]))
    camera_rows = [["Camera", "Status", "Violations"]] + [
        [c["name"], c["status"], str(c["violation_count"])] for c in data["cameras"]
    ]
    story.append(_styled_table(camera_rows))

    doc.build(story)
    return buffer.getvalue()


def _styled_table(rows: list[list[str]]):
    from reportlab.lib import colors
    from reportlab.platypus import Table, TableStyle

    table = Table(rows, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1b232f")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f6f9")]),
            ]
        )
    )
    return table
