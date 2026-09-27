"""
complaints.py — FastAPI router for complaint CRUD + AI pipeline.
All responses are normalised to the frontend camelCase shape via normalise.py.
"""

import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from ..database import get_db
from ..models import Complaint, AuditLog
from ..schemas.complaint import ComplaintCreate
from ..ai.geocoder import geocode_with_cache
from ..ai.pipeline import analyze
from ..ai.priority_engine import compute_priority
from .normalise import (
    complaint_to_response,
    complaint_to_list_item,
    STATUS_REVERSE,
    DEPT_MAP,
)

router = APIRouter(prefix="/api/complaints", tags=["complaints"])

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/data/uploads"))
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 10


def _generate_number() -> str:
    year = datetime.utcnow().year
    suffix = uuid.uuid4().hex[:6].upper()
    return f"CFX-{year}-{suffix}"


VALID_STATUSES = {
    "SUBMITTED",
    "UNDER_REVIEW",
    "ASSIGNED",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
    "SLA_BREACHED",
}


# ============================================================
# POST /upload-image — upload an image, return URL
# ============================================================
@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload a complaint photo.
    Returns: { "url": "/api/complaints/images/<filename>" }
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}. Use JPEG/PNG/WEBP.")

    # Read & size-check
    contents = await file.read()
    if len(contents) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max size is {MAX_SIZE_MB}MB.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = (file.filename or "img.jpg").rsplit(".", 1)[-1].lower()
    safe_ext = ext if ext in ("jpg", "jpeg", "png", "webp", "gif") else "jpg"
    filename = f"{uuid.uuid4().hex}.{safe_ext}"
    dest = UPLOAD_DIR / filename

    with open(dest, "wb") as f:
        f.write(contents)

    return {"url": f"/api/complaints/images/{filename}"}


# ============================================================
# GET /images/{filename} — serve an uploaded image
# ============================================================
from fastapi.responses import FileResponse

@router.get("/images/{filename}")
def serve_image(filename: str):
    # Basic path-traversal protection
    safe_name = Path(filename).name
    path = UPLOAD_DIR / safe_name
    if not path.exists():
        raise HTTPException(404, "Image not found")
    return FileResponse(str(path))


# ============================================================
# GET /geocode — frontend geocoding
# ============================================================
@router.get("/geocode")
def geocode_endpoint(q: str, db: Session = Depends(get_db)):
    if not q or len(q.strip()) < 3:
        raise HTTPException(400, "Query too short")
    geo = geocode_with_cache(q.strip(), db, Complaint)
    if not geo:
        raise HTTPException(404, "Location not found")
    return geo

from .auth import get_current_user, require_role
from ..models.user import User

# ============================================================
# POST / — create a complaint (runs full AI pipeline)
# ============================================================
@router.post("/")
def create_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Auto-derive title from description if not provided
    title = payload.title or (payload.description[:80] + "…" if len(payload.description) > 80 else payload.description)

    complaint = Complaint(
        complaint_number=_generate_number(),
        title=title,
        description=payload.description,
        citizen_name=payload.citizen_name,
        address=payload.address,
        landmark=payload.landmark,
        latitude=payload.latitude,
        longitude=payload.longitude,
        image_url=payload.image_url,
        created_at=datetime.utcnow(),
        user_id=user.id,
    )

    # ---- Geocoding ----
    if complaint.latitude is None or complaint.longitude is None:
        parts = [p for p in [complaint.address, complaint.landmark] if p]
        if parts:
            geo = geocode_with_cache(", ".join(parts), db, Complaint)
            if geo:
                complaint.latitude = geo["latitude"]
                complaint.longitude = geo["longitude"]

    # ---- Persist first so embedding FK has a valid complaint id ----
    db.add(complaint)
    db.flush()

    # ---- Full AI pipeline ----
    result = analyze(db, complaint)
    print(
        f"[pipeline] {complaint.complaint_number}: "
        f"category={complaint.category} "
        f"duplicates={len(result['duplicates'])} "
        f"priority={complaint.priority_level} "
        f"score={complaint.priority_score}"
    )

    # ---- Auto-assign department from mapped category ----
    from .normalise import _map_category, _suggest_department
    issue_type = _map_category(complaint.category)
    complaint.department = _suggest_department(issue_type, None)

    # ---- Log department assignment ----
    db.add(AuditLog(
        complaint_id=complaint.id,
        action="DEPARTMENT_ASSIGNED",
        new_value=complaint.department,
        reason="Auto-assigned based on AI category",
    ))

    db.commit()
    db.refresh(complaint)

    return complaint_to_response(db, complaint, result["duplicates"])


