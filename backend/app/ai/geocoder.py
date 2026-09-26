import httpx
import time
from typing import Optional


USER_AGENT = "CivicFix-Hackathon/0.1 (contact: civicfix@example.com)"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

_last_request_time = 0.0
_MIN_INTERVAL = 1.1

FALLBACKS = {
    "alandi": (18.6774, 73.8987),
    "pune": (18.5204, 73.8567),
    "mumbai": (19.0760, 72.8777),
    "delhi": (28.6139, 77.2090),
    "bangalore": (12.9716, 77.5946),
    "station road": (18.5204, 73.8567),
    "gandhi chowk": (18.5204, 73.8567),
    "bus stop": (18.6774, 73.8987),
    "bus stand": (18.6774, 73.8987),
    "college": (18.6774, 73.8987),
    "hospital": (18.5204, 73.8567),
    "school": (18.5204, 73.8567),
    "market": (18.5204, 73.8567),
}


def _rate_limit():
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - elapsed)
    _last_request_time = time.time()


def _fallback(query: str) -> Optional[dict]:
    q = query.lower()
    for key, (lat, lng) in FALLBACKS.items():
        if key in q:
            return {
                "latitude": lat,
                "longitude": lng,
                "display_name": f"(fallback) {query}",
            }
    return None


def geocode(query: str, country: str = "India") -> Optional[dict]:
    if not query or len(query.strip()) < 3:
        return None

    _rate_limit()

    params = {
        "q": f"{query}, {country}",
        "format": "json",
        "limit": 1,
    }
    headers = {"User-Agent": USER_AGENT}

    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.get(NOMINATIM_URL, params=params, headers=headers)
        print(f"[geocoder] nominatim status={r.status_code} query={query!r}")

        if r.status_code == 200:
            data = r.json()
            if data:
                hit = data[0]
                return {
                    "latitude": float(hit["lat"]),
                    "longitude": float(hit["lon"]),
                    "display_name": hit.get("display_name", ""),
                }
    except Exception as e:
        print(f"[geocoder] nominatim error for {query!r}: {e}")

    # Fallback to local map if Nominatim failed
    fb = _fallback(query)
    if fb:
        print(f"[geocoder] using fallback for {query!r}")
    return fb


def geocode_with_cache(query: str, db, Complaint_model) -> Optional[dict]:
    if not query:
        return None

    normalized = query.strip().lower()

    from sqlalchemy import select, func
    stmt = (
        select(Complaint_model.latitude, Complaint_model.longitude)
        .where(
            func.lower(Complaint_model.address) == normalized,
            Complaint_model.latitude.isnot(None),
            Complaint_model.longitude.isnot(None),
        )
        .limit(1)
    )
    row = db.execute(stmt).first()
    if row:
        return {"latitude": row[0], "longitude": row[1], "display_name": "(cached)"}

    return geocode(query)