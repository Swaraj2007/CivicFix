import csv
import os
import random

random.seed(42)

# 12 templates per category
TEMPLATES = {
    "Pothole / Road Damage": [
        "Large pothole on {road} near {place}, dangerous for two-wheelers.",
        "Road completely broken near {place}, deep potholes everywhere.",
        "Huge pothole outside {place} causing accidents at night.",
        "Road surface damaged near {place}, water collects in pits.",
        "Bad road condition near {place}, vehicles getting damaged.",
        "Pothole has formed on the main road near {place}.",
        "Deep crater on {road} at {place}, needs urgent repair.",
        "Road caved in near {place}, traffic disrupted.",
        "Several potholes between {place} and {road}, risky for bikers.",
        "Damaged asphalt near {place}, uneven surface causing jams.",
        "Large pit on {road} close to {place}, safety hazard.",
        "Pothole-ridden stretch near {place}, roads unusable in rain.",
    ],
    "Garbage / Waste": [
        "Garbage not collected for days near {place}, overflowing bins.",
        "Waste dumped on roadside near {place}, terrible smell.",
        "Trash bin near {place} is overflowing and attracting stray animals.",
        "Lots of garbage pile up near {place}, no pickup happened.",
        "People throwing waste near {place}, need urgent cleaning.",
        "Dustbin near {place} not emptied for a week.",
        "Waste collection missed near {place}, bins stinking.",
        "Garbage heap near {place}, breeding mosquitoes.",
        "Trash scattered around {place}, unsanitary conditions.",
        "Public bin near {place} spilling over, cleanup needed.",
        "Dry and wet waste mixed near {place}, no segregation.",
        "Foul smell from waste pile near {place}, health hazard.",
    ],
    "Streetlight": [
        "Streetlight near {place} is broken, whole area dark at night.",
        "Light outside {place} has stopped working for a week.",
        "No streetlight working near {place}, unsafe at night.",
        "Street lamp near {place} not glowing, need repair.",
        "Pole light near {place} is off, very dark.",
        "Streetlight flickering near {place} since last night.",
        "Streetlight near {place} switched off during night hours.",
        "Bulb fused in streetlight near {place}, area pitch black.",
        "Lamp post near {place} leaning and light not working.",
        "Streetlight damaged near {place}, needs replacement.",
        "No illumination near {place} due to broken streetlight.",
        "Multiple streetlights off near {place}, dark stretch.",
    ],
    "Drainage": [
        "Drain blocked near {place}, water overflowing on the road.",
        "Open manhole near {place}, dangerous for children and bikes.",
        "Sewage drain choked near {place}, flooding the street.",
        "Drainage line broken near {place}, dirty water everywhere.",
        "Gutter near {place} overflowing with waste water.",
        "Blocked drain near {place} causing water logging.",
        "Manhole cover missing near {place}, major safety risk.",
        "Sewage backup near {place}, unbearable smell.",
        "Storm drain clogged near {place}, roads flooded after rain.",
        "Broken drainage pipe near {place}, water pooling.",
        "Drain overflow near {place}, contaminating street.",
        "Uncovered drain near {place}, pedestrians at risk.",
    ],
    "Water Leakage": [
        "Water pipeline leaking near {place}, lot of water wasted.",
        "No water supply near {place} for three days.",
        "Pipe burst near {place} flooding the road.",
        "Water leaking continuously near {place}, need urgent fix.",
        "Tap broken near {place}, water flowing on the street.",
        "Water supply pipe damaged near {place}, wastage high.",
        "Major water leak near {place}, road getting eroded.",
        "Pipeline rupture near {place}, supply disrupted.",
        "Continuous water spill near {place}, wasting thousands of litres.",
        "Leaking valve near {place}, low pressure in nearby homes.",
        "Broken main line near {place}, water gushing out.",
        "Water tanker leak near {place}, road slippery.",
    ],
}

PLACES = [
    "Alandi college gate", "the main market", "the bus stand",
    "the government hospital", "the primary school", "Station Road",
    "Gandhi Chowk", "the temple", "the playground", "MG Road",
    "the railway station", "Sector 5", "the vegetable market",
    "the community hall", "the police station",
]

ROADS = ["Main Road", "Service Road", "NH-48", "Station Road", "Old Highway"]

# Held-out templates: last 2 templates per category are for TEST ONLY
HELD_OUT_COUNT = 2

OUT_PATH = "/data/synthetic_complaints.csv"

rows = []
for category, tmpls in TEMPLATES.items():
    train_tmpls = tmpls[:-HELD_OUT_COUNT]
    test_tmpls = tmpls[-HELD_OUT_COUNT:]

    for _ in range(300):
        text = random.choice(train_tmpls).format(
            road=random.choice(ROADS), place=random.choice(PLACES)
        )
        rows.append({"text": text, "category": category, "split": "train"})

    for _ in range(80):
        text = random.choice(test_tmpls).format(
            road=random.choice(ROADS), place=random.choice(PLACES)
        )
        rows.append({"text": text, "category": category, "split": "test"})

random.shuffle(rows)

with open(OUT_PATH, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["text", "category", "split"])
    w.writeheader()
    w.writerows(rows)

print(f"Wrote {len(rows)} rows")
print(f"Train: {sum(1 for r in rows if r['split'] == 'train')}")
print(f"Test:  {sum(1 for r in rows if r['split'] == 'test')}")