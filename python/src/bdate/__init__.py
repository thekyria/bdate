"""bdate - print the date and time the way a Byzantine would have reckoned it.

Layers implemented:
  * Julian calendar date (the Byzantines never used the Gregorian reform)
  * Anno Mundi (Byzantine era) year, starting 1 September 5509 BC
  * 15-year indiction cycle
  * Greek weekday / month names
  * Seasonal (unequal) hours: daylight and night each split into 12 hours,
    plus the 4 night watches. Sunrise/sunset are computed with a simple
    almanac algorithm, so treat them as approximate (+/- a few minutes).

Stdlib only. Python >= 3.9.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta, timezone

__version__ = "0.1.0"

# Constantinople (Hagia Sophia)
DEFAULT_LAT = 41.0086
DEFAULT_LON = 28.9802

WEEKDAYS = ["Kyriakē", "Deutera", "Tritē", "Tetartē", "Pemptē", "Paraskeuē", "Sabbaton"]
MONTHS = [
    "Ianouarios",
    "Phebrouarios",
    "Martios",
    "Aprilios",
    "Maios",
    "Iounios",
    "Ioulios",
    "Augoustos",
    "Septembrios",
    "Oktōbrios",
    "Noembrios",
    "Dekembrios",
]


# --------------------------------------------------------------------------- #
# Calendar arithmetic
# --------------------------------------------------------------------------- #


def gregorian_to_jdn(y: int, m: int, d: int) -> int:
    """Julian Day Number for a proleptic Gregorian calendar date."""
    a = (14 - m) // 12
    yy = y + 4800 - a
    mm = m + 12 * a - 3
    return d + (153 * mm + 2) // 5 + 365 * yy + yy // 4 - yy // 100 + yy // 400 - 32045


def jdn_to_julian(jdn: int) -> tuple[int, int, int]:
    """(year, month, day) in the Julian calendar for a Julian Day Number."""
    c = jdn + 32082
    d = (4 * c + 3) // 1461
    e = c - (1461 * d) // 4
    m = (5 * e + 2) // 153
    day = e - (153 * m + 2) // 5 + 1
    month = m + 3 - 12 * (m // 10)
    year = d - 4800 + m // 10
    return year, month, day


def gregorian_to_julian(y: int, m: int, d: int) -> tuple[int, int, int]:
    return jdn_to_julian(gregorian_to_jdn(y, m, d))


def anno_mundi(julian_year: int, julian_month: int) -> int:
    """Byzantine Anno Mundi year. The year begins on 1 September."""
    return julian_year + (5509 if julian_month >= 9 else 5508)


def indiction(am_year: int) -> int:
    """Position (1-15) in the 15-year indiction cycle.

    Convention: indiction = AM mod 15, with 0 -> 15. This matches the
    documented data points, e.g. the fall of the City (AM 6961) = indiction 1.
    """
    r = am_year % 15
    return 15 if r == 0 else r


def weekday_index(jdn: int) -> int:
    """0 = Sunday (Kyriakē) ... 6 = Saturday (Sabbaton)."""
    return (jdn + 1) % 7


# --------------------------------------------------------------------------- #
# Sunrise / sunset (Almanac for Computers, 1990 algorithm; approximate)
# --------------------------------------------------------------------------- #

ZENITH_OFFICIAL = 90.833


def _sun_event_utc(d: date, lat: float, lon: float, rising: bool) -> float | None:
    """Return the UTC hour (0-24 float) of sunrise/sunset, or None if the sun
    never rises/sets on that date at that latitude."""
    n = d.timetuple().tm_yday
    lng_hour = lon / 15.0
    t = n + ((6 if rising else 18) - lng_hour) / 24.0

    M = 0.9856 * t - 3.289
    L = (
        M + 1.916 * math.sin(math.radians(M)) + 0.020 * math.sin(math.radians(2 * M)) + 282.634
    ) % 360.0

    RA = math.degrees(math.atan(0.91764 * math.tan(math.radians(L)))) % 360.0
    RA += (math.floor(L / 90) * 90) - (math.floor(RA / 90) * 90)
    RA /= 15.0

    sin_dec = 0.39782 * math.sin(math.radians(L))
    cos_dec = math.cos(math.asin(sin_dec))

    cos_h = (math.cos(math.radians(ZENITH_OFFICIAL)) - sin_dec * math.sin(math.radians(lat))) / (
        cos_dec * math.cos(math.radians(lat))
    )
    if cos_h > 1 or cos_h < -1:
        return None

    H = math.degrees(math.acos(cos_h))
    if rising:
        H = 360.0 - H
    H /= 15.0

    T = H + RA - 0.06571 * t - 6.622
    return (T - lng_hour) % 24.0


def sun_events(d: date, lat: float, lon: float) -> tuple[datetime | None, datetime | None]:
    """(sunrise, sunset) as tz-aware UTC datetimes for calendar date d."""

    def to_dt(h: float | None) -> datetime | None:
        if h is None:
            return None
        base = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
        return base + timedelta(hours=h)

    return to_dt(_sun_event_utc(d, lat, lon, True)), to_dt(_sun_event_utc(d, lat, lon, False))


@dataclass
class SeasonalHour:
    period: str  # "day" or "night"
    hour: int  # 1..12
    watch: int | None  # 1..4 for night, None for day
    start: str  # ISO of the period start (sunrise or sunset)
    end: str  # ISO of the period end


def seasonal_hour(now: datetime, lat: float, lon: float) -> SeasonalHour | None:
    """Compute the unequal hour at `now` (tz-aware). None in polar day/night."""
    now_utc = now.astimezone(timezone.utc)
    today = now_utc.date()
    rise, sset = sun_events(today, lat, lon)
    if rise is None or sset is None:
        return None

    # The almanac gives events for the UTC calendar date; for eastern
    # longitudes the "sunset" may belong to the previous local day etc.
    # We normalise by picking the sunrise/sunset pair that brackets `now`.
    if sset < rise:  # sunset computed is for before this sunrise; shift it a day
        sset += timedelta(days=1)

    if rise <= now_utc < sset:
        start, end, period = rise, sset, "day"
    elif now_utc >= sset:
        nrise, _ = sun_events(today + timedelta(days=1), lat, lon)
        if nrise is None:
            return None
        if nrise < sset:
            nrise += timedelta(days=1)
        start, end, period = sset, nrise, "night"
    else:  # before sunrise
        _, pset = sun_events(today - timedelta(days=1), lat, lon)
        if pset is None:
            return None
        if pset > rise:
            pset -= timedelta(days=1)
        start, end, period = pset, rise, "night"

    frac = (now_utc - start) / (end - start)
    hour = min(12, int(frac * 12) + 1)
    watch = None if period == "day" else (hour - 1) // 3 + 1
    tz = now.tzinfo or timezone.utc
    return SeasonalHour(
        period,
        hour,
        watch,
        start.astimezone(tz).isoformat(timespec="minutes"),
        end.astimezone(tz).isoformat(timespec="minutes"),
    )


# --------------------------------------------------------------------------- #
# Assembly
# --------------------------------------------------------------------------- #


@dataclass
class ByzantineDate:
    gregorian: str
    julian_year: int
    julian_month: int
    julian_day: int
    month_name: str
    weekday: str
    anno_mundi: int
    indiction: int
    seasonal: SeasonalHour | None


def byzantine(now: datetime, lat: float, lon: float, with_hours: bool = True) -> ByzantineDate:
    jdn = gregorian_to_jdn(now.year, now.month, now.day)
    jy, jm, jd = jdn_to_julian(jdn)
    am = anno_mundi(jy, jm)
    return ByzantineDate(
        gregorian=now.isoformat(timespec="seconds"),
        julian_year=jy,
        julian_month=jm,
        julian_day=jd,
        month_name=MONTHS[jm - 1],
        weekday=WEEKDAYS[weekday_index(jdn)],
        anno_mundi=am,
        indiction=indiction(am),
        seasonal=seasonal_hour(now, lat, lon) if with_hours else None,
    )


def _ordinal(n: int) -> str:
    if 10 <= n % 100 <= 20:
        suf = "th"
    else:
        suf = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suf}"


def format_default(b: ByzantineDate) -> str:
    line = (
        f"{b.weekday}, {b.julian_day} {b.month_name} {b.anno_mundi} AM"
        f" (Julian {b.julian_year}-{b.julian_month:02d}-{b.julian_day:02d}),"
        f" indiction {b.indiction}"
    )
    if b.seasonal:
        s = b.seasonal
        if s.period == "day":
            line += f", {_ordinal(s.hour)} hour of the day"
        else:
            line += f", {_ordinal(s.hour)} hour of the night ({_ordinal(s.watch)} watch)"
    return line


def parse_args(argv) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="bdate",
        description="Like date(1), but in Byzantine reckoning.",
        epilog="Seasonal hours default to Constantinople; pass --lat/--lon for elsewhere.",
    )
    p.add_argument(
        "-d",
        "--date",
        metavar="ISO",
        help="ISO-8601 datetime to convert instead of now (e.g. 1453-05-29T12:00+02:00)",
    )
    p.add_argument("-u", "--utc", action="store_true", help="use UTC instead of local time")
    p.add_argument("--lat", type=float, default=DEFAULT_LAT, help="latitude for sunrise/sunset")
    p.add_argument("--lon", type=float, default=DEFAULT_LON, help="longitude (east positive)")
    p.add_argument("--no-hours", action="store_true", help="skip seasonal hour computation")
    p.add_argument("--json", action="store_true", help="machine-readable output")
    p.add_argument("-V", "--version", action="version", version=f"%(prog)s {__version__}")
    return p.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)

    if args.date:
        try:
            now = datetime.fromisoformat(args.date)
        except ValueError:
            print(f"bdate: invalid date: {args.date!r}", file=sys.stderr)
            return 1
        if now.tzinfo is None:
            now = now.replace(
                tzinfo=timezone.utc if args.utc else datetime.now().astimezone().tzinfo
            )
    else:
        now = datetime.now(timezone.utc) if args.utc else datetime.now().astimezone()

    if args.utc:
        now = now.astimezone(timezone.utc)

    b = byzantine(now, args.lat, args.lon, with_hours=not args.no_hours)

    if args.json:
        print(json.dumps(asdict(b), ensure_ascii=False, indent=2))
    else:
        print(format_default(b))
    return 0
