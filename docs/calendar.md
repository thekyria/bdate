---
title: The Julian calendar
---

# The Julian calendar

[← Overview](index.md)

## History

Julius Caesar introduced the Julian calendar in 45 BC. It has a 365-day year
with a leap day every fourth year, so the average year is 365.25 days. The
Eastern Roman (Byzantine) Empire used it for its whole history. The Gregorian
reform of 1582 came more than a century after the Empire fell. The Orthodox
churches still use the Julian calendar for the liturgical year.

The true tropical year is about 365.2422 days, so the Julian calendar drifts
about one day every 128 years. The gap with the Gregorian calendar grows by
one day at each Julian 1 March of a century year that is not divisible by 400:

| Julian dates | Add to get Gregorian |
|---|---|
| 1 Mar 1300 – 29 Feb 1400 | 8 days |
| 1 Mar 1400 – 29 Feb 1500 | 9 days |
| 1 Mar 1500 – 29 Feb 1700 | 10 days |
| 1 Mar 1700 – 29 Feb 1800 | 11 days |
| 1 Mar 1800 – 29 Feb 1900 | 12 days |
| 1 Mar 1900 – 29 Feb 2100 | 13 days |

Month lengths are the familiar ones (31, 28/29, 31, 30, …). Only the leap-year
rule is different.

## How bdate computes it

`bdate` converts through the **Julian Day Number** (JDN), which is a continuous
count of days used by astronomers:

1. It takes the civil date of the input instant (in the input's time zone) and
   reads it as a **proleptic Gregorian** date. This is how Python's `datetime`
   works.
2. It converts that date to a JDN (`gregorian_to_jdn`).
3. It converts the JDN back to a Julian-calendar `(year, month, day)`
   (`jdn_to_julian`). Both use the standard integer formulas from
   Richards (*Mapping Time*) and the *Explanatory Supplement to the
   Astronomical Almanac*.

Because the JDN is just a day count, the weekday is also computed from it:
`(JDN + 1) mod 7`, where 0 is Sunday.

## Caveats

* **Input dates are Gregorian.** To check a date that a Byzantine source
  gives in Julian reckoning, first add the gap from the table above. For
  example, 29 May 1453 (Julian) is `1453-06-07` (Gregorian).
* The day changes at **civil midnight**. In the liturgical tradition the day
  started at sunset, and in civil usage it was often counted from sunrise.
  `bdate` does not model either.
* Years before AD 1 use astronomical numbering (year 0 = 1 BC), because the
  JDN formulas need it. In practice this only matters if you pass very old
  dates.
