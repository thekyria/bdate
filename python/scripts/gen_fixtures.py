"""Regenerate ../fixtures/cases.json from the Python implementation.

The JS port is tested against this file, so the two implementations stay in
step. Run after changing the reckoning logic:

    uv run python scripts/gen_fixtures.py
"""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import datetime
from pathlib import Path

import bdate

OUT = Path(__file__).resolve().parents[2] / "fixtures" / "cases.json"

ATHENS = (37.98, 23.73)
CBL = (bdate.DEFAULT_LAT, bdate.DEFAULT_LON)

# (ISO datetime, (lat, lon), with_hours)
INPUTS = [
    # Calendar anchors
    ("1453-06-07T12:00+00:00", CBL, False),
    ("1453-06-07T12:00+03:00", CBL, True),
    ("1582-10-15T09:00+01:00", CBL, False),
    ("0033-04-03T15:00+02:00", CBL, True),  # two-digit year
    ("0800-12-25T10:00+02:00", CBL, True),
    # Year rollover on 1 September (Julian) = 14 September (Gregorian, 21st c.)
    ("2026-09-13T12:00+03:00", CBL, True),
    ("2026-09-14T12:00+03:00", CBL, True),
    # Indiction wraps to 15
    ("2024-09-14T12:00+03:00", CBL, True),
    # Seasonal hours around the day in Constantinople
    ("2026-06-21T03:00+03:00", CBL, True),  # before sunrise
    ("2026-06-21T06:00+03:00", CBL, True),
    ("2026-06-21T13:00+03:00", CBL, True),
    ("2026-06-21T20:30+03:00", CBL, True),
    ("2026-06-21T23:59+03:00", CBL, True),
    ("2026-06-22T00:00+03:00", CBL, True),  # local midnight crosses UTC date
    ("2026-12-21T12:00+03:00", CBL, True),
    ("2026-12-21T22:00+03:00", CBL, True),
    ("2026-03-20T00:00+00:00", CBL, True),
    # Elsewhere
    ("2026-10-16T12:00+03:00", ATHENS, True),
    ("2026-01-01T00:30+00:00", (51.48, 0.0), True),  # Greenwich
    ("2026-07-04T08:00-04:00", (40.71, -74.01), True),  # New York
    ("2026-07-04T23:00-04:00", (40.71, -74.01), True),
    ("2026-06-21T12:00+10:00", (-33.87, 151.21), True),  # Sydney (southern winter)
    ("2026-12-21T12:00+00:00", (80.0, 0.0), True),  # polar night
    ("2026-06-21T12:00+00:00", (80.0, 0.0), True),  # midnight sun
]


def build() -> list[dict]:
    cases = []
    for iso, (lat, lon), with_hours in INPUTS:
        b = bdate.byzantine(datetime.fromisoformat(iso), lat, lon, with_hours=with_hours)
        cases.append(
            {
                "input": {"date": iso, "lat": lat, "lon": lon, "with_hours": with_hours},
                "expected": asdict(b),
                "formatted": bdate.format_default(b),
            }
        )
    return cases


def render() -> str:
    return json.dumps(build(), ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(render(), encoding="utf-8")
    print(f"wrote {OUT}")
