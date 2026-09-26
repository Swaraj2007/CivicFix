from functools import lru_cache
from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _model() -> SentenceTransformer:
    """
    Loads the model once per process.
    First call downloads ~90MB to HF_HOME (cached in /ml/hf_cache).
    """
    print(f"[embeddings] loading {MODEL_NAME}...")
    m = SentenceTransformer(MODEL_NAME)
    print("[embeddings] model ready")
    return m


def embed(text: str) -> list[float]:
    """Return a normalized 384-dim embedding."""
    return _model().encode(text, normalize_embeddings=True).tolist()