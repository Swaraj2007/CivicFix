from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Inbound: what the citizen sends us
# ---------------------------------------------------------------------------
class ComplaintCreate(BaseModel):
    """What the citizen sends us. title is auto-derived from description if omitted."""
    title: str | None = Field(None, max_length=200)
    description: str = Field(..., min_length=5)
    citizen_name: str | None = None
    address: str | None = None
    landmark: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    # image is handled via a separate multipart upload endpoint;
    # this field carries an already-uploaded image URL (or None)
    image_url: str | None = None


# ---------------------------------------------------------------------------
# Status-history entry (built from AuditLog rows on the fly)
# ---------------------------------------------------------------------------
class StatusHistoryEntry(BaseModel):
    status: str
    timestamp: datetime
    note: str | None = None


# ---------------------------------------------------------------------------
# Priority breakdown component (matches frontend PriorityBreakdown interface)
# ---------------------------------------------------------------------------
class PriorityBreakdownItem(BaseModel):
    label: str
    score: int
    max: int
    weight: str


# ---------------------------------------------------------------------------
# Duplicate match (matches frontend DuplicateMatch interface)
# ---------------------------------------------------------------------------
class DuplicateMatchItem(BaseModel):
    complaintId: str        # complaint_number (CFX-…)
    textSimilarity: int     # 0-100
    locationSimilarity: int  # 0-100
    overallSimilarity: int  # 0-100


# ---------------------------------------------------------------------------
# Outbound: everything the frontend Complaint interface needs
# ---------------------------------------------------------------------------
class ComplaintResponse(BaseModel):
    """
    Normalised response that maps backend snake_case fields → frontend camelCase.
    All field names here match exactly what the frontend TypeScript `Complaint`
    interface expects, so no mapping is needed in each page component.
    """
    # Identity
    id: str                    # complaint_number → "CFX-2026-ABC123"
    dbId: int                  # internal PK for API calls
    description: str
    image: str                 # image_url or placeholder
    issueType: str             # mapped from category
    latitude: float
    longitude: float
    address: str
    landmark: str | None = None
    citizenName: str
    # Priority
    severity: int
    impact: int
    recurrence: int
    locationImportance: int
    complaintAge: int
    priorityScore: int
    priorityLevel: str         # Low / Medium / High / Critical
    priorityBreakdown: list[PriorityBreakdownItem]
    priorityReasons: list[str]
    # Duplicate
    duplicateGroupId: str | None
    duplicateClusterId: int | None
    duplicateMatches: list[DuplicateMatchItem]
    # Workflow
    status: str                # Submitted / Under Review / …
    department: str
    createdAt: str             # ISO8601
    slaDeadline: str           # ISO8601
    resolvedAt: str | None
    aiConfidence: int          # 0-100 integer percent
    aiExplanation: str
    statusHistory: list[StatusHistoryEntry]

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Minimal list item (lighter version for table/track list views)
# ---------------------------------------------------------------------------
class ComplaintListItem(BaseModel):
    id: str
    dbId: int
    description: str
    issueType: str
    address: str
    priorityScore: int
    priorityLevel: str
    status: str
    department: str
    createdAt: str
    slaDeadline: str
    citizenName: str
    image: str
    duplicateGroupId: str | None

    class Config:
        from_attributes = True