# ============================================================
# GET /my — list citizen's complaints
# ============================================================
@router.get("/my")
def get_my_complaints(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("CITIZEN"))
):
    stmt = select(Complaint).where(Complaint.user_id == user.id).order_by(desc(Complaint.created_at))
    complaints = db.execute(stmt).scalars().all()
    
    result = []
    for c in complaints:
        item = complaint_to_list_item(c)
        if c.duplicate_cluster_id:
            from ..models import DuplicateCluster
            cluster = db.get(DuplicateCluster, c.duplicate_cluster_id)
            if cluster:
                item["duplicateGroupId"] = cluster.cluster_number
        result.append(item)
    return result


# ============================================================
# GET / — list all complaints (lightweight)
# ============================================================
@router.get("/")
def list_complaints(db: Session = Depends(get_db), limit: int = 200, user: User = Depends(require_role("ADMIN"))):
    stmt = select(Complaint).order_by(desc(Complaint.created_at)).limit(limit)
    complaints = db.execute(stmt).scalars().all()

    # For list items we also need cluster numbers
    result = []
    for c in complaints:
        item = complaint_to_list_item(c)
        # Resolve duplicate group id
        if c.duplicate_cluster_id:
            from ..models import DuplicateCluster
            cluster = db.get(DuplicateCluster, c.duplicate_cluster_id)
            if cluster:
                item["duplicateGroupId"] = cluster.cluster_number
        result.append(item)
    return result


# ============================================================
# GET /map/all — complaints with coordinates for Leaflet map
# MUST be declared BEFORE /{complaint_id}
# ============================================================
@router.get("/map/all")
def map_complaints(db: Session = Depends(get_db), user: User = Depends(require_role("ADMIN"))):
    stmt = (
        select(Complaint)
        .where(Complaint.latitude.isnot(None), Complaint.longitude.isnot(None))
        .order_by(desc(Complaint.created_at))
    )
    rows = db.execute(stmt).scalars().all()

    from .normalise import _map_category, _map_level, _fe_status
    return [
        {
            "id":              c.complaint_number,
            "dbId":            c.id,
            "issueType":       _map_category(c.category),
            "priorityLevel":   _map_level(c.priority_level),
            "priorityScore":   c.priority_score,
            "status":          _fe_status(c, _map_level(c.priority_level)),
            "latitude":        c.latitude,
            "longitude":       c.longitude,
            "address":         c.address or "",
            "createdAt":       c.created_at.isoformat(),
        }
        for c in rows
    ]


# ============================================================
# GET /debug/priority-preview — dev tool
# MUST be declared BEFORE /{complaint_id}
# ============================================================
@router.get("/debug/priority-preview")
def priority_preview(
    category: str = "Streetlight",
    title: str = "Broken light",
    description: str = "Light near school is broken and dangerous",
    address: str = "",
    landmark: str = "",
    duplicate_count: int = 0,
    nearby_same_category: int = 0,
):
    pr = compute_priority(
        category=category,
        title=title,
        description=description,
        address=address,
        landmark=landmark,
        created_at=datetime.utcnow(),
        duplicate_count=duplicate_count,
        nearby_same_category=nearby_same_category,
    )
    return pr


