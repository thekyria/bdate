// Checks the bdate.app API handler (api/v1/date.js) against the fixtures the
// Python package generates, plus its time-zone handling and errors.
//
//   node --test tests/api/date.test.mjs

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import handler from "../../api/v1/date.js";

const cases = JSON.parse(readFileSync(new URL("../../fixtures/cases.json", import.meta.url), "utf8"));

/** Calls the handler like Vercel would and returns {status, headers, body}. */
function call(query, method = "GET") {
  const res = {
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; },
    json(body) { return { status: this.code, headers: this.headers, body }; },
  };
  return handler({ method, query }, res);
}

for (const { input, expected, formatted } of cases) {
  test(`fixture ${input.date} @ ${input.lat},${input.lon}`, () => {
    const { status, body } = call({
      date: input.date, lat: String(input.lat), lon: String(input.lon), hours: String(input.with_hours),
    });
    assert.equal(status, 200);
    assert.deepEqual(body, { ...expected, text: formatted, lat: input.lat, lon: input.lon });
  });
}

test("defaults to now, at Constantinople, in UTC", () => {
  const { status, headers, body } = call({});
  assert.equal(status, 200);
  assert.equal(headers["Access-Control-Allow-Origin"], "*");
  assert.equal(headers["Cache-Control"], "no-store");
  assert.match(body.gregorian, /\+00:00$/);
  assert.ok(Math.abs(Date.parse(body.gregorian) - Date.now()) < 5000);
  assert.deepEqual([body.lat, body.lon], [41.0086, 28.9802]);
});

test("a date without an offset is read in tz", () => {
  const { body } = call({ date: "2026-07-01T09:30", tz: "Europe/Athens" });
  assert.equal(body.gregorian, "2026-07-01T09:30:00+03:00");
  assert.equal(call({ date: "2026-01-15", tz: "Europe/Athens" }).body.gregorian, "2026-01-15T00:00:00+02:00");
  assert.equal(call({ date: "2026-07-01T09:30" }).body.gregorian, "2026-07-01T09:30:00+00:00");
});

test("tz moves a date with an offset to tz's offset", () => {
  const { body } = call({ date: "2026-07-01T23:30+00:00", tz: "Europe/Athens" });
  assert.equal(body.gregorian, "2026-07-02T02:30:00+03:00");
  assert.equal(body.julian_day, 19); // Gregorian 2 July is Julian 19 June
});

test("bad input is a 400 with a message", () => {
  for (const query of [{ lat: "91" }, { lon: "abc" }, { tz: "Mars/Olympus" }, { date: "yesterday" }]) {
    const { status, body } = call(query);
    assert.equal(status, 400, JSON.stringify(query));
    assert.equal(typeof body.error, "string");
  }
});

test("only GET and HEAD", () => {
  const { status, headers } = call({}, "POST");
  assert.equal(status, 405);
  assert.equal(headers.Allow, "GET, HEAD");
});
