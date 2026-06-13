import io
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

TRACE_BASE_URL = "http://localhost:3000/trace"

class QRCodeService:
    def __init__(self):
        pass

    def generate_qr_png(self, batch_no: str, size: int = 300) -> bytes:
        import qrcode
        url = f"{TRACE_BASE_URL}/{batch_no}"
        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=2)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#1C1712", back_color="#FFFBF0")
        buf = io.BytesIO()
        img = img.resize((size, size))
        img.save(buf, format="PNG")
        return buf.getvalue()

    def generate_label_pdf(self, batch_no: str, honey_type: str, grade: str, net_weight: float, apiary_name: str, harvest_date: str) -> bytes:
        from reportlab.lib.pagesizes import mm
        from reportlab.lib.units import mm as mm_unit
        from reportlab.pdfgen import canvas
        from reportlab.lib.colors import HexColor
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        import qrcode

        label_w = 60 * mm
        label_h = 40 * mm
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=(label_w, label_h))

        c.setFillColor(HexColor("#1C1712"))
        c.rect(0, 0, label_w, label_h, fill=1, stroke=0)

        c.setStrokeColor(HexColor("#FBBF24"))
        c.setLineWidth(0.5 * mm)
        c.rect(2 * mm, 2 * mm, label_w - 4 * mm, label_h - 4 * mm, fill=0, stroke=1)

        url = f"{TRACE_BASE_URL}/{batch_no}"
        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=4, border=1)
        qr.add_data(url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="#1C1712", back_color="#FFFBF0")
        qr_buf = io.BytesIO()
        qr_img.save(qr_buf, format="PNG")
        qr_buf.seek(0)

        qr_size = 20 * mm
        qr_x = 4 * mm
        qr_y = (label_h - qr_size) / 2
        c.drawImage(qr_buf, qr_x, qr_y, qr_size, qr_size)

        text_x = 26 * mm
        c.setFillColor(HexColor("#FBBF24"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(text_x, label_h - 8 * mm, honey_type)

        c.setFillColor(HexColor("#F5E6D3"))
        c.setFont("Helvetica", 7)
        c.drawString(text_x, label_h - 12 * mm, f"Grade: {grade}")
        c.drawString(text_x, label_h - 15.5 * mm, f"Weight: {net_weight}kg")
        c.drawString(text_x, label_h - 19 * mm, f"Farm: {apiary_name[:12]}")
        c.drawString(text_x, label_h - 22.5 * mm, f"Date: {harvest_date}")

        c.setFillColor(HexColor("#B8A88A"))
        c.setFont("Helvetica", 5.5)
        c.drawString(text_x, 5 * mm, batch_no)

        c.save()
        return buf.getvalue()
