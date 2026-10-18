// GET /api/v1/date: the Byzantine reckoning of a moment, as JSON.
//
// Query parameters, all optional (they mirror the bdate command's options):
//   date   ISO-8601 datetime, read as Gregorian (default: now). With a UTC
//          offset, the calendar date is taken at that offset; without one,
//          the time is read in `tz`, or UTC.
//   tz     IANA time zone, e.g. Europe/Athens: the calendar date and the
//          hour start/end times are given at its offset.
//   lat    latitude for sunrise/sunset (default: Constantinople)
//   lon    longitude
//   hours  0 or false to skip the seasonal hour
//
// The response is `bdate --json`'s object plus `text` (the one-line form)
// and the `lat`/`lon` used. Errors are 400 with {"error": "..."}.

import { byzantine, formatDefault, DEFAULT_LAT, DEFAULT_LON } from "../../js/src/bdate.js";

const OFFSET = /T.*(Z|[+-]\d{2}(:?\d{2})?)$/i;

/** Minutes east of UTC for IANA zone `tz` at `date`; throws on an unknown zone. */
export function offsetMinutes(date, tz) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName").value; // "GMT+03:00" or "GMT"
  const m = name.match(/([+-])(\d{1,2}):?(\d{2})?/);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : 0;
}

function number(value, name, limit) {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > limit) throw new Error(`${name} must be a number between -${limit} and ${limit}`);
  return n;
}

/** Turns query parameters into the arguments for byzantine(), plus the `tz` name; throws on bad input. */
export function parse(query) {
  const one = (k) => (Array.isArray(query[k]) ? query[k][0] : query[k]);
  const tz = one("tz") || null;
  if (tz) {
    try {
      offsetMinutes(new Date(), tz);
    } catch {
      throw new Error(`unknown time zone: ${tz}`);
    }
  }

  let now = new Date();
  let tzOffset = 0;
  const date = one("date");
  if (date) {
    // A date alone ("1453-05-29") is midnight; its "-29" is not an offset.
    const iso = date.includes("T") ? date : `${date}T00:00`;
    const offset = iso.match(OFFSET);
    const ms = Date.parse(offset ? iso : `${iso}Z`);
    if (Number.isNaN(ms)) throw new Error(`date is not an ISO-8601 datetime: ${date}`);
    now = new Date(ms);
    if (offset) {
      const [, sign, h, m] = offset[1].match(/([+-])(\d{2}):?(\d{2})?/) || [];
      tzOffset = sign ? (sign === "-" ? -1 : 1) * (Number(h) * 60 + Number(m || 0)) : 0;
    } else if (tz) {
      // Read the wall-clock time in tz: shift by its offset, then by the offset at the result.
      const guess = ms - offsetMinutes(now, tz) * 60000;
      now = new Date(ms - offsetMinutes(new Date(guess), tz) * 60000);
    }
  }
  if (tz) tzOffset = offsetMinutes(now, tz);

  const lat = number(one("lat"), "lat", 90) ?? DEFAULT_LAT;
  const lon = number(one("lon"), "lon", 180) ?? DEFAULT_LON;
  const withHours = !["0", "false"].includes(String(one("hours")).toLowerCase());
  return { now, lat, lon, withHours, tzOffset, tz };
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "method not allowed" });
  }

  let args;
  try {
    args = parse(req.query || {});
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  const { now, lat, lon, withHours, tzOffset } = args;
  const b = byzantine(now, { lat, lon, withHours, tzOffset });
  return res.status(200).json({ ...b, text: formatDefault(b), lat, lon });
}
