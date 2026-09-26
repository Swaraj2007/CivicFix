from datetime import datetime
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Identity
    complaint_number: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)

    # Citizen info (optional)
    citizen_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # AI classification
    category: Mapped[str | None] = mapped_column(String(60), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Location
    address: Mapped[str | None] = mapped_column(String(400), nullable=True)
    landmark: Mapped[str | None] = mapped_column(String(200), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Priority
    priority_score: Mapped[int] = mapped_column(Integer, default=0)
    priority_level: Mapped[str] = mapped_column(String(10), default="LOW")
    priority_reasons: Mapped[str] = mapped_column(Text, default="")

    # Department assignment
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Workflow
    status: Mapped[str] = mapped_column(String(30), default="SUBMITTED")

    # Duplicate cluster linkage
    duplicate_cluster_id: Mapped[int | None] = mapped_column(
        ForeignKey("duplicate_clusters.id"), nullable=True
    )

    # User linkage
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    user = relationship("User", back_populates="complaints")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    sla_deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # One-to-one relationship with embedding
    embedding = relationship(
        "ComplaintEmbedding",
        back_populates="complaint",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # Audit log relationship
    audit_logs = relationship(
        "AuditLog",
        primaryjoin="Complaint.id == foreign(AuditLog.complaint_id)",
        order_by="AuditLog.timestamp",
        viewonly=True,
    )
