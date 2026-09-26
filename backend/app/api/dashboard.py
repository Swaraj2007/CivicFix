"""
dashboard.py — Admin dashboard statistics endpoints.
Returns data in the shape AdminDashboard.tsx expects.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from ..database import get_db
from ..models import Complaint, DuplicateCluster
from .normalise import _map_category, _map_level, FE_SLA_HOURS

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _sla_breached(c_status: str, sla_deadline, now: datetime) -> bool:
    if c_status in ("RESOLVED", "CLOSED"):
        return False
    if not sla_deadline:
        return False
    return now > sla_deadline


from .auth import require_role
from ..models.user import User

@router.get("/stats")
def stats(db: Session = Depends(get_db), user: User = Depends(require_role("ADMIN"))):
    """
    KPI cards + distributions.
    Matches what AdminDashboard.tsx stats useMemo expects:
      total, newCount, inProgress, resolved, breached, slaCompliance
    Plus distribution dicts for charts:
      by_status, by_priority, by_category (frontend labels)
    """
    now = datetime.utcnow()

    all_complaints = db.execute(select(Complaint)).scalars().all()

    total      = len(all_complaints)
    new_count  = 0
    in_progress = 0
    resolved   = 0
    breached   = 0
    within_sla = 0
    sla_tracked = 0

    by_status:   dict[str, int] = {}
    by_priority: dict[str, int] = {}
    by_category: dict[str, int] = {}

    for c in all_complaints:
        fe_level  = _map_level(c.priority_level)
        fe_status_raw = c.status or "SUBMITTED"

        # Map to frontend status
        status_map = {
            "SUBMITTED":    "Submitted",
            "UNDER_REVIEW": "Under Review",
            "ASSIGNED":     "Assigned",
            "IN_PROGRESS":  "In Progress",
            "RESOLVED":     "Resolved",
            "CLOSED":       "Resolved",
        }
        fe_st = status_map.get(fe_status_raw, fe_status_raw.replace("_", " ").title())

        # SLA breach check
        is_breached = _sla_breached(fe_status_raw, c.sla_deadline, now)
        if is_breached:
            fe_st = "SLA Breached"

        # Counts
        if fe_st == "Submitted":
            new_count += 1
        elif fe_st in ("Under Review", "Assigned", "In Progress"):
            in_progress += 1
        elif fe_st == "Resolved":
            resolved += 1
        elif fe_st == "SLA Breached":
            breached += 1

        # SLA compliance
        if fe_status_raw not in ("SUBMITTED",):
            sla_tracked += 1
            if fe_st == "Resolved" or (not is_breached):
                within_sla += 1

        # Distribution dicts
        by_status[fe_st]   = by_status.get(fe_st, 0) + 1
        by_priority[fe_level] = by_priority.get(fe_level, 0) + 1
        mapped_cat = _map_category(c.category)
        by_category[mapped_cat] = by_category.get(mapped_cat, 0) + 1

    sla_compliance = (
        round((within_sla / sla_tracked) * 1000) / 10 if sla_tracked > 0 else 100.0
    )

    pending_clusters = db.execute(
        select(func.count())
        .select_from(DuplicateCluster)
        .where(DuplicateCluster.status == "PENDING")
    ).scalar_one()

    return {
        # Raw KPI numbers (matches what AdminDashboard computes from complaints list)
        "total":            total,
        "newCount":         new_count,
        "inProgress":       in_progress,
        "resolved":         resolved,
        "breached":         breached,
        "slaCompliance":    sla_compliance,
        "pendingClusters":  pending_clusters,
        # Distributions for charts
        "by_status":   by_status,
        "by_priority": by_priority,
        "by_category": by_category,
    }


@router.get("/analytics")
def analytics(db: Session = Depends(get_db), user: User = Depends(require_role("ADMIN"))):
    """
    Complaints over the last 14 days — for the time-series LineChart.
    Returns: [{ date: "14 Sep", count: N }, ...]
    """
    since = datetime.utcnow() - timedelta(days=14)

    rows = db.execute(
        select(
            func.date(Complaint.created_at).label("day"),
            func.count().label("count"),
        )
        .where(Complaint.created_at >= since)
        .group_by(func.date(Complaint.created_at))
        .order_by(func.date(Complaint.created_at))
    ).all()

    result = []
    for r in rows:
        # Format date as "14 Sep" to match frontend trendData format
        d = datetime.strptime(str(r[0]), "%Y-%m-%d")
        # Use lstrip to avoid platform-specific %-d format (Linux-only)
        date_str = d.strftime("%d %b").lstrip("0")
        result.append({"date": date_str, "count": r[1]})
    return result
