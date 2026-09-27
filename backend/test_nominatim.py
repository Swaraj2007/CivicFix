import httpx

headers = {"User-Agent": "CivicFixApp-Swaraj/2.0 (contact: test.swaraj@google.com)"}
params = {"q": "Vishrantwadi, Pune", "format": "json"}
r = httpx.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers)
print(r.status_code)
if r.status_code == 200:
    print(r.json())
else:
    print(r.text)
