---
title: Usage
---

# Usage

[← Overview](index.md)

## Install

`bdate` needs only the standard library and Python 3.9 or later.

```
uv tool install .           # install the `bdate` command globally
uvx --from . bdate          # run without installing
pip install .               # plain pip also works
```

## Command line

| Option | Effect |
|---|---|
| *(none)* | Convert the current moment, local time |
| `-u`, `--utc` | Use UTC instead of local time |
| `-d ISO`, `--date ISO` | Convert an ISO-8601 datetime instead of now (read as **Gregorian**) |
| `--lat`, `--lon` | Location used for sunrise/sunset (default: Constantinople) |
| `--no-hours` | Skip the seasonal-hour calculation |
| `--json` | Print machine-readable JSON |
| `-V`, `--version` | Print the version |

If you pass a datetime with no UTC offset to `-d`, `bdate` uses the local time
zone, or UTC if you also give `-u`.

## Reading the output

```
Tritē, 29 Maios 6961 AM (Julian 1453-05-29), indiction 1, 2nd hour of the day
└─┬─┘  └────┬────┘ └─┬─┘  └────────┬──────┘  └────┬────┘  └────────┬────────┘
weekday  Julian day  era  numeric Julian date  indiction    seasonal hour
         + month     year
```

At night the hour part reads, for example, `5th hour of the night (2nd watch)`.

## JSON fields

| Field | Meaning |
|---|---|
| `gregorian` | The input instant, ISO-8601 |
| `julian_year`, `julian_month`, `julian_day` | The Julian calendar date |
| `month_name`, `weekday` | Romanised Byzantine names |
| `anno_mundi` | Byzantine world-era year |
| `indiction` | 1–15 |
| `seasonal` | `null`, or `{period, hour, watch, start, end}` |
