"""Raha Marketing CRM: safe, read-only customer segmentation foundation.

Not mounted as an API route yet. No SMS is sent by this module.
Firestore collection names must be verified against production before integration.
"""
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Any, Iterable
import re

PHONE_RE = re.compile(r"^(?:\+?91)?([6-9][0-9]{9})$")

def normalize_indian_mobile(value: Any) -> str | None:
    """Return E.164 mobile or None; reject malformed/non-Indian numbers."""
    raw = re.sub(r"[\s-]", "", str(value or ""))
    match = PHONE_RE.fullmatch(raw)
    return "+91" + match.group(1) if match else None

@dataclass(frozen=True)
class MarketingContact:
    phone: str
    name: str
    source: str
    last_order_at: datetime | None
    opted_in: bool

def build_marketing_audience(
    customers: Iterable[dict],
    *,
    segment: str = "all",
    now: datetime | None = None,
) -> list[MarketingContact]:
    """Deduplicate customer records; exclude non-consenting or opted-out users.

    Consent must be explicit and verifiable upstream. This function does not
    infer permission from a phone number, app account, or prior purchase.
    """
    if segment not in {"all", "active", "inactive"}:
        raise ValueError("Unknown customer segment")
    now = now or datetime.now(timezone.utc)
    audience: dict[str, MarketingContact] = {}
    for record in customers:
        if record.get("marketingSmsConsent") is not True:
            continue
        if record.get("marketingSmsOptOut") is True:
            continue
        phone = normalize_indian_mobile(record.get("phone") or record.get("mobile"))
        if not phone:
            continue
        last_order = record.get("lastOrderAt")
        if hasattr(last_order, "to_datetime"):
            last_order = last_order.to_datetime()
        if isinstance(last_order, datetime) and last_order.tzinfo is None:
            last_order = last_order.replace(tzinfo=timezone.utc)
        if not isinstance(last_order, datetime):
            last_order = None
        active = last_order is not None and last_order >= now - timedelta(days=30)
        if segment == "active" and not active:
            continue
        if segment == "inactive" and active:
            continue
        audience[phone] = MarketingContact(
            phone=phone,
            name=str(record.get("name") or "").strip()[:100],
            source=str(record.get("source") or "app")[:30],
            last_order_at=last_order,
            opted_in=True,
        )
    return list(audience.values())

def preview_campaign(customers: Iterable[dict], *, segment: str = "all", per_sms_cost: float = 0.20) -> dict:
    """Safe preview: only aggregated totals, never sends or returns phone numbers."""
    audience = build_marketing_audience(customers, segment=segment)
    return {
        "segment": segment,
        "eligibleRecipients": len(audience),
        "estimatedCostInr": round(len(audience) * per_sms_cost, 2),
        "mode": "PREVIEW_ONLY",
    }
