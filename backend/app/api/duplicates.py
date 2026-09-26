"""
duplicates.py — Duplicate cluster management endpoints.
All responses normalised to frontend shape.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from ..database import get_db
from ..models import Complaint, DuplicateCluster, AuditLog
from .normalise import (
    _map_category,
    _map_level,
    _fe_status,
    _suggest_department,
    complaint_to_list_item,
)
from .auth import require_role
from ..models.user import User

router = APIRouter(prefix="/api/duplicates", tags=["duplicates"], dependencies=[Depends(require_role("ADMIN"))])


def _cluster_detail(db: Session, cluster: DuplicateCluster) -> dict:
    """Build the full duplicate group dict that the frontend DuplicateGroup interface needs."""
    members_rows = db.execute(
        select(Complaint).where(Complaint.duplicate_cluster_id == cluster.id)
    ).scalars().all()

    members = []
    for m in members_rows:
        item = complaint_to_list_item(m)
        item["duplicateGroupId"] = cluster.cluster_number
        members.append(item)

    # Pick a representative title from the first member
    title = ""
    if members_rows:
        first = members_rows[0]
        issue = _map_category(first.category)
        addr  = (first.address or "").split(",")[0]
        title = f"{issue} — {addr}" if addr else issue

    return {
        # Frontend DuplicateGroup fields
        "id":           cluster.cluster_number,
        "issueType":    _map_category(members_rows[0].category) if members_rows else "Public Infrastructure",
        "title":        title,
        "complaintIds": [m.complaint_number for m in members_rows],
        "createdAt":    cluster.created_at.isoformat(),
        # Extra admin info
        "clusterId":    cluster.id,
        "status":       cluster.status,
        "reviewReason": cluster.review_reason,
        "reviewedAt":   cluster.reviewed_at.isoformat() if cluster.reviewed_at else None,
        "memberCount":  len(members_rows),
        "members":      members,
    }


# ============================================================
# GET /all — all clusters (for AdminDuplicates page)
# ============================================================
@router.get("/all")
def list_all_clusters(db: Session = Depends(get_db)):
    stmt = (
        select(DuplicateCluster)
        .order_by(desc(DuplicateCluster.created_at))
    )
    clusters = db.execute(stmt).scalars().all()
    return [_cluster_detail(db, c) for c in clusters]


# ============================================================
# GET /pending — clusters awaiting human review
# ============================================================
@router.get("/pending")
def list_pending_clusters(db: Session = Depends(get_db)):
    stmt = (
        select(DuplicateCluster)
        .where(DuplicateCluster.status == "PENDING")
        .order_by(desc(DuplicateCluster.created_at))
    )
    clusters = db.execute(stmt).scalars().all()
    return [_cluster_detail(db, c) for c in clusters]


# ============================================================
# GET /{cluster_id} — single cluster by integer PK
# ============================================================
@router.get("/{cluster_id}")
def get_cluster(cluster_id: int, db: Session = Depends(get_db)):
    cluster = db.get(DuplicateCluster, cluster_id)
    if not cluster:
        raise HTTPException(404, "Cluster not found")
    return _cluster_detail(db, cluster)


# ============================================================
# GET /number/{cluster_number} — lookup by DUP-…  string
# ============================================================
@router.get("/number/{cluster_number}")
def get_cluster_by_number(cluster_number: str, db: Session = Depends(get_db)):
    stmt = select(DuplicateCluster).where(DuplicateCluster.cluster_number == cluster_number)
    cluster = db.execute(stmt).scalar_one_or_none()
    if not cluster:
        raise HTTPException(404, "Cluster not found")
    return _cluster_detail(db, cluster)


# ============================================================
# POST /{cluster_id}/confirm — confirm cluster
# ============================================================
@router.post("/{cluster_id}/confirm")
def confirm_cluster(cluster_id: int, payload: dict = None, db: Session = Depends(get_db)):
    cluster = db.get(DuplicateCluster, cluster_id)
    if not cluster:
        raise HTTPException(404, "Cluster not found")
    if cluster.status not in ("PENDING",):
        raise HTTPException(400, f"Cluster already {cluster.status}")

    reason = (payload or {}).get("reason", "Confirmed by admin")
    cluster.status = "CONFIRMED"
    cluster.reviewed_at = datetime.utcnow()
    cluster.review_reason = reason

    members = db.execute(
        select(Complaint).where(Complaint.duplicate_cluster_id == cluster.id)
    ).scalars().all()
    for m in members:
        db.add(AuditLog(
            complaint_id=m.id,
            action="DUPLICATE_CONFIRMED",
            old_value="PENDING",
            new_value="CONFIRMED",
            reason=reason,
        ))

    db.commit()
    return _cluster_detail(db, cluster)


# ============================================================
# POST /{cluster_id}/reject — reject cluster
# ============================================================
@router.post("/{cluster_id}/reject")
def reject_cluster(cluster_id: int, payload: dict = None, db: Session = Depends(get_db)):
    cluster = db.get(DuplicateCluster, cluster_id)
    if not cluster:
        raise HTTPException(404, "Cluster not found")
    if cluster.status not in ("PENDING",):
        raise HTTPException(400, f"Cluster already {cluster.status}")

    reason = (payload or {}).get("reason", "Rejected by admin")
    cluster.status = "REJECTED"
    cluster.reviewed_at = datetime.utcnow()
    cluster.review_reason = reason

    members = db.execute(
        select(Complaint).where(Complaint.duplicate_cluster_id == cluster.id)
    ).scalars().all()
    for m in members:
        m.duplicate_cluster_id = None
        db.add(AuditLog(
            complaint_id=m.id,
            action="DUPLICATE_REJECTED",
            old_value="PENDING",
            new_value="REJECTED",
            reason=reason,
        ))

    db.commit()
    return {"clusterId": cluster_id, "status": "REJECTED", "reason": reason}


# ============================================================
# GET /audit/{complaint_id} — full audit trail for one complaint
# ============================================================
@router.get("/audit/{complaint_id}")
def audit_trail(complaint_id: int, db: Session = Depends(get_db)):
    stmt = (
        select(AuditLog)
        .where(AuditLog.complaint_id == complaint_id)
        .order_by(desc(AuditLog.timestamp))
    )
    logs = db.execute(stmt).scalars().all()
    return [
        {
            "id":        l.id,
            "action":    l.action,
            "oldValue":  l.old_value,
            "newValue":  l.new_value,
            "reason":    l.reason,
            "timestamp": l.timestamp.isoformat(),
        }
        for l in logs
    ]
