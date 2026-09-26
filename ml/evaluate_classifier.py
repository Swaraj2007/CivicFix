import csv
import joblib
import os
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score, confusion_matrix

DATA_PATH = "/data/synthetic_complaints.csv"
MODEL_PATH = "/ml/models/classifier.joblib"

# Load data
rows = list(csv.DictReader(open(DATA_PATH, encoding="utf-8")))
train = [r for r in rows if r["split"] == "train"]
test = [r for r in rows if r["split"] == "test"]

print(f"Train samples: {len(train)}")
print(f"Test samples:  {len(test)}")
print(f"Categories:    {sorted(set(r['category'] for r in rows))}")
print()

X_train = [r["text"] for r in train]
y_train = [r["category"] for r in train]
X_test = [r["text"] for r in test]
y_test = [r["category"] for r in test]

# Train fresh
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

pipe.fit(X_train, y_train)

# Evaluate
pred = pipe.predict(X_test)

print("=" * 60)
print("CLASSIFICATION REPORT — HELD-OUT TEMPLATES")
print("=" * 60)
print(classification_report(y_test, pred, digits=4))

macro_f1 = f1_score(y_test, pred, average="macro")
weighted_f1 = f1_score(y_test, pred, average="weighted")

print(f"Macro F1:    {macro_f1:.4f}")
print(f"Weighted F1: {weighted_f1:.4f}")
print()

# Save the model too (so the backend uses the more realistic one)
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
joblib.dump(pipe, MODEL_PATH)
print(f"Model saved to {MODEL_PATH}")