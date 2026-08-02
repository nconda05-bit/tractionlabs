"""Branded PDF generation for Traction Labs documents (proposal / contract / invoice)."""
import io
import base64
import os
from datetime import datetime
from xhtml2pdf import pisa

LOGO_PATH = "/app/frontend/public/logo-v2.png"

NAVY = "#0B1020"
ELECTRIC = "#3B82F6"
CORAL = "#FF5A3C"


def _logo_data_uri():
    try:
        with open(LOGO_PATH, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        return f"data:image/png;base64,{b64}"
    except Exception:
        return ""


def _esc(s):
    return (str(s or "")
            .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def _sections_html(sections):
    out = []
    for s in sections or []:
        heading = _esc(s.get("heading", ""))
        body = _esc(s.get("body", "")).replace("\n", "<br/>")
        out.append(
            f'<div class="section"><div class="s-head">{heading}</div>'
            f'<div class="s-body">{body}</div></div>'
        )
    return "".join(out)


def _line_items_html(items, total, currency="$"):
    if not items:
        return ""
    rows = ""
    for it in items:
        rows += (
            f'<tr><td class="li-desc">{_esc(it.get("description",""))}</td>'
            f'<td class="li-amt">{currency}{_esc(it.get("amount",""))}</td></tr>'
        )
    total_row = ""
    if total is not None:
        total_row = (
            f'<tr class="li-total"><td class="li-desc">Total</td>'
            f'<td class="li-amt">{currency}{_esc(total)}</td></tr>'
        )
    return (
        '<table class="items" cellpadding="0" cellspacing="0" width="100%">'
        '<tr class="li-head"><td>Description</td><td class="li-amt">Amount</td></tr>'
        f'{rows}{total_row}</table>'
    )


def build_document_html(doc: dict) -> str:
    logo = _logo_data_uri()
    title = _esc(doc.get("title", "Document"))
    dtype = _esc(doc.get("type", "document")).upper()
    client = doc.get("client_snapshot", {}) or {}
    meta = doc.get("meta", {}) or {}
    created = doc.get("created_at", "")[:10] or datetime.utcnow().strftime("%Y-%m-%d")

    meta_rows = ""
    for label, key in (("Business", "business_name"), ("Contact", "contact_name"),
                       ("Email", "email"), ("Date", None)):
        val = created if label == "Date" else client.get(key, "")
        if val:
            meta_rows += f'<tr><td class="m-l">{label}</td><td class="m-v">{_esc(val)}</td></tr>'

    signature = ""
    if doc.get("type") in ("proposal", "contract"):
        signature = (
            '<div class="sig">'
            '<div class="sig-col"><div class="sig-line"></div><div class="sig-label">Traction Labs</div></div>'
            f'<div class="sig-col"><div class="sig-line"></div><div class="sig-label">{_esc(client.get("business_name","Client"))}</div></div>'
            '</div>'
        )

    return f"""
    <html><head><style>
      @page {{ size: A4; margin: 1.6cm; }}
      body {{ font-family: Helvetica, Arial, sans-serif; color: #1a2036; font-size: 11px; }}
      .top {{ border-bottom: 3px solid {ELECTRIC}; padding-bottom: 14px; margin-bottom: 22px; }}
      .brand {{ color: {NAVY}; font-size: 20px; font-weight: bold; }}
      .brand .blue {{ color: {ELECTRIC}; }}
      .kicker {{ color: {CORAL}; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; }}
      .doc-type {{ float: right; background: {NAVY}; color:#fff; padding: 6px 12px; font-size: 10px; letter-spacing:1px; border-radius: 4px; }}
      h1.title {{ color: {NAVY}; font-size: 24px; margin: 6px 0 4px; }}
      table.meta {{ margin: 14px 0 24px; }}
      .m-l {{ color:#64748B; padding: 2px 16px 2px 0; font-size: 10px; text-transform: uppercase; }}
      .m-v {{ color:{NAVY}; font-weight: bold; padding: 2px 0; }}
      .section {{ margin-bottom: 16px; }}
      .s-head {{ color: {ELECTRIC}; font-size: 13px; font-weight: bold; margin-bottom: 4px; }}
      .s-body {{ color:#333c56; line-height: 1.55; }}
      table.items {{ margin: 12px 0 20px; border-top: 1px solid #e5e9f2; }}
      .li-head td {{ color:#64748B; font-size:9px; text-transform:uppercase; padding:8px 0; border-bottom:1px solid #e5e9f2; }}
      .items td {{ padding: 8px 0; border-bottom: 1px solid #f0f2f8; }}
      .li-amt {{ text-align: right; }}
      .li-total td {{ font-weight: bold; color:{NAVY}; font-size: 13px; border-top: 2px solid {NAVY}; border-bottom: none; }}
      .sig {{ margin-top: 40px; }}
      .sig-col {{ display: inline-block; width: 45%; margin-right: 4%; }}
      .sig-line {{ border-bottom: 1px solid #9aa3bd; height: 28px; }}
      .sig-label {{ color:#64748B; font-size: 9px; margin-top: 4px; }}
      .foot {{ position: fixed; bottom: -1cm; left:0; right:0; color:#94a3b8; font-size: 8px; text-align:center; }}
    </style></head>
    <body>
      <div class="top">
        <span class="doc-type">{dtype}</span>
        {'<img src="'+logo+'" height="46" />' if logo else ''}
        <div class="brand">Traction&nbsp;<span class="blue">Labs</span></div>
        <div class="kicker">AI-Powered Customer Acquisition</div>
      </div>
      <h1 class="title">{title}</h1>
      <table class="meta">{meta_rows}</table>
      {_sections_html(doc.get("sections"))}
      {_line_items_html(meta.get("line_items"), meta.get("total"))}
      {signature}
      <div class="foot">Traction Labs &bull; AI-powered customer acquisition systems for local businesses</div>
    </body></html>
    """


def render_document_pdf(doc: dict) -> bytes:
    html = build_document_html(doc)
    buf = io.BytesIO()
    pisa.CreatePDF(src=html, dest=buf)
    return buf.getvalue()
