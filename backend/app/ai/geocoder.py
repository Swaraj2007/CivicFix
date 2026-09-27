import httpx
import time
from typing import Optional


USER_AGENT = "CivicFixApp-Swaraj/2.0 (contact: test.swaraj@google.com)"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

_last_request_time = 0.0
_MIN_INTERVAL = 1.1


def _rate_limit():
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - elapsed)
    _last_request_time = time.time()


def geocode(query: str, country: str = "India") -> Optional[dict]:
    if not query or len(query.strip()) < 3:
        return None

    _rate_limit()
    
    # Ensure Pune context
    q = query
    if "pune" not in q.lower():
        q += ", Pune"
    if "maharashtra" not in q.lower():
        q += ", Maharashtra"

    # Viewbox for Pune District approx:
    # left (min lon), top (max lat), right (max lon), bottom (min lat)
    # lon: 73.2 to 74.5, lat: 18.0 to 19.3
    params = {
        "q": q,
        "format": "json",
        "limit": 5,
        "viewbox": "73.2,19.3,74.5,18.0",
        "bounded": 1,
        "countrycodes": "in"
    }
    headers = {"User-Agent": USER_AGENT}

    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.get(NOMINATIM_URL, params=params, headers=headers)
        print(f"[geocoder] nominatim status={r.status_code} query={q!r}")

        if r.status_code == 200:
            data = r.json()
            # Filter results to strictly Pune/PCMC/Haveli/Alandi area
            valid_results = []
            for hit in data:
                display_name = hit.get("display_name", "").lower()
                if any(region in display_name for region in ["pune", "pimpri-chinchwad", "alandi", "haveli"]):
                    valid_results.append(hit)
            
            if valid_results:
                # Prefer more specific? The first returned valid is fine.
                hit = valid_results[0]
                return {
                    "latitude": float(hit["lat"]),
                    "longitude": float(hit["lon"]),
                    "display_name": hit.get("display_name", ""),
                }
    except Exception as e:
        print(f"[geocoder] nominatim error for {q!r}: {e}")

    # No fallback that invents coordinates
    return None


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
        # Check if the cached coordinate was MANAPA. If so, bypass the cache and geocode again
        # since it's likely a bad cache hit from before.
        lat, lng = row[0], row[1]
        # MANAPA fallback coords were exactly 18.5204, 73.8567
        if abs(lat - 18.5204) < 0.0001 and abs(lng - 73.8567) < 0.0001:
            print(f"[geocoder] Ignoring bad cached MANAPA result for {query!r}")
        else:
            return {"latitude": lat, "longitude": lng, "display_name": "(cached)"}

    return geocode(query)