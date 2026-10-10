---
title: Seasonal hours
---

# Seasonal (unequal) hours

[← Overview](index.md)

## History

The Byzantines kept the Roman way of counting hours. **Daylight**, from
sunrise to sunset, was divided into **12 equal hours**. **Night**, from sunset
to sunrise, was divided into another 12. Day and night change length through
the year, so the hours did too. They are called *seasonal*, *unequal* or
*temporal* hours (ὧραι καιρικαί).

At the latitude of Constantinople (about 41° N):

| Date | Daylight | One day-hour | One night-hour |
|---|---|---|---|
| Summer solstice | ≈ 15 h 05 min | ≈ 75 min | ≈ 45 min |
| Equinoxes | ≈ 12 h | ≈ 60 min | ≈ 60 min |
| Winter solstice | ≈ 9 h 15 min | ≈ 46 min | ≈ 74 min |

A few hours had fixed meanings in daily and liturgical life:

* **1st hour**: just after sunrise (the office of *Prime*, Ὥρα Αʹ).
* **3rd hour**: mid-morning (*Terce*).
* **6th hour**: the hour that contains **noon** (*Sext*).
* **9th hour**: mid-afternoon (*None*).
* **12th hour**: the hour ending at sunset.

### Night watches

The night was also split into **four watches** (φυλακαί), a military custom
that also appears in the Gospels. Each watch covers three night hours:

| Watch | Night hours |
|---|---|
| 1st | 1 – 3 |
| 2nd | 4 – 6 |
| 3rd | 7 – 9 |
| 4th | 10 – 12 |

## How bdate computes it

1. **Sunrise and sunset** are calculated for the given latitude and longitude
   with the *Almanac for Computers* (US Naval Observatory, 1990) algorithm.
   It uses the official zenith of 90.833°, which allows for atmospheric
   refraction and the size of the solar disc.
2. `bdate` finds the sunrise/sunset pair **around** the given moment. This is
   the current day if the sun is up, or last sunset to next sunrise if it is
   night.
3. It works out how far through that period the moment is:

   ```
   fraction = (now − period_start) / (period_end − period_start)
   hour     = min(12, floor(fraction × 12) + 1)
   watch    = (hour − 1) // 3 + 1           # night only
   ```

The `--json` output includes the period start and end, so you can see how
long the hours are on that day:

```
$ bdate -d 2026-10-10T12:00+03:00 --json
...
  "seasonal": {
    "period": "day",
    "hour": 6,
    "watch": null,
    "start": "2026-10-10T07:09+03:00",
    "end": "2026-10-10T18:32+03:00"
  }
```

On that day each day-hour is (18:32 − 07:09) / 12 ≈ 57 minutes.

## Location

By default `bdate` uses **Constantinople** (Hagia Sophia, 41.0086° N,
28.9802° E). The algorithm takes east longitude as positive. To use a
different place, pass `--lat/--lon`:

```
bdate --lat 37.98 --lon 23.73    # Athens
bdate --lat 40.64 --lon 22.94    # Thessaloniki
```

## Caveats

* Expect errors of a few minutes. The algorithm ignores elevation, local
  horizon and changes in refraction. Near an hour boundary, the hour shown may
  be off by one.
* At **polar latitudes**, where the sun does not rise or set on some days,
  there are no seasonal hours, and `bdate` leaves the hour out.
* Byzantine timekeepers used sundials, water clocks and the church office, so
  the hours they actually observed were never this precise.
