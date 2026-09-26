import os
import joblib
from functools import lru_cache

MODEL_PATH = os.environ.get("CLASSIFIER_PATH", "/ml/models/classifier.joblib")


@lru_cache(maxsize=1)
def _load_model():
    """Load once, cache forever. Loading joblib takes ~50ms, but no need to repeat."""
    if not os.path.exists(MODEL_PATH):
        return None
    return joblib.load(MODEL_PATH)


def classify(title: str, description: str) -> dict:
    """
    Returns: {"category": str, "confidence": float, "fallback": bool}
    If the model file is missing, returns Other with 0.0 confidence.
    """
    model = _load_model()
    if model is None:
        return {"category": "Other", "confidence": 0.0, "fallback": True}

    text = f"{title}. {description}"
    proba = model.predict_proba([text])[0]
    idx = int(proba.argmax())
    return {
        "category": str(model.classes_[idx]),
        "confidence": float(proba[idx]),
        "fallback": False,
    }