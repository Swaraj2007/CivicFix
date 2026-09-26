import os
import sys

from sentence_transformers import SentenceTransformer
from numpy import dot
from numpy.linalg import norm

text_a = "The streetlight outside MIT Academy of Engineering has stopped working. The road becomes very dark at night and students have difficulty seeing the area."
text_b = "The lamp near the MITAOE entrance is not functioning after sunset, causing poor visibility for students and people passing through the road."


model = SentenceTransformer('all-MiniLM-L6-v2')
emb_a = model.encode(text_a, normalize_embeddings=True)
emb_b = model.encode(text_b, normalize_embeddings=True)

cos_sim = dot(emb_a, emb_b)
print(f"Similarity (Description Only): {cos_sim}")

text_c = "broken streetlight near MITAOE"
text_d = "water leakage near MITAOE"

emb_c = model.encode(text_c, normalize_embeddings=True)
emb_d = model.encode(text_d, normalize_embeddings=True)

cos_sim_false = dot(emb_c, emb_d)
print(f"Similarity False Positive (Description Only): {cos_sim_false}")
