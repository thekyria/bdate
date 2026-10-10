---
title: Days and months
---

# Days and months

[← Overview](index.md)

`bdate` prints weekday and month names in a romanised form of Byzantine Greek.

## Weekdays

The Christian Greek week counts the days from the Lord's Day. Only Friday
(Preparation) and Saturday (the Sabbath) have their own names:

| bdate | Greek | Meaning | English |
|---|---|---|---|
| Kyriakē | Κυριακή | the Lord's (day) | Sunday |
| Deutera | Δευτέρα | second | Monday |
| Tritē | Τρίτη | third | Tuesday |
| Tetartē | Τετάρτη | fourth | Wednesday |
| Pemptē | Πέμπτη | fifth | Thursday |
| Paraskeuē | Παρασκευή | preparation (for the Sabbath) | Friday |
| Sabbaton | Σάββατον | Sabbath | Saturday |

These are the church names. Modern Greek still uses them. The earlier
pagan planetary names ("day of the Sun", "day of the Moon", …) were dropped
from Christian usage, and `bdate` does not support them.

## Months

The Byzantines took over the Latin month names in Greek form:

| bdate | Greek | Month |
|---|---|---|
| Ianouarios | Ἰανουάριος | January |
| Phebrouarios | Φεβρουάριος | February |
| Martios | Μάρτιος | March |
| Aprilios | Ἀπρίλιος | April |
| Maios | Μάϊος | May |
| Iounios | Ἰούνιος | June |
| Ioulios | Ἰούλιος | July |
| Augoustos | Αὔγουστος | August |
| Septembrios | Σεπτέμβριος | September |
| Oktōbrios | Ὀκτώβριος | October |
| Noembrios | Νοέμβριος | November |
| Dekembrios | Δεκέμβριος | December |

The official year started in September, so Byzantine lists (for example the
Menologion) usually begin with Septembrios. `bdate` follows the Julian
calendar month numbering (1 = January) internally. Only the year number changes
in September.

## Romanisation

The spellings are a plain transliteration with macrons for η (ē) and ω (ō).
They have no diacritics beyond those, so they display in any terminal.