# ============================================================
# PUT /{id}/status — lifecycle transition
# ============================================================
@router.put("/{complaint_id}/status")
def update_status(complaint_id: int, payload: dict, db: Session = Depends(get_db), user: User = Depends(require_role("ADMIN"))):
    c = db.get(Complaint, complaint_id)
    if not c:
        raise HTTPException(404, "Complaint not found")

    fe_status  = (payload or {}).get("status", "")
    reason     = (payload or {}).get("reason", "")

    # Accept both frontend Title Case and backend UPPER_SNAKE
    be_status = STATUS_REVERSE.get(fe_status, fe_status.upper().replace(" ", "_"))
    if be_status not in VALID_STATUSES:
        raise HTTPException(
            400,
            f"Invalid status '{fe_status}'. "
            f"Use one of: {sorted(VALID_STATUSES)}"
        )

    old_status = c.status
    c.status = be_status

    if be_status in ("RESOLVED", "CLOSED") and not c.resolved_at:
        c.resolved_at = datetime.utcnow()

    db.add(AuditLog(
        complaint_id=c.id,
        action="STATUS_CHANGED",
        old_value=old_status,
        new_value=be_status,
        reason=reason,
    ))

    db.commit()
    db.refresh(c)
    return complaint_to_response(db, c)


# ============================================================
# PUT /{id}/department — assign department
# ============================================================
@router.put("/{complaint_id}/department")
def update_department(complaint_id: int, payload: dict, db: Session = Depends(get_db), user: User = Depends(require_role("ADMIN"))):
    c = db.get(Complaint, complaint_id)
    if not c:
        raise HTTPException(404, "Complaint not found")

    new_dept = (payload or {}).get("department", "")
    reason   = (payload or {}).get("reason", "")

    if not new_dept:
        raise HTTPException(400, "department is required")

    old_dept = c.department
    c.department = new_dept

    db.add(AuditLog(
        complaint_id=c.id,
        action="DEPARTMENT_ASSIGNED",
        old_value=old_dept,
        new_value=new_dept,
        reason=reason or f"Department changed to {new_dept}",
    ))

    db.commit()
    db.refresh(c)
    return complaint_to_response(db, c)


# ============================================================
# PUT /{id}/category — override AI classification
# ============================================================
@router.put("/{complaint_id}/category")
def override_category(complaint_id: int, payload: dict, db: Session = Depends(get_db), user: User = Depends(require_role("ADMIN"))):
    c = db.get(Complaint, complaint_id)
    if not c:
        raise HTTPException(404, "Complaint not found")

    new_cat = (payload or {}).get("category", "")
    reason  = (payload or {}).get("reason", "")

    if not new_cat:
        raise HTTPException(400, "category is required")

    old_cat = c.category
    c.category = new_cat
    c.confidence = 0.0  # human override

    # Re-assign department for new category
    from .normalise import _map_category, _suggest_department
    issue_type = _map_category(new_cat)
    c.department = _suggest_department(issue_type, None)

    db.add(AuditLog(
        complaint_id=c.id,
        action="CATEGORY_OVERRIDDEN",
        old_value=old_cat,
        new_value=new_cat,
        reason=reason,
    ))

    db.commit()
    db.refresh(c)
    return complaint_to_response(db, c)


# ============================================================
# GET /{complaint_id} — single complaint by integer PK
# MUST be last — catches any unmatched literal path
# ============================================================
@router.get("/{complaint_id}")
def get_complaint(complaint_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.get(Complaint, complaint_id)
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if user.role == "CITIZEN" and c.user_id is not None and c.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return complaint_to_response(db, c)


# ============================================================
# GET /by-number/{complaint_number} — lookup by CFX-… string ID
# MUST be declared BEFORE /{complaint_id} — but complaint_id catches ints only
# so this needs its own path prefix that won't be caught as int
# ============================================================
@router.get("/number/{complaint_number}")
def get_complaint_by_number(complaint_number: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Complaint).where(Complaint.complaint_number == complaint_number)
    c = db.execute(stmt).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if user.role == "CITIZEN" and c.user_id is not None and c.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return complaint_to_response(db, c)
