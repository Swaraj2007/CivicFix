"""
normalise.py
============
Converts a SQLAlchemy Complaint row + associated data into the shape the
frontend TypeScript Complaint interface expects (camelCase, mapped enums, etc.)

Call `complaint_to_response(db, complaint, duplicates)` from the API routers.
"""

import json
import math
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from ..models import Complaint, AuditLog, DuplicateCluster

# ---------------------------------------------------------------------------
# Placeholder image shown when no photo was uploaded
# ---------------------------------------------------------------------------
DEFAULT_IMAGE = (
    "https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg"
    "?auto=compress&cs=tinysrgb&w=800"
)

# ---------------------------------------------------------------------------
# Category mapping: backend label → frontend IssueType
# ---------------------------------------------------------------------------
CATEGORY_MAP: dict[str, str] = {
    "Pothole / Road Damage": "Pothole / Road Damage",
    "Garbage / Waste": "Waste / Garbage",
    "Drainage": "Drainage / Waterlogging",
    "Drainage / Waterlogging": "Drainage / Waterlogging",
    "Streetlight": "Streetlight",
    "Water Leakage": "Water Supply",
    "Water Supply": "Water Supply",
    "Public Infrastructure": "Public Infrastructure",
    "Traffic / Signage": "Traffic / Signage",
    "Other": "Public Infrastructure",
}

# ---------------------------------------------------------------------------
# Department suggestion by issue type
# ---------------------------------------------------------------------------
DEPT_MAP: dict[str, str] = {
    "Pothole / Road Damage": "Road Maintenance",
    "Waste / Garbage": "Waste Management",
    "Streetlight": "Electrical Department",
    "Drainage / Waterlogging": "Drainage Department",
    "Water Supply": "Water Department",
    "Public Infrastructure": "Public Works",
    "Traffic / Signage": "Traffic Department",
}

# ---------------------------------------------------------------------------
# Status mapping: backend UPPER_SNAKE → frontend Title Case
# ---------------------------------------------------------------------------
STATUS_MAP: dict[str, str] = {
    "SUBMITTED": "Submitted",
    "UNDER_REVIEW": "Under Review",
    "ASSIGNED": "Assigned",
    "IN_PROGRESS": "In Progress",
    "RESOLVED": "Resolved",
    "CLOSED": "Resolved",
    "SLA_BREACHED": "SLA Breached",
}

# Reverse map for converting frontend → backend
STATUS_REVERSE: dict[str, str] = {v: k for k, v in STATUS_MAP.items()}
STATUS_REVERSE["Resolved"] = "RESOLVED"  # canonical direction

# ---------------------------------------------------------------------------
# Priority level mapping: UPPER → Title Case
# ---------------------------------------------------------------------------
LEVEL_MAP: dict[str, str] = {
    "CRITICAL": "Critical",
    "HIGH": "High",
    "MEDIUM": "Medium",
    "LOW": "Low",
}

# ---------------------------------------------------------------------------
# SLA hours matching the frontend engine (NOT the tight backend SLA_HOURS)
# ---------------------------------------------------------------------------
FE_SLA_HOURS: dict[str, int] = {
    "Critical": 24,
    "High": 48,
    "Medium": 72,
    "Low": 120,
}


def _map_category(raw: str | None) -> str:
    """Map a backend category string to a frontend IssueType string."""
    if not raw:
        return "Public Infrastructure"
    return CATEGORY_MAP.get(raw, raw)


def _map_status(raw: str | None) -> str:
    if not raw:
        return "Submitted"
    return STATUS_MAP.get(raw, raw.replace("_", " ").title())


def _map_level(raw: str | None) -> str:
    if not raw:
        return "Low"
    return LEVEL_MAP.get(raw.upper(), raw.title())


def _suggest_department(issue_type: str, stored: str | None) -> str:
    if stored:
        return stored
    return DEPT_MAP.get(issue_type, "Public Works")


def _build_priority_breakdown(complaint: Complaint) -> tuple[list[dict], list[str], int, int, int, int]:
    """
    Build the 5-component breakdown that AdminDetail / CitizenAiAnalysis display.
    Returns (breakdown_list, reasons, severity, impact, recurrence, location_importance).

    The pipeline stores priority_reasons as a JSON object:
      {"breakdown": {"safety_risk":N, ...}, "reasons": ["...", ...]}
    For backwards compatibility, also handles the old format where it was a plain list.
    """
    raw_json = complaint.priority_reasons or ""
    score    = complaint.priority_score or 0

    breakdown_dict: dict = {}
    raw_reasons: list[str] = []

    if raw_json:
        try:
            parsed = json.loads(raw_json)
            if isinstance(parsed, dict):
                # New format: {"breakdown": {...}, "reasons": [...]}
                breakdown_dict = parsed.get("breakdown", {})
                raw_reasons    = parsed.get("reasons", [])
            elif isinstance(parsed, list):
                # Old format: just the reasons list
                raw_reasons = parsed
        except Exception:
            pass

    # Extract component scores from breakdown dict, falling back to approximations
    safety  = int(breakdown_dict.get("safety_risk",   min(score * 30 // 100, 30)))
    volume  = int(breakdown_dict.get("report_volume", min(score * 20 // 100, 20)))
    sev     = int(breakdown_dict.get("severity",      min(score * 20 // 100, 20)))
    sla_age = int(breakdown_dict.get("sla_age",       min(score * 15 // 100, 15)))
    site    = int(breakdown_dict.get("sensitive_site",min(score * 15 // 100, 15)))

    breakdown = [
        {"label": "Safety Risk",    "score": safety,  "max": 30, "weight": "30%"},
        {"label": "Report Volume",  "score": volume,  "max": 20, "weight": "20%"},
        {"label": "Severity",       "score": sev,     "max": 20, "weight": "20%"},
        {"label": "SLA Age",        "score": sla_age, "max": 15, "weight": "15%"},
        {"label": "Sensitive Site", "score": site,    "max": 15, "weight": "15%"},
    ]

    reasons = raw_reasons if raw_reasons else ["AI-assessed complaint"]

    # Derive plausible per-input values for the frontend Complaint fields
    severity_val            = max(1, min(5, round(safety / 6)))
    impact_val              = max(1, min(5, round((sev + volume) / 8)))
    recurrence_val          = max(1, min(5, round(volume / 4)))
    location_importance_val = max(1, min(10, round(site / 1.5)))

    return breakdown, reasons, severity_val, impact_val, recurrence_val, location_importance_val


def _build_status_history(db: Session, complaint: Complaint) -> list[dict]:
    """Build a status-history list from AuditLog entries."""
    stmt = (
        select(AuditLog)
        .where(AuditLog.complaint_id == complaint.id)
        .order_by(AuditLog.timestamp)
    )
    logs = db.execute(stmt).scalars().all()

    history: list[dict] = [
        {
            "status": "Submitted",
            "timestamp": complaint.created_at.isoformat(),
            "note": "Complaint submitted by citizen",
        }
    ]

    for log in logs:
        if log.action == "AI_CLASSIFIED":
            issue = _map_category(log.new_value)
            conf  = log.reason or ""
            history.append({
                "status": "Under Review",
                "timestamp": log.timestamp.isoformat(),
                "note": f"AI classified as {issue} ({conf})",
            })
        elif log.action == "STATUS_CHANGED":
            history.append({
                "status": _map_status(log.new_value),
                "timestamp": log.timestamp.isoformat(),
                "note": log.reason or f"Status changed to {_map_status(log.new_value)}",
            })
        elif log.action == "DEPARTMENT_ASSIGNED":
            history.append({
                "status": _map_status(complaint.status),
                "timestamp": log.timestamp.isoformat(),
                "note": f"Assigned to {log.new_value}",
            })
        elif log.action == "DUPLICATE_FLAGGED":
            history.append({
                "status": _map_status(complaint.status),
                "timestamp": log.timestamp.isoformat(),
                "note": log.reason or "Flagged as possible duplicate",
            })
        elif log.action == "DUPLICATE_CONFIRMED":
            history.append({
                "status": _map_status(complaint.status),
                "timestamp": log.timestamp.isoformat(),
                "note": f"Duplicate confirmed — {log.reason or ''}",
            })
        elif log.action == "DUPLICATE_REJECTED":
            history.append({
                "status": _map_status(complaint.status),
                "timestamp": log.timestamp.isoformat(),
                "note": f"Duplicate rejected — {log.reason or ''}",
            })
        elif log.action == "CATEGORY_OVERRIDDEN":
            history.append({
                "status": _map_status(complaint.status),
                "timestamp": log.timestamp.isoformat(),
                "note": f"Category manually changed to {_map_category(log.new_value)}",
            })

    return history


def _build_duplicate_matches(
    db: Session,
    complaint: Complaint,
    raw_duplicates: list[dict] | None = None,
) -> tuple[list[dict], str | None]:
    """
    Build duplicate matches list for frontend DuplicateMatch interface.
    Returns (matches_list, duplicateGroupId_string_or_None).
    """
    matches: list[dict] = []

    # Find cluster info
    group_id: str | None = None
    if complaint.duplicate_cluster_id:
        cluster = db.get(DuplicateCluster, complaint.duplicate_cluster_id)
        if cluster:
            group_id = cluster.cluster_number

    # Build matches from raw duplicates (passed from pipeline result)
    if raw_duplicates:
        for dup in raw_duplicates:
            other_id = dup.get("complaint_id")
            if not other_id:
                continue
            other = db.get(Complaint, other_id)
            if not other:
                continue

            sim = dup.get("similarity", 0.0)
            overall = round(sim * 100)

            # Approximate text / location split
            # Real text similarity from embedding cosine ≈ overall
            text_sim = overall
            loc_sim = 0
            if (
                complaint.latitude is not None and complaint.longitude is not None
                and other.latitude is not None and other.longitude is not None
            ):
                loc_sim = _location_similarity(
                    complaint.latitude, complaint.longitude,
                    other.latitude, other.longitude,
                )

            # Blend: overall as weighted average (text 50%, loc 50%)
            blended = round(text_sim * 0.5 + loc_sim * 0.5)
            matches.append({
                "complaintId": other.complaint_number,
                "textSimilarity": text_sim,
                "locationSimilarity": loc_sim,
                "overallSimilarity": blended,
            })

    return matches, group_id


def _location_similarity(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """Haversine distance → 0-100 similarity score (100 = same spot)."""
    R = 6371.0  # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    dist_km = R * 2 * math.asin(math.sqrt(a))

    # >2km → 0%, <50m → 100%
    if dist_km >= 2.0:
        return 0
    if dist_km < 0.05:
        return 100
    return max(0, round(100 - (dist_km / 2.0) * 100))


def _check_sla_breached(complaint: Complaint, fe_level: str) -> bool:
    """Check if complaint has breached the *frontend* SLA hours."""
    if complaint.status in ("RESOLVED", "CLOSED"):
        return False
    if not complaint.sla_deadline:
        return False
    return datetime.utcnow() > complaint.sla_deadline


def _fe_status(complaint: Complaint, fe_level: str) -> str:
    """Return the frontend status string, applying SLA-breached override."""
    mapped = _map_status(complaint.status)
    if mapped not in ("Resolved",) and _check_sla_breached(complaint, fe_level):
        return "SLA Breached"
    return mapped


def complaint_to_response(
    db: Session,
    complaint: Complaint,
    raw_duplicates: list[dict] | None = None,
) -> dict:
    """
    Full normalisation: SQLAlchemy Complaint → frontend Complaint dict.
    raw_duplicates: the list returned by find_duplicates during the pipeline run.
    """
    issue_type  = _map_category(complaint.category)
    fe_level    = _map_level(complaint.priority_level)
    fe_status   = _fe_status(complaint, fe_level)
    department  = _suggest_department(issue_type, complaint.department)

    breakdown, reasons, severity, impact, recurrence, loc_imp = _build_priority_breakdown(complaint)
    history      = _build_status_history(db, complaint)
    dup_matches, group_id = _build_duplicate_matches(db, complaint, raw_duplicates)

    # AI explanation
    conf = round((complaint.confidence or 0.0) * 100)
    if complaint.confidence and not getattr(complaint, '_fallback', False):
        explanation = (
            f"Classified as {issue_type} with {conf}% confidence "
            f"using the trained complaint classification model."
        )
    else:
        explanation = (
            f"Classified as {issue_type}. "
            "Manual review recommended."
        )

    # SLA deadline — use the stored one, or compute using frontend hours
    if complaint.sla_deadline:
        sla_iso = complaint.sla_deadline.isoformat()
    else:
        from datetime import timedelta
        hours = FE_SLA_HOURS.get(fe_level, 72)
        sla_iso = (complaint.created_at + timedelta(hours=hours)).isoformat()

    return {
        "id":                  complaint.complaint_number,
        "dbId":                complaint.id,
        "description":         complaint.description,
        "image":               complaint.image_url or DEFAULT_IMAGE,
        "issueType":           issue_type,
        "latitude":            complaint.latitude or 28.6139,
        "longitude":           complaint.longitude or 77.2090,
        "address":             complaint.address or "",
        "landmark":            complaint.landmark,
        "citizenName":         complaint.citizen_name or "Anonymous Citizen",
        # priority components
        "severity":            severity,
        "impact":              impact,
        "recurrence":          recurrence,
        "locationImportance":  loc_imp,
        "complaintAge":        0,
        "priorityScore":       complaint.priority_score or 0,
        "priorityLevel":       fe_level,
        "priorityBreakdown":   breakdown,
        "priorityReasons":     reasons,
        # duplicates
        "duplicateGroupId":    group_id,
        "duplicateClusterId":  complaint.duplicate_cluster_id,
        "duplicateMatches":    dup_matches,
        # workflow
        "status":              fe_status,
        "department":          department,
        "createdAt":           complaint.created_at.isoformat(),
        "slaDeadline":         sla_iso,
        "resolvedAt":          complaint.resolved_at.isoformat() if complaint.resolved_at else None,
        "aiConfidence":        conf,
        "aiExplanation":       explanation,
        "statusHistory":       history,
    }


def complaint_to_list_item(complaint: Complaint) -> dict:
    """Lightweight version for list/table views — no DB queries."""
    issue_type = _map_category(complaint.category)
    fe_level   = _map_level(complaint.priority_level)
    fe_status  = _fe_status(complaint, fe_level)

    if complaint.sla_deadline:
        sla_iso = complaint.sla_deadline.isoformat()
    else:
        from datetime import timedelta
        hours = FE_SLA_HOURS.get(fe_level, 72)
        sla_iso = (complaint.created_at + timedelta(hours=hours)).isoformat()

    group_id: str | None = None  # filled lazily by caller if needed

    return {
        "id":              complaint.complaint_number,
        "dbId":            complaint.id,
        "description":     complaint.description,
        "issueType":       issue_type,
        "address":         complaint.address or "",
        "priorityScore":   complaint.priority_score or 0,
        "priorityLevel":   fe_level,
        "status":          fe_status,
        "department":      _suggest_department(issue_type, complaint.department),
        "createdAt":       complaint.created_at.isoformat(),
        "slaDeadline":     sla_iso,
        "citizenName":     complaint.citizen_name or "Anonymous Citizen",
        "image":           complaint.image_url or DEFAULT_IMAGE,
        "duplicateGroupId": group_id,
        "latitude":        complaint.latitude or 28.6139,
        "longitude":       complaint.longitude or 77.2090,
    }
