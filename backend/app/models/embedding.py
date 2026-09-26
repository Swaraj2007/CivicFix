from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from ..database import Base


class ComplaintEmbedding(Base):
    __tablename__ = "complaint_embeddings"

    id: Mapped[int] = mapped_column(primary_key=True)
    complaint_id: Mapped[int] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), unique=True
    )
    embedding: Mapped[list] = mapped_column(Vector(384))
    model_name: Mapped[str] = mapped_column(String(80), default="all-MiniLM-L6-v2")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="embedding")