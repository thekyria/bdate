// Checks the bdate.app schedule handler (api/v1/schedule.js): every segment
// must say what api/v1/date says at the moments it covers.
//
//   node --test tests/api/schedule.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";

import date from "../../api/v1/date.js";
import schedule from "../../api/v1/schedule.js";

/** Calls a handler like Vercel would and returns {status, headers, body}. */
function call(handler, query, method = "GET") {
  const res = {
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; },
    json(body) { return { status: this.code, headers: this.headers, body }; },
  };
  return handler({ method, query }, res);
}

/** /api/v1/date at epoch `ms`, without the fields a segment leaves out. */
function dateAt(ms, query) {
  const { body } = call(date, { ...query, date: new Date(ms).toISOString() });
  const { gregorian, lat, lon, ...rest } = body;
  return rest;
}

const CASES = [
  { name: "Constantinople, UTC", query: { date: "2026-10-18T09:00Z" } },
  { name: "Athens across summer time", query: { date: "2026-03-28T20:00", tz: "Europe/Athens", lat: "37.98", lon: "23.73", span: "48" } },
  { name: "New York in summer", query: { date: "2026-07-01T18:00", tz: "America/New_York", lat: "40.71", lon: "-74", span: "36" } },
  { name: "Sydney for a week", query: { date: "2026-12-20T06:00", tz: "Australia/Sydney", lat: "-33.87", lon: "151.21", span: "168" } },
  { name: "polar day", query: { date: "2026-06-20T12:00Z", lat: "80", lon: "0", span: "48" } },
  { name: "without hours", query: { date: "2026-06-20T12:00", tz: "Asia/Tokyo", hours: "0", span: "48" } },
];

for (const { name, query } of CASES) {
  test(`segments agree with /api/v1/date: ${name}`, () => {
    const { status, body } = call(schedule, query);
    assert.equal(status, 200);
    const segs = body.segments;
    assert.ok(segs.length > 0);
    assert.equal(body.from, segs[0].from);
    assert.equal(body.to, segs.at(-1).to);

    const start = Date.parse(segs[0].from);
    const span = Number(query.span || 24) * 3600000;
    assert.ok(Date.parse(body.to) >= start + span - 1000, "covers the span");
    assert.ok(Date.parse(segs.at(-2)?.to ?? body.from) < start + span, "stops after the span");

    for (let i = 0; i < segs.length; i++) {
      const { from, to, ...fields } = segs[i];
      if (i > 0) {
        assert.equal(Date.parse(from), Date.parse(segs[i - 1].to), `segment ${i} follows on`);
        assert.notDeepEqual(fields, (({ from, to, ...f }) => f)(segs[i - 1]), `segment ${i} differs from the last`);
      }
      // The strings are cut to the second, so step a second in from each end.
      const a = Date.parse(from) + (i === 0 ? 0 : 1000);
      const b = Date.parse(to) - 1000;
      if (b - a < 1000) continue;
      assert.deepEqual(fields, dateAt(a, query), `${from}: start of segment ${i}`);
      assert.deepEqual(fields, dateAt(b, query), `${to}: end of segment ${i}`);
    }
  });
}

test("a day at Constantinople is about 24 hours and a midnight", () => {
  const { body } = call(schedule, { date: "2026-10-18T00:00", tz: "Europe/Istanbul" });
  const hours = new Set(body.segments.map((s) => `${s.seasonal.start} ${s.seasonal.hour}`));
  assert.ok(hours.size >= 24 && hours.size <= 26, `${hours.size} hours`);
  assert.equal(body.segments[0].from, "2026-10-18T00:00:00+03:00");
});

test("without hours, segments are calendar days at tz", () => {
  const { body } = call(schedule, { date: "2026-06-20T12:00", tz: "Asia/Tokyo", hours: "0", span: "48" });
  assert.deepEqual(
    body.segments.map((s) => [s.from, s.to, s.julian_day]),
    [
      ["2026-06-20T12:00:00+09:00", "2026-06-21T00:00:00+09:00", 7],
      ["2026-06-21T00:00:00+09:00", "2026-06-22T00:00:00+09:00", 8],
      ["2026-06-22T00:00:00+09:00", "2026-06-23T00:00:00+09:00", 9],
    ],
  );
});

test("defaults to the next 24 hours from now", () => {
  const { status, headers, body } = call(schedule, {});
  assert.equal(status, 200);
  assert.equal(headers["Access-Control-Allow-Origin"], "*");
  assert.equal(headers["Cache-Control"], "no-store");
  assert.ok(Math.abs(Date.parse(body.from) - Date.now()) < 5000);
  assert.ok(Date.parse(body.to) - Date.parse(body.from) >= 24 * 3600000 - 1000);
  assert.deepEqual([body.lat, body.lon], [41.0086, 28.9802]);
});

test("bad input is a 400 with a message", () => {
  for (const query of [{ span: "0" }, { span: "169" }, { span: "abc" }, { lat: "91" }, { tz: "Mars/Olympus" }]) {
    const { status, body } = call(schedule, query);
    assert.equal(status, 400, JSON.stringify(query));
    assert.equal(typeof body.error, "string");
  }
});

test("only GET and HEAD", () => {
  const { status, headers } = call(schedule, {}, "POST");
  assert.equal(status, 405);
  assert.equal(headers.Allow, "GET, HEAD");
});
