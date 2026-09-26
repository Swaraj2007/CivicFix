import math
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..models import ComplaintEmbedding, Complaint

# Tunable threshold. Higher = fewer matches, more precise.
SIMILARITY_THRESHOLD = 0.60
GEO_RADIUS_METERS = 500.0

def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # Earth radius in meters
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def find_duplicates(
    db: Session,
    embedding: list[float],
    latitude: float | None = None,
    longitude: float | None = None,
    exclude_complaint_id: int | None = None,
    k: int = 5,
) -> list[dict]:
    """
    Search pgvector for nearest complaints by cosine similarity.
    Also filters by geographic radius if latitude/longitude are provided.
    """
    distance_col = ComplaintEmbedding.embedding.cosine_distance(embedding).label("distance")

    stmt = (
        select(ComplaintEmbedding.complaint_id, distance_col, Complaint.latitude, Complaint.longitude)
        .join(Complaint, Complaint.id == ComplaintEmbedding.complaint_id)
    )

    if latitude is not None and longitude is not None:
        # Approximate 1 degree ~ 111km, so 500m ~ 0.0045 degrees
        deg_radius = GEO_RADIUS_METERS / 111000.0
        stmt = stmt.where(
            Complaint.latitude.between(latitude - deg_radius, latitude + deg_radius),
            Complaint.longitude.between(longitude - deg_radius, longitude + deg_radius)
        )
        
    stmt = stmt.order_by(distance_col).limit(k * 3) # Fetch more, filter by strict distance later

    rows = db.execute(stmt).all()

    results = []
    for complaint_id, dist, c_lat, c_lon in rows:
        if exclude_complaint_id is not None and complaint_id == exclude_complaint_id:
            continue
            
        similarity = 1.0 - float(dist)
        if similarity < SIMILARITY_THRESHOLD:
            continue
            
        if latitude is not None and longitude is not None and c_lat is not None and c_lon is not None:
            dist_meters = _haversine_distance(latitude, longitude, c_lat, c_lon)
            if dist_meters > GEO_RADIUS_METERS:
                continue

        results.append({
            "complaint_id": complaint_id,
            "similarity": round(similarity, 4),
        })
        
        if len(results) >= k:
            break
            
    return results