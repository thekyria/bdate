---
title: Anno Mundi
---

# Anno Mundi — the Byzantine world era

[← Overview](index.md)

## History

Byzantine chronographers counted years **from the creation of the world**
(*anno mundi*, ἔτος κόσμου). Several creation eras competed in late antiquity:

| Era | Epoch of creation |
|---|---|
| Alexandrian (Panodoros / Annianos) | 25 March 5493 BC |
| Antiochene | 5969 BC |
| **Byzantine (Constantinopolitan)** | **1 September 5509 BC** |

The Byzantine era first shows up in the 7th century, in the *Chronicon
Paschale* (which actually uses a variant epoch of 5507 BC). By the late 10th
century it was the standard way to date imperial documents, chronicles and
inscriptions. It remained in use in Russia until 1700 and in Greek
ecclesiastical and notarial practice long after 1453.

## The September new year

The Byzantine year began on **1 September**. This new year came from the
fiscal (indiction) cycle, not from the world era itself. In practice:

* 1 September – 31 December of Julian year *Y* fall in AM **Y + 5509**.
* 1 January – 31 August of Julian year *Y* fall in AM **Y + 5508**.

The Church still keeps 1 September as the start of the ecclesiastical year
(*Indiktos*).

## How bdate computes it

```
AM = julian_year + (5509 if julian_month >= 9 else 5508)
```

This is applied to the **Julian** date, not the Gregorian one. Between
1 and 13 September (Gregorian) the modern calendar is already in September,
but the Byzantine new year has not arrived yet.

Examples:

| Julian date | AM year |
|---|---|
| 29 May 1453 | 6961 |
| 31 Aug 2026 | 7534 |
| 1 Sep 2026  | 7535 |

## Caveats

* `bdate` applies the era to any date you give it. This includes dates before
  the era was in common civil use (before about the 7th century), and those
  results are anachronistic.
* Some sources, especially in Rus', started the year in March (the "March
  year"). `bdate` uses only the September year.
