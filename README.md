# bdate

`date(1)`, but the way a Byzantine would have reckoned it.

```
$ bdate
Kyriakē, 21 Septembrios 7535 AM (Julian 2026-09-21), indiction 5, 6th hour of the day
```

## What it computes

| Layer | Rule |
|---|---|
| Calendar | Julian (no Gregorian reform) |
| Year | Anno Mundi, from 1 Sept 5509 BC; year rolls over on **1 September** |
| Indiction | 15-year cycle; `AM mod 15` (0 → 15) |
| Weekday / month | Byzantine Greek names (Kyriakē, Deutera…; Ianouarios…) |
| Hour | Seasonal/unequal hours: daylight ÷ 12, night ÷ 12, night watches ÷ 4 |

Seasonal hours need sunrise/sunset, so the default location is Constantinople.
Use `--lat/--lon` for elsewhere. The solar algorithm is approximate (a few minutes).

## Usage

```
bdate                       # now, local time
bdate -u                    # now, UTC
bdate -d 1453-05-29T12:00+02:00
bdate --lat 37.98 --lon 23.73   # Athens
bdate --no-hours            # skip sunrise/sunset
bdate --json
```

## Install / run

Stdlib only, Python ≥ 3.9. Packaged with [uv](https://docs.astral.sh/uv/).

```
uv tool install .           # install the `bdate` command globally
uvx --from . bdate          # run without installing
uv run bdate                # run from a checkout
uv run python -m bdate      # same, as a module
pip install .   && bdate    # plain pip still works
```

Tests: `uv run pytest`

Lint/format: `uv run ruff check .` and `uv run ruff format .`

Build sdist/wheel: `uv build`

## Caveats (honest ones)

- The indiction formula is the conventional modern reconstruction. Sources
  agree on well-known anchors (e.g. AM 6961 = indiction 1) but Byzantine
  practice was not always consistent.
- Before ~7th century the AM era was not the dominant civil reckoning; this tool
  applies it anachronistically to any date you give it.
- Weekday names follow the ecclesiastical convention. Pre-Christian/early
  planetary names are not supported.
- Sunrise/sunset ignore refraction variability and elevation; polar latitudes
  return no seasonal hour.
