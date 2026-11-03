"""
Real, downloadable reports — CSV, Excel, and PDF — built from the same
aggregated data the Analytics dashboard uses.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.logging import logger
from app.database.session import get_db
from app.services import report_generation_service

router = APIRouter(prefix="/reports", tags=["Reports"], dependencies=[Depends(get_current_user)])


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")


@router.get("/csv")
def download_csv_report(db: Session = Depends(get_db)) -> Response:
    content = report_generation_service.generate_csv_report(db)
    logger.info("Generated CSV report")
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="sentinel-report-{_timestamp()}.csv"'},
    )


@router.get("/excel")
def download_excel_report(db: Session = Depends(get_db)) -> Response:
    content = report_generation_service.generate_excel_report(db)
    logger.info("Generated Excel report")
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="sentinel-report-{_timestamp()}.xlsx"'},
    )


@router.get("/pdf")
def download_pdf_report(db: Session = Depends(get_db)) -> Response:
    content = report_generation_service.generate_pdf_report(db)
    logger.info("Generated PDF report")
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="sentinel-report-{_timestamp()}.pdf"'},
    )
