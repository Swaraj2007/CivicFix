import csv
import os
import joblib
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, f1_score, confusion_matrix

DATA_PATH = "/data/synthetic_complaints.csv"
MODEL_DIR = "/ml/models"
MODEL_PATH = os.path.join(MODEL_DIR, "classifier.joblib")

# 1. Load data
rows = list(csv.DictReader(open(DATA_PATH, encoding="utf-8")))
X = [r["text"] for r in rows]
y = [r["category"] for r in rows]

print(f"Loaded {len(X)} samples across {len(set(y))} categories")

# 2. Split
X_tr, X_te, y_tr, y_te = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# 3. Build pipeline
pipe = Pipeline([
    ("tfidf", TfidfVectorizer(
        ngram_range=(1, 2),
        min_df=2,
        sublinear_tf=True,
        lowercase=True,
    )),
    ("clf", LogisticRegression(
        max_iter=1000,
        C=5.0,
        class_weight="balanced",
    )),
])

# 4. Train
pipe.fit(X_tr, y_tr)

# 5. Evaluate
pred = pipe.predict(X_te)
print("\n=== Classification Report ===")
print(classification_report(y_te, pred, digits=4))
macro_f1 = f1_score(y_te, pred, average="macro")
print(f"Macro F1: {macro_f1:.4f}")

# 6. Save
os.makedirs(MODEL_DIR, exist_ok=True)
joblib.dump(pipe, MODEL_PATH)
print(f"\nSaved model to {MODEL_PATH}")