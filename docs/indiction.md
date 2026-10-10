---
title: The indiction
---

# The indiction

[← Overview](index.md)

## History

The **indiction** (ἰνδικτιών) was originally a 15-year cycle of tax
assessment, introduced under Diocletian and Constantine in the late 3rd and
early 4th centuries. Each year was numbered 1 to 15 within the current cycle.
The cycles themselves were **not** numbered.

Justinian made indiction dating compulsory on official documents in 537. For
centuries it was the most common way Byzantines dated anything, often alone:
"in the month of May, of the 1st indiction". The indiction year began on
1 September. This is why the Byzantine year as a whole also began then.

Since the cycles carry no number, an indiction only identifies a year within
a 15-year window. Historians therefore pair it with an era year (AM) or a
regnal year to fix a date exactly.

## How bdate computes it

The usual modern reconstruction ties the indiction directly to the AM year:

```
indiction = AM mod 15      (a remainder of 0 means indiction 15)
```

AM and the indiction both start on 1 September, so they change on the same
day.

This formula matches well-known reference points:

| Event | AM | AM mod 15 | Indiction (sources) |
|---|---|---|---|
| Fall of Constantinople, 1453 | 6961 | 1 | 1 ✔ |
| 1 Sep 2026 – 31 Aug 2027 | 7535 | 5 | 5 |

## Caveats

* Byzantine practice was not always consistent. Scribes sometimes kept the
  old indiction for a while after 1 September, and some areas (in the West, the
  "Bedan" or "Pontifical" indictions) used other start dates such as
  24 September, 25 December or 1 January. `bdate` uses only the Constantinopolitan
  1 September indiction.
