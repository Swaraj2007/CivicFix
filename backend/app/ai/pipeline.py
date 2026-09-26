import json
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from .classifier import classify
from .embeddings import embed
from .duplicate_detector import find_duplicates
from .priority_engine import compute_priority, sla_deadline, SLA_HOURS
from ..models import Complaint, ComplaintEmbedding, DuplicateCluster, AuditLog


def _generate_cluster_number() -> str:
    year = datetime.utcnow().year
    return f"DUP-{year}-{uuid.uuid4().hex[:6].upper()}"


def _ensure_cluster(db: Session, complaint: Complaint, duplicate_ids: list[int]) -> int:
    """
    Given a new complaint and its duplicate matches:
    - If any matched complaint already belongs to a cluster, reuse it.
    - Otherwise create a new cluster.
    - Assign this complaint to the cluster.
    Returns the cluster id.
    """
    # Check if any matched complaint already has a cluster
    existing_cluster_id = None
    if duplicate_ids:
        stmt = (
            select(Complaint.duplicate_cluster_id)
            .where(
                Complaint.id.in_(duplicate_ids),
                Complaint.duplicate_cluster_id.isnot(None),
            )
            .limit(1)
        )
        row = db.execute(stmt).first()
        if row:
            existing_cluster_id = row[0]

    if existing_cluster_id is None:
        cluster = DuplicateCluster(cluster_number=_generate_cluster_number())
        db.add(cluster)
        db.flush()
        existing_cluster_id = cluster.id

    complaint.duplicate_cluster_id = existing_cluster_id
    return existing_cluster_id


def analyze(db: Session, complaint: Complaint) -> dict:
    # 1. Classify
    cls = classify(complaint.title, complaint.description)
    complaint.category = cls["category"]
    complaint.confidence = cls["confidence"]

    # 2. Embed
    vec = embed(complaint.description)

    # 3. Duplicate search
    duplicates = find_duplicates(db, vec, latitude=complaint.latitude, longitude=complaint.longitude, exclude_complaint_id=complaint.id)
    duplicate_ids = [d["complaint_id"] for d in duplicates]

    # 4. Persist cluster if any duplicates found
    cluster_id = None
    if duplicate_ids:
        cluster_id = _ensure_cluster(db, complaint, duplicate_ids)
        db.add(AuditLog(
            complaint_id=complaint.id,
            action="DUPLICATE_FLAGGED",
            new_value=json.dumps(duplicate_ids),
            reason=f"Flagged as probable duplicate of {len(duplicate_ids)} complaint(s)",
        ))

    # 5. Nearby same-category (last 7 days)
    nearby = 0
    if complaint.latitude is not None and complaint.longitude is not None:
        since = datetime.utcnow() - timedelta(days=7)
        stmt = (
            select(func.count())
            .select_from(Complaint)
            .where(
                Complaint.id != complaint.id,
                Complaint.category == complaint.category,
                Complaint.created_at >= since,
                Complaint.latitude.between(complaint.latitude - 0.01, complaint.latitude + 0.01),
                Complaint.longitude.between(complaint.longitude - 0.01, complaint.longitude + 0.01),
            )
        )
        nearby = db.execute(stmt).scalar_one()

    # 6. Priority (uses duplicate count)
    pr = compute_priority(
        category=complaint.category or "Other",
        title=complaint.title,
        description=complaint.description,
        address=complaint.address or "",
        landmark=complaint.landmark or "",
        created_at=complaint.created_at,
        duplicate_count=len(duplicates),
        nearby_same_category=nearby,
    )
    complaint.priority_score = pr["score"]
    complaint.priority_level = pr["level"]
    # Store both the breakdown dict and the reasons list as a single JSON object
    complaint.priority_reasons = json.dumps({
        "breakdown": pr["breakdown"],
        "reasons": pr["reasons"],
    })
    complaint.sla_deadline = sla_deadline(pr["level"], complaint.created_at)

    # 7. Persist embedding
    complaint.embedding = ComplaintEmbedding(embedding=vec)

    # 8. Audit log: record AI classification
    db.add(AuditLog(
        complaint_id=complaint.id,
        action="AI_CLASSIFIED",
        new_value=complaint.category,
        reason=f"confidence={complaint.confidence:.2f}",
    ))

    return {
        "classification": cls,
        "duplicates": duplicates,
        "cluster_id": cluster_id,
        "priority": pr,
        "nearby_count": nearby,
        "sla_hours": SLA_HOURS[pr["level"]],
    }