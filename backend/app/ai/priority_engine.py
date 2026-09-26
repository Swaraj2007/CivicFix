from datetime import datetime, timedelta

# ---------------- Category-based baseline safety score ----------------
CATEGORY_SAFETY = {
    "Pothole / Road Damage": 20,
    "Streetlight": 18,
    "Drainage": 16,
    "Public Infrastructure": 14,
    "Water Leakage": 12,
    "Garbage / Waste": 8,
    "Illegal Dumping": 8,
    "Other": 6,
}

# ---------------- Keyword tables ----------------
SAFETY_KEYWORDS = {
    "accident": 6, "injury": 6, "injured": 6,
    "child": 5, "children": 5, "school": 4,
    "hospital": 5, "fire": 6, "live wire": 9, "electric": 5,
    "open manhole": 9, "collapse": 8, "deep": 3,
    "night": 2, "blind": 2,
}

SEVERITY_KEYWORDS = {
    "completely": 4, "totally": 4, "major": 4, "severe": 5,
    "huge": 4, "large": 3, "overflowing": 4, "flood": 5,
    "blocked": 3, "broken": 3, "dangerous": 5, "unusable": 4,
    "no water": 4, "days": 2, "weeks": 3,
}

SENSITIVE_SITES = {
    "hospital": 6, "school": 5, "college": 4,
    "bus stop": 4, "bus stand": 4, "market": 3,
    "temple": 3, "playground": 3, "anganwadi": 5, "clinic": 5,
}

# ---------------- SLA hours per priority ----------------
SLA_HOURS = {
    "CRITICAL": 4,
    "HIGH": 12,
    "MEDIUM": 24,
    "LOW": 72,
}


def _keyword_score(text: str, table: dict, cap: int) -> tuple[int, list[str]]:
    """Sum keyword points, cap at max, return hits too."""
    t = (text or "").lower()
    hits, total = [], 0
    for kw, pts in table.items():
        if kw in t:
            total += pts
            hits.append(kw)
    return min(total, cap), hits


def compute_priority(
    *,
    category: str,
    title: str,
    description: str,
    address: str = "",
    landmark: str = "",
    created_at: datetime | None = None,
    duplicate_count: int = 0,
    nearby_same_category: int = 0,
) -> dict:
    """
    Deterministic explainable priority scoring.
    Returns: score (0-100), level, breakdown, reasons.
    """
    created_at = created_at or datetime.utcnow()
    text = f"{title} {description}"
    location_text = f"{address} {landmark}"

    # --- 1. Safety Risk (0–30) ---
    base = CATEGORY_SAFETY.get(category, 6)
    kw_pts, kw_hits = _keyword_score(text, SAFETY_KEYWORDS, 30 - base)
    safety = min(base + kw_pts, 30)

    # --- 2. Report Volume (0–20) ---
    volume = min(duplicate_count * 8 + nearby_same_category * 4, 20)

    # --- 3. Severity (0–20) ---
    sev, sev_hits = _keyword_score(text, SEVERITY_KEYWORDS, 20)

    # --- 4. SLA Age (0–15) ---
    elapsed_hours = (datetime.utcnow() - created_at).total_seconds() / 3600
    # Baseline SLA is 24h before priority is known; ratio of age to it
    ratio = elapsed_hours / 24.0
    sla_age = min(int(ratio * 15), 15)

    # --- 5. Sensitive Site (0–15) ---
    sens, sens_hits = _keyword_score(location_text + " " + text, SENSITIVE_SITES, 15)

    total = safety + volume + sev + sla_age + sens

    # --- Level ---
    if total >= 85:
        level = "CRITICAL"
    elif total >= 70:
        level = "HIGH"
    elif total >= 40:
        level = "MEDIUM"
    else:
        level = "LOW"

    # --- Reasons ---
    reasons = []
    if safety >= 18:
        reasons.append("High safety concern")
    if volume >= 12:
        reasons.append("Multiple similar reports")
    if sev >= 12:
        reasons.append("High severity indicators")
    if sla_age >= 10:
        reasons.append("Approaching SLA deadline")
    if sens >= 8:
        reasons.append("Sensitive location nearby")
    if kw_hits:
        reasons.append("Hazard keywords: " + ", ".join(kw_hits[:3]))
    if not reasons:
        reasons.append("Routine complaint")

    return {
        "score": total,
        "level": level,
        "breakdown": {
            "safety_risk": safety,
            "report_volume": volume,
            "severity": sev,
            "sla_age": sla_age,
            "sensitive_site": sens,
        },
        "reasons": reasons,
    }


def sla_deadline(level: str, created_at: datetime | None = None) -> datetime:
    created_at = created_at or datetime.utcnow()
    return created_at + timedelta(hours=SLA_HOURS.get(level, 24))