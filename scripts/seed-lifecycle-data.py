"""Create a deterministic, clearly labelled lifecycle demo dataset in Firestore.

Dry run:
  python scripts/seed-lifecycle-data.py --dry-run

Owner-authorized live run (intended for Google Cloud Shell):
  python seed-lifecycle-data.py --allow-live --confirm-project=civicai-backend

The script uses the active gcloud identity and never changes Firestore rules.
Existing documents are not deleted or modified. Fixed document IDs prevent an
accidental second run from silently duplicating the dataset.
"""

from __future__ import annotations

import argparse
import json
import random
import subprocess
import sys
import urllib.error
import urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone


PROJECT_ID = "civicai-backend"
DATABASE_ID = "(default)"
SEED = 20260816
DEMO_PREFIX = "[SYNTHETIC DEMO — NOT A REAL COMPLAINT]"

LOCATIONS = [
    ("Whitefield", 12.9698, 77.7500),
    ("Indiranagar", 12.9784, 77.6408),
    ("Koramangala", 12.9352, 77.6245),
    ("Electronic City", 12.8458, 77.6602),
    ("Yelahanka", 13.1004, 77.5963),
    ("JP Nagar", 12.9077, 77.5853),
    ("HSR Layout", 12.9116, 77.6474),
    ("Hebbal", 13.0353, 77.5946),
    ("Malleshwaram", 13.0034, 77.5670),
    ("Rajajinagar", 12.9913, 77.5549),
    ("BTM Layout", 12.9165, 77.6101),
    ("Marathahalli", 12.9591, 77.6971),
]

CATEGORIES = {
    "Road": {
        "department": "BBMP Roads",
        "issues": [
            ("a deep pothole is forcing vehicles into the opposite lane", ["pothole", "traffic risk"]),
            ("broken pavement tiles are blocking wheelchair access", ["pavement", "accessibility"]),
            ("a damaged speed breaker has loose concrete and exposed metal", ["road damage", "metal hazard"]),
            ("faded crossing markings make the school junction unsafe", ["crossing", "school zone"]),
        ],
        "resolutions": [
            "Road surface patched, compacted, and reopened after a safety inspection.",
            "Damaged section replaced and temporary warning barriers removed.",
            "Crossing and lane markings restored after surface preparation.",
        ],
    },
    "Garbage": {
        "department": "BBMP Sanitation",
        "issues": [
            ("overflowing waste bins are attracting stray animals", ["garbage", "overflow"]),
            ("construction debris has been dumped beside the service lane", ["debris", "illegal dumping"]),
            ("daily collection has missed the apartment block for several days", ["missed collection", "residential"]),
            ("loose waste is blocking the market-side footpath", ["garbage", "footpath"]),
        ],
        "resolutions": [
            "Waste removed, bins sanitised, and an additional collection round scheduled.",
            "Debris cleared and the dumping location added to enforcement monitoring.",
            "Collection route corrected and the missed pickup backlog cleared.",
        ],
    },
    "Water": {
        "department": "BWSSB",
        "issues": [
            ("a burst supply pipe is flooding the edge of the road", ["burst pipe", "flooding"]),
            ("a leaking public tap is wasting water continuously", ["water leak", "public tap"]),
            ("low water pressure is affecting several nearby homes", ["low pressure", "residential"]),
            ("discoloured water is coming from a public connection", ["water quality", "contamination risk"]),
        ],
        "resolutions": [
            "Damaged pipe section replaced, pressure tested, and normal supply restored.",
            "Leak sealed and the connection monitored for forty-eight hours.",
            "Supply line flushed and a follow-up water quality sample passed.",
        ],
    },
    "Electricity": {
        "department": "BESCOM",
        "issues": [
            ("multiple streetlights are dark along the pedestrian route", ["streetlight", "pedestrian safety"]),
            ("a low-hanging electrical cable is visible near the junction", ["electrical cable", "hazard"]),
            ("an exposed junction box is accessible from the footpath", ["junction box", "electrocution risk"]),
            ("the streetlight repeatedly flickers and fails after sunset", ["streetlight", "intermittent fault"]),
        ],
        "resolutions": [
            "Faulty light assembly replaced and the full circuit tested after sunset.",
            "Cable raised, secured, insulated, and cleared by the field engineer.",
            "Junction box sealed and electrical safety inspection completed.",
        ],
    },
    "Drainage": {
        "department": "BBMP Drainage",
        "issues": [
            ("a blocked storm drain is causing waterlogging after light rain", ["blocked drain", "waterlogging"]),
            ("sewage is backing up beside the public footpath", ["sewage", "health risk"]),
            ("a missing manhole cover creates a serious fall hazard", ["manhole", "fall hazard"]),
            ("silt buildup has reduced flow through the roadside drain", ["silt", "drainage flow"]),
        ],
        "resolutions": [
            "Drain mechanically cleared, desilted, and flow tested with water.",
            "Blockage removed, area disinfected, and damaged cover replaced.",
            "Manhole secured with a reinforced cover and surrounding surface levelled.",
        ],
    },
    "Other": {
        "department": "BBMP Citizen Services",
        "issues": [
            ("a damaged public bench has sharp exposed edges", ["public space", "bench damage"]),
            ("a fallen tree branch is obstructing part of the walking path", ["tree branch", "obstruction"]),
            ("damaged playground equipment needs to be isolated and repaired", ["playground", "safety risk"]),
            ("an abandoned sign frame is leaning toward the pavement", ["sign frame", "public safety"]),
        ],
        "resolutions": [
            "Damaged fixture repaired and the surrounding public area inspected.",
            "Obstruction removed and the walking route reopened safely.",
            "Unsafe equipment isolated, repaired, and approved for public use.",
        ],
    },
}

