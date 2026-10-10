---
title: Byzantine time reckoning
---

# bdate — Byzantine time reckoning

`bdate` is `date(1)` for someone living in Constantinople a thousand years ago.

```
$ bdate
Sabbaton, 27 Septembrios 7535 AM (Julian 2026-09-27), indiction 5, 6th hour of the day
```

This line has five parts. Each comes from a separate Byzantine convention, and
`bdate` stacks them in this order:

| # | Layer | What it answers | Page |
|---|---|---|---|
| 1 | Julian calendar | Which day is it? | [The Julian calendar](calendar.md) |
| 2 | Anno Mundi era | Which year is it? | [Anno Mundi](anno-mundi.md) |
| 3 | Indiction | Where are we in the 15-year cycle? | [The indiction](indiction.md) |
| 4 | Greek names | What are the day and month called? | [Days and months](names.md) |
| 5 | Seasonal hours | What hour is it? | [Seasonal hours](hours.md) |

You can read these pages in any order. Each page explains the historical
convention, gives the formula `bdate` uses, and works through an example you
can reproduce.

## How the layers fit together

```
civil instant (your clock, any time zone)
        │
        ├──► Julian Day Number ──► Julian calendar date ──► month name
        │                     │                       │
        │                     └──► weekday name        └──► Anno Mundi year ──► indiction
        │
        └──► sunrise / sunset at (lat, lon) ──► seasonal hour (+ night watch)
```

The date layers use whole days only. The hour layer is the only part that
depends on where you are. It defaults to Constantinople (Hagia Sophia,
41.0086° N, 28.9802° E).

## A worked example: the fall of the City

Constantinople fell on **Tuesday, 29 May 1453** in the Julian calendar, which
is how contemporary sources record it. `bdate` reads its input as a modern
(proleptic Gregorian) date, so you enter the Gregorian equivalent, which is
nine days later:

```
$ bdate -d 1453-06-07T06:00+02:00
Tritē, 29 Maios 6961 AM (Julian 1453-05-29), indiction 1, 2nd hour of the day
```

Each part checks out against the sources:

* **Tritē** (Tuesday) matches the weekday the chroniclers give.
* **6961 AM** is the year the Byzantine sources use.
* **Indiction 1** matches the documented indiction for that year.
* **2nd hour of the day** fits: the final assault was pressed in the early morning.

## Further reading

* V. Grumel, *La chronologie* (Traité d'études byzantines I), Paris 1958.
* *The Oxford Dictionary of Byzantium*, entries "Chronology", "Era", "Indiction", "Hours".
* E. J. Bickerman, *Chronology of the Ancient World*, 2nd ed., 1980.
