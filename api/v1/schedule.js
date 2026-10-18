// GET /api/v1/schedule: the Byzantine reckoning over a stretch of time, as a
// list of segments during which it stays the same.
//
// For widgets and other clients that cannot run bdate.js: fetch a schedule
// once or twice a day and show the segment that contains the current time,
// instead of calling /api/v1/date at every hour boundary.
//
// Query parameters: those of /api/v1/date (date, tz, lat, lon, hours), plus
//   span   hours to cover from `date`, 1 to 168 (default 24)
//
// The response is {from, to, lat, lon, segments}. Each segment is {from, to,
// ...} plus the fields /api/v1/date returns at any moment from `from` up to
// `to`, apart from `gregorian` (and `lat`/`lon`, given once). A new segment
// starts whenever those fields change: at each seasonal-hour boundary, at
// local midnight, and when tz changes its offset. Times are ISO-8601 to the
// second; the first segment starts at `date` and the last one ends at or after
// `date` + span. Errors are 400 with {"error": "..."}.

import { byzantine, formatDefault, periodBounds, sunEvents } from "../../js/src/bdate.js";
import { offsetMinutes, parse } from "./date.js";

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const MAX_SPAN = 168;

/** Hours to cover, from the `span` query parameter; throws on bad input. */
export function parseSpan(query) {
  const value = Array.isArray(query.span) ? query.span[0] : query.span;
  if (value === undefined || value === "") return 24;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > MAX_SPAN) throw new Error(`span must be a number of hours from 1 to ${MAX_SPAN}`);
  return n;
}

/**
 * The first moment after `t` (epoch ms) at which the reckoning may change:
 * an hour boundary, local midnight, or a change of UTC offset.
 */
function nextChange(t, { lat, lon, withHours, offsetAt }) {
  const off = offsetAt(t) * 60000;
  const midnight = (Math.floor((t + off) / DAY_MS) + 1) * DAY_MS;
  const candidates = [midnight - offsetAt(midnight - off) * 60000];
  if (withHours) {
    // bdate.js starts from the sunrise and sunset of the day at this
    // longitude (local mean time), so near the poles its answer can also
    // change at local mean midnight.
    const solar = (lon / 15) * HOUR_MS;
    candidates.push((Math.floor((t + solar) / DAY_MS) + 1) * DAY_MS - solar);
    const p = periodBounds(new Date(t), lat, lon);
    if (p) {
      const start = p.start.getTime();
      const len = p.end.getTime() - start;
      let h = Math.min(12, Math.floor(((t - start) / len) * 12) + 1);
      while (h < 12 && Math.ceil(start + (h * len) / 12) <= t) h++;
      // Rounding can put t on the period's last millisecond; step past it.
      candidates.push(Math.max(t + 1, Math.ceil(start + (h * len) / 12)));
    } else {
      // Polar day or night, which can end at a sunrise or sunset of this day.
      for (const d of sunEvents(new Date(t + solar), lat, lon)) if (d) candidates.push(d.getTime());
    }
  }
  let next = Math.min(...candidates.filter((c) => c > t));

  // A change of offset (summer time) moves the start/end times and the date.
  if (offsetAt(next - 1) !== offsetAt(t)) {
    let lo = t;
    let hi = next - 1;
    while (hi - lo > 1) {
      const m = Math.floor((lo + hi) / 2);
      if (offsetAt(m) === offsetAt(t)) lo = m;
      else hi = m;
    }
    next = hi;
  }
  return next;
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "method not allowed" });
  }

  const query = req.query || {};
  let args;
  let span;
  try {
    args = parse(query);
    span = parseSpan(query);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  const { now, lat, lon, withHours, tzOffset } = args;
  const tz = (Array.isArray(query.tz) ? query.tz[0] : query.tz) || null;
  const offsetAt = tz ? (ms) => offsetMinutes(new Date(ms), tz) : () => tzOffset;
  // The same ISO form as `gregorian` in /api/v1/date.
  const iso = (ms) => byzantine(new Date(ms), { withHours: false, tzOffset: offsetAt(ms) }).gregorian;

  const start = now.getTime();
  const until = start + span * HOUR_MS;
  const segments = [];
  let last = null;
  for (let t = start; t < until; ) {
    const next = nextChange(t, { lat, lon, withHours, offsetAt });
    // The middle of the segment is clear of rounding at either end.
    const mid = Math.floor((t + next) / 2);
    const { gregorian, ...b } = byzantine(new Date(mid), { lat, lon, withHours, tzOffset: offsetAt(mid) });
    const fields = { ...b, text: formatDefault(b) };
    const key = JSON.stringify(fields);
    if (last && last.key === key) last.to = next;
    else segments.push((last = { key, from: t, to: next, fields }));
    t = next;
  }

  return res.status(200).json({
    from: iso(start),
    to: iso(last.to),
    lat,
    lon,
    segments: segments.map((s) => ({ from: iso(s.from), to: iso(s.to), ...s.fields })),
  });
}
