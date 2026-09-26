from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class DuplicateCluster(Base):
    __tablename__ = "duplicate_clusters"

    id: Mapped[int] = mapped_column(primary_key=True)
    cluster_number: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING | CONFIRMED | REJECTED
    review_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)