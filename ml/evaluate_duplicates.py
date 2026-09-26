import csv
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

PAIRS_PATH = "/ml/duplicate_pairs.csv"
THRESHOLDS = [0.50, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90]


def evaluate_at_threshold(similarities, labels, threshold):
    """Precision/recall/F1 at a given threshold."""
    preds = [1 if s >= threshold else 0 for s in similarities]

    tp = sum(1 for p, l in zip(preds, labels) if p == 1 and l == 1)
    fp = sum(1 for p, l in zip(preds, labels) if p == 1 and l == 0)
    fn = sum(1 for p, l in zip(preds, labels) if p == 0 and l == 1)
    tn = sum(1 for p, l in zip(preds, labels) if p == 0 and l == 0)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    accuracy = (tp + tn) / len(labels)

    return {
        "threshold": threshold,
        "tp": tp, "fp": fp, "fn": fn, "tn": tn,
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1": round(f1, 3),
        "accuracy": round(accuracy, 3),
    }


def main():
    # Load pairs
    rows = list(csv.DictReader(open(PAIRS_PATH, encoding="utf-8"), delimiter=";"))
    pairs = [(r["text1"], r["text2"], int(r["is_duplicate"])) for r in rows]
    labels = [p[2] for p in pairs]

    print(f"Loaded {len(pairs)} labeled pairs")
    print(f"  Duplicates (positives): {sum(labels)}")
    print(f"  Non-duplicates (neg):   {len(labels) - sum(labels)}")
    print()

    # Load model once
    print("Loading model...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    # Embed both sides of every pair
    print("Embedding text1s...")
    emb1 = model.encode([p[0] for p in pairs], normalize_embeddings=True)
    print("Embedding text2s...")
    emb2 = model.encode([p[1] for p in pairs], normalize_embeddings=True)

    # Cosine similarity per pair
    similarities = [
        float(cosine_similarity([e1], [e2])[0][0])
        for e1, e2 in zip(emb1, emb2)
    ]

    # Print per-pair detail
    print("\n" + "=" * 80)
    print("PER-PAIR SIMILARITY")
    print("=" * 80)
    for (t1, t2, label), sim in zip(pairs, similarities):
        marker = "✅" if (sim >= 0.75) == bool(label) else "❌"
        tag = "DUP" if label == 1 else "NOT"
        print(f"{marker} [{tag}] sim={sim:.3f}")
        print(f"    A: {t1[:70]}")
        print(f"    B: {t2[:70]}")

    # Sweep thresholds
    print("\n" + "=" * 80)
    print("THRESHOLD SWEEP")
    print("=" * 80)
    print(f"{'Thresh':>8} | {'Prec':>6} | {'Rec':>6} | {'F1':>6} | {'Acc':>6} | TP FP FN TN")
    print("-" * 80)
    for th in THRESHOLDS:
        m = evaluate_at_threshold(similarities, labels, th)
        print(
            f"{m['threshold']:>8.2f} | "
            f"{m['precision']:>6.3f} | "
            f"{m['recall']:>6.3f} | "
            f"{m['f1']:>6.3f} | "
            f"{m['accuracy']:>6.3f} | "
            f"{m['tp']:>2} {m['fp']:>2} {m['fn']:>2} {m['tn']:>2}"
        )

    # Highlight the deployed threshold
    print()
    deployed = evaluate_at_threshold(similarities, labels, 0.75)
    print("=" * 80)
    print("AT DEPLOYED THRESHOLD (0.75)")
    print("=" * 80)
    print(f"Precision: {deployed['precision']:.3f}")
    print(f"Recall:    {deployed['recall']:.3f}")
    print(f"F1:        {deployed['f1']:.3f}")
    print(f"Accuracy:  {deployed['accuracy']:.3f}")


if __name__ == "__main__":
    main()