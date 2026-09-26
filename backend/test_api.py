import requests
import json
import time

base_url = "http://localhost:8000/api/complaints"

payload_a = {
    "description": "The streetlight outside MIT Academy of Engineering has stopped working. The road becomes very dark at night and students have difficulty seeing the area.",
    "address": "MIT Academy of Engineering, Alandi, Pune"
}

payload_b = {
    "description": "The lamp near the MITAOE entrance is not functioning after sunset, causing poor visibility for students and people passing through the road.",
    "address": "MIT Academy of Engineering, Alandi, Pune"
}

# Delete existing duplicates / clusters if we wanted clean state, but let's just submit new ones

print("Submitting A...")
resp_a = requests.post(base_url, json=payload_a)
assert resp_a.status_code == 200, resp_a.text
data_a = resp_a.json()
print("A:", data_a["id"], data_a["duplicateGroupId"])

print("Submitting B...")
resp_b = requests.post(base_url, json=payload_b)
assert resp_b.status_code == 200, resp_b.text
data_b = resp_b.json()
print("B:", data_b["id"], data_b["duplicateGroupId"])

if data_b["duplicateGroupId"] is not None:
    print("SUCCESS: They were clustered together!")
else:
    print("FAILED: No cluster assigned to B.")

