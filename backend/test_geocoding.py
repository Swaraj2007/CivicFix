import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.ai.geocoder import geocode

queries = [
    "Vishrantwadi, Pune",
    "Katraj, Pune",
    "Hadapsar, Pune",
    "Dhanori, Pune",
    "MIT Academy of Engineering, Alandi, Pune",
    "A random invalid location XYZ123"
]

for q in queries:
    res = geocode(q)
    print(f"Query: {q}")
    if res:
        print(f"-> {res['display_name']}")
        print(f"-> Lat: {res['latitude']}, Lng: {res['longitude']}\n")
    else:
        print("-> None (No valid result found)\n")