OFFICERS = [
    "Asha Rao",
    "Deepak Gowda",
    "Farhan Ali",
    "Kavya Nair",
    "Meera Joshi",
    "Naveen Kumar",
    "Priya Shah",
    "Rohan Das",
    "Sanjay Reddy",
    "Uma Iyer",
]

# Added to the existing 12 pending examples, this produces a 60-case dataset:
# pending 15, assigned 12, resolved 20, archived 13.
STATUS_PLAN = ["pending"] * 3 + ["assigned"] * 12 + ["resolved"] * 20 + ["archived"] * 13
PRIORITIES = ["Low"] * 7 + ["Medium"] * 20 + ["High"] * 15 + ["Critical"] * 6


def timestamp_value(value: datetime) -> dict:
    return {"timestampValue": value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")}


def string_value(value: str) -> dict:
    return {"stringValue": value}


def null_value() -> dict:
    return {"nullValue": None}


def location_value(latitude: float, longitude: float) -> dict:
    return {
        "mapValue": {
            "fields": {
                "latitude": {"doubleValue": latitude},
                "longitude": {"doubleValue": longitude},
            }
        }
    }


def strings_value(values: list[str]) -> dict:
    return {"arrayValue": {"values": [string_value(value) for value in values]}}


def generate_reports() -> list[dict]:
    rng = random.Random(SEED)
    statuses = STATUS_PLAN.copy()
    priorities = PRIORITIES.copy()
    rng.shuffle(statuses)
    rng.shuffle(priorities)
    categories = list(CATEGORIES)
    now = datetime.now(timezone.utc).replace(microsecond=0)
    reports = []

    for index, status in enumerate(statuses):
        category = categories[index % len(categories)]
        config = CATEGORIES[category]
        area, base_latitude, base_longitude = LOCATIONS[(index * 5 + index // 6) % len(LOCATIONS)]
        issue, signals = config["issues"][(index // len(categories)) % len(config["issues"])]
        priority = priorities[index]
        officer = OFFICERS[(index * 3) % len(OFFICERS)]
        latitude = round(base_latitude + rng.uniform(-0.006, 0.006), 6)
        longitude = round(base_longitude + rng.uniform(-0.006, 0.006), 6)

        if status == "pending":
            age_days = rng.randint(1, 24)
        elif status == "assigned":
            age_days = rng.randint(4, 40)
        elif status == "resolved":
            age_days = rng.randint(12, 95)
        else:
            age_days = rng.randint(35, 120)

        created_at = now - timedelta(days=age_days, hours=rng.randint(0, 20))
        assigned_at = None
        resolved_at = None
        archived_at = None
        if status in {"assigned", "resolved", "archived"}:
            assigned_at = created_at + timedelta(hours=rng.randint(3, 60))
        if status in {"resolved", "archived"}:
            resolved_at = assigned_at + timedelta(hours=rng.randint(8, 180))
        if status == "archived":
            archived_at = resolved_at + timedelta(days=rng.randint(3, 18))

        reports.append(
            {
                "id": f"synthetic-lifecycle-v2-{index + 1:03d}",
                "description": f"{DEMO_PREFIX} In {area}, {issue}.",
                "category": category,
                "department": config["department"],
                "priority": priority,
                "status": status,
                "location": (latitude, longitude),
                "signals": signals + [area.lower(), "synthetic-demo"],
                "officer": officer,
                "resolution": config["resolutions"][index % len(config["resolutions"])],
                "created_at": created_at,
                "assigned_at": assigned_at,
                "resolved_at": resolved_at,
                "archived_at": archived_at,
            }
        )

    return reports


def firestore_fields(report: dict) -> tuple[dict, dict]:
    assigned = report["assigned_at"] is not None
    resolved = report["resolved_at"] is not None
    archived = report["archived_at"] is not None
    latitude, longitude = report["location"]
    analysis = {
        "category": string_value(report["category"]),
        "department": string_value(report["department"]),
        "priority": string_value(report["priority"]),
        "summary": string_value(
            f"Synthetic {report['category'].lower()} case routed with deterministic civic rules."
        ),
        "confidence": {"integerValue": "90"},
        "matchSignals": strings_value(report["signals"]),
    }
    private_fields = {
        "description": string_value(report["description"]),
        "category": string_value(report["category"]),
        "priority": string_value(report["priority"]),
        "location": location_value(latitude, longitude),
        "imageUrl": null_value(),
        "analysis": {"mapValue": {"fields": analysis}},
        "status": string_value(report["status"]),
        "assignedDepartment": string_value(report["department"] if assigned else ""),
        "assignedOfficer": string_value(report["officer"] if assigned else ""),
        "assignedBy": string_value("synthetic-seeder@civicai.local" if assigned else ""),
        "assignedAt": timestamp_value(report["assigned_at"]) if assigned else null_value(),
        "resolvedBy": string_value(report["officer"] if resolved else ""),
        "resolutionNotes": string_value(report["resolution"] if resolved else ""),
        "afterImageUrl": string_value(""),
        "resolvedAt": timestamp_value(report["resolved_at"]) if resolved else null_value(),
        "archivedAt": timestamp_value(report["archived_at"]) if archived else null_value(),
        "createdAt": timestamp_value(report["created_at"]),
    }
    public_fields = {
        "category": string_value(report["category"]),
        "priority": string_value(report["priority"]),
        "status": string_value(report["status"]),
        "location": location_value(latitude, longitude),
        "matchSignals": strings_value(report["signals"]),
        "createdAt": timestamp_value(report["created_at"]),
    }
    return private_fields, public_fields


def commit_reports(reports: list[dict]) -> None:
    try:
        token = subprocess.run(
            ["gcloud", "auth", "print-access-token"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
    except (FileNotFoundError, subprocess.CalledProcessError) as error:
        raise RuntimeError("An authenticated gcloud session is required for live seeding.") from error

    root = f"projects/{PROJECT_ID}/databases/{DATABASE_ID}/documents"
    writes = []
    for report in reports:
        private_fields, public_fields = firestore_fields(report)
        for collection_name, fields in (("reports", private_fields), ("publicReports", public_fields)):
            writes.append(
                {
                    "update": {
                        "name": f"{root}/{collection_name}/{report['id']}",
                        "fields": fields,
                    },
                    "currentDocument": {"exists": False},
                }
            )

    endpoint = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/"
        f"databases/{DATABASE_ID}/documents:commit"
    )
    request = urllib.request.Request(
        endpoint,
        data=json.dumps({"writes": writes}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Firestore commit failed ({error.code}): {detail}") from error

    if len(result.get("writeResults", [])) != len(writes):
        raise RuntimeError("Firestore returned an incomplete write result.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--allow-live", action="store_true")
    parser.add_argument("--confirm-project")
    args = parser.parse_args()

    if not args.dry_run and not (
        args.allow_live and args.confirm_project == PROJECT_ID
    ):
        parser.error(
            f"live writes require --allow-live --confirm-project={PROJECT_ID}"
        )

    reports = generate_reports()
    print(f"Project: {PROJECT_ID}")
    print(f"Seed: {SEED}")
    print(f"Records: {len(reports)}")
    print(f"Statuses: {dict(Counter(report['status'] for report in reports))}")
    print(f"Categories: {dict(Counter(report['category'] for report in reports))}")
    print(f"Priorities: {dict(Counter(report['priority'] for report in reports))}")

    if args.dry_run:
        print("Dry run complete; no data written.")
        return 0

    commit_reports(reports)
    print(f"Added {len(reports)} private reports and {len(reports)} public summaries.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # noqa: BLE001 - CLI boundary
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
