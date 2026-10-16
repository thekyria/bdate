/**
 * bdate - the date and time the way a Byzantine would have reckoned it.
 *
 * JavaScript port of the Python package in ../python. Same layers, same
 * formulas, same output shape as `bdate --json`:
 *   * Julian calendar date
 *   * Anno Mundi year, starting 1 September 5509 BC
 *   * 15-year indiction cycle
 *   * Greek weekday / month names
 *   * Seasonal (unequal) hours and night watches; sunrise/sunset are
 *     approximate (+/- a few minutes)
 *
 * No dependencies. Runs in browsers and Node >= 18.
 */

export const VERSION = "0.1.0";

// Constantinople (Hagia Sophia)
export const DEFAULT_LAT = 41.0086;
export const DEFAULT_LON = 28.9802;

export const WEEKDAYS = ["Kyriakē", "Deutera", "Tritē", "Tetartē", "Pemptē", "Paraskeuē", "Sabbaton"];
export const MONTHS = [
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
];

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const UNIX_EPOCH_JDN = 2440588; // 1970-01-01

// Python-style floor division and modulo (result takes the divisor's sign).
const div = (a, b) => Math.floor(a / b);
const mod = (a, b) => ((a % b) + b) % b;
const rad = (deg) => (deg * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

// --------------------------------------------------------------------------- //
// Calendar arithmetic
// --------------------------------------------------------------------------- //

/** Julian Day Number for a proleptic Gregorian calendar date. */
export function gregorianToJdn(y, m, d) {
  const a = div(14 - m, 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + div(153 * mm + 2, 5) + 365 * yy + div(yy, 4) - div(yy, 100) + div(yy, 400) - 32045;
}

/** [year, month, day] in the Julian calendar for a Julian Day Number. */
export function jdnToJulian(jdn) {
  const c = jdn + 32082;
  const d = div(4 * c + 3, 1461);
  const e = c - div(1461 * d, 4);
  const m = div(5 * e + 2, 153);
  const day = e - div(153 * m + 2, 5) + 1;
  const month = m + 3 - 12 * div(m, 10);
  const year = d - 4800 + div(m, 10);
  return [year, month, day];
}

export function gregorianToJulian(y, m, d) {
  return jdnToJulian(gregorianToJdn(y, m, d));
}

/** Byzantine Anno Mundi year. The year begins on 1 September. */
export function annoMundi(julianYear, julianMonth) {
  return julianYear + (julianMonth >= 9 ? 5509 : 5508);
}

/** Position (1-15) in the 15-year indiction cycle: AM mod 15, with 0 -> 15. */
export function indiction(amYear) {
  const r = mod(amYear, 15);
  return r === 0 ? 15 : r;
}

/** 0 = Sunday (Kyriakē) ... 6 = Saturday (Sabbaton). */
export function weekdayIndex(jdn) {
  return mod(jdn + 1, 7);
}

/** Proleptic Gregorian [year, month, day] for a Julian Day Number. */
function jdnToGregorian(jdn) {
  const a = jdn + 32044;
  const b = div(4 * a + 3, 146097);
  const c = a - div(146097 * b, 4);
  const d = div(4 * c + 3, 1461);
  const e = c - div(1461 * d, 4);
  const m = div(5 * e + 2, 153);
  return [100 * b + d - 4800 + div(m, 10), m + 3 - 12 * div(m, 10), e - div(153 * m + 2, 5) + 1];
}

// --------------------------------------------------------------------------- //
// Sunrise / sunset (Almanac for Computers, 1990 algorithm; approximate)
// --------------------------------------------------------------------------- //

const ZENITH_OFFICIAL = 90.833;

/**
 * UTC hour (0-24 float) of sunrise/sunset on the UTC date with Julian Day
 * Number `jdn`, or null if the sun never rises/sets that day.
 */
function sunEventUtc(jdn, lat, lon, rising) {
  const [y] = jdnToGregorian(jdn);
  const n = jdn - gregorianToJdn(y, 1, 1) + 1;
  const lngHour = lon / 15.0;
  const t = n + ((rising ? 6 : 18) - lngHour) / 24.0;

  const M = 0.9856 * t - 3.289;
  const L = mod(M + 1.916 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 282.634, 360.0);

  let RA = mod(deg(Math.atan(0.91764 * Math.tan(rad(L)))), 360.0);
  RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90;
  RA /= 15.0;

  const sinDec = 0.39782 * Math.sin(rad(L));
  const cosDec = Math.cos(Math.asin(sinDec));

  const cosH = (Math.cos(rad(ZENITH_OFFICIAL)) - sinDec * Math.sin(rad(lat))) / (cosDec * Math.cos(rad(lat)));
  if (cosH > 1 || cosH < -1) return null;

  let H = deg(Math.acos(cosH));
  if (rising) H = 360.0 - H;
  H /= 15.0;

  const T = H + RA - 0.06571 * t - 6.622;
  return mod(T - lngHour, 24.0);
}

/**
 * [sunrise, sunset] as epoch milliseconds (or null) for the UTC calendar date
 * with Julian Day Number `jdn`.
 */
function sunEventsMs(jdn, lat, lon) {
  const base = (jdn - UNIX_EPOCH_JDN) * DAY_MS;
  const toMs = (h) => (h === null ? null : base + h * HOUR_MS);
  return [toMs(sunEventUtc(jdn, lat, lon, true)), toMs(sunEventUtc(jdn, lat, lon, false))];
}

/** [sunrise, sunset] as Date objects (or null) for the UTC date of `day`. */
export function sunEvents(day, lat, lon) {
  const jdn = div(day.getTime(), DAY_MS) + UNIX_EPOCH_JDN;
  return sunEventsMs(jdn, lat, lon).map((ms) => (ms === null ? null : new Date(ms)));
}

// --------------------------------------------------------------------------- //
// Formatting helpers (mirror Python's datetime.isoformat)
// --------------------------------------------------------------------------- //

const pad = (n, w = 2) => String(n).padStart(w, "0");

function formatOffset(minutes) {
  const sign = minutes < 0 ? "-" : "+";
  const a = Math.abs(minutes);
  return `${sign}${pad(div(a, 60))}:${pad(a % 60)}`;
}

/** ISO-8601 string of epoch `ms` at fixed UTC offset `tzOffset` (minutes east). */
function isoAt(ms, tzOffset, withSeconds) {
  const local = Math.floor(ms / 1000) * 1000 + tzOffset * 60000;
  const jdn = div(local, DAY_MS) + UNIX_EPOCH_JDN;
  const [y, m, d] = jdnToGregorian(jdn);
  const secs = div(mod(local, DAY_MS), 1000);
  let time = `${pad(div(secs, 3600))}:${pad(div(secs, 60) % 60)}`;
  if (withSeconds) time += `:${pad(secs % 60)}`;
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}T${time}${formatOffset(tzOffset)}`;
}

// --------------------------------------------------------------------------- //
// Seasonal hours
// --------------------------------------------------------------------------- //

/**
 * The unequal hour at `now`, or null in polar day/night.
 *
 * Returns {period: "day"|"night", hour: 1..12, watch: 1..4|null, start, end}
 * where start/end are ISO strings (minute precision) at offset `tzOffset`.
 */
export function seasonalHour(now, lat, lon, tzOffset = -now.getTimezoneOffset()) {
  const nowMs = now.getTime();
  const today = div(nowMs, DAY_MS) + UNIX_EPOCH_JDN;
  let [rise, sset] = sunEventsMs(today, lat, lon);
  if (rise === null || sset === null) return null;

  // The almanac gives events for the UTC calendar date; pick the
  // sunrise/sunset pair that brackets `now`.
  if (sset < rise) sset += DAY_MS;

  let start, end, period;
  if (rise <= nowMs && nowMs < sset) {
    [start, end, period] = [rise, sset, "day"];
  } else if (nowMs >= sset) {
    let [nrise] = sunEventsMs(today + 1, lat, lon);
    if (nrise === null) return null;
    if (nrise < sset) nrise += DAY_MS;
    [start, end, period] = [sset, nrise, "night"];
  } else {
    let [, pset] = sunEventsMs(today - 1, lat, lon);
    if (pset === null) return null;
    if (pset > rise) pset -= DAY_MS;
    [start, end, period] = [pset, rise, "night"];
  }

  const frac = (nowMs - start) / (end - start);
  const hour = Math.min(12, Math.floor(frac * 12) + 1);
  const watch = period === "day" ? null : div(hour - 1, 3) + 1;
  return {
    period,
    hour,
    watch,
    start: isoAt(start, tzOffset, false),
    end: isoAt(end, tzOffset, false),
  };
}

// --------------------------------------------------------------------------- //
// Assembly
// --------------------------------------------------------------------------- //

/**
 * Byzantine reckoning of `now` (a Date). The calendar date is taken at
 * `tzOffset` minutes east of UTC (default: the runtime's local offset).
 *
 * Returns the same object shape as `bdate --json`.
 */
export function byzantine(
  now = new Date(),
  { lat = DEFAULT_LAT, lon = DEFAULT_LON, withHours = true, tzOffset = -now.getTimezoneOffset() } = {},
) {
  const local = now.getTime() + tzOffset * 60000;
  const jdn = div(local, DAY_MS) + UNIX_EPOCH_JDN;
  const [jy, jm, jd] = jdnToJulian(jdn);
  const am = annoMundi(jy, jm);
  return {
    gregorian: isoAt(now.getTime(), tzOffset, true),
    julian_year: jy,
    julian_month: jm,
    julian_day: jd,
    month_name: MONTHS[jm - 1],
    weekday: WEEKDAYS[weekdayIndex(jdn)],
    anno_mundi: am,
    indiction: indiction(am),
    seasonal: withHours ? seasonalHour(now, lat, lon, tzOffset) : null,
  };
}

export function ordinal(n) {
  const suf = n % 100 >= 10 && n % 100 <= 20 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${suf}`;
}

/** One-line rendering, identical to the `bdate` command's default output. */
export function formatDefault(b) {
  let line =
    `${b.weekday}, ${b.julian_day} ${b.month_name} ${b.anno_mundi} AM` +
    ` (Julian ${b.julian_year}-${pad(b.julian_month)}-${pad(b.julian_day)}),` +
    ` indiction ${b.indiction}`;
  const s = b.seasonal;
  if (s) {
    line +=
      s.period === "day"
        ? `, ${ordinal(s.hour)} hour of the day`
        : `, ${ordinal(s.hour)} hour of the night (${ordinal(s.watch)} watch)`;
  }
  return line;
}
