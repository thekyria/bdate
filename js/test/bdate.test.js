import assert from "node:assert/strict";
import { test } from "node:test";

import {
  WEEKDAYS,
  annoMundi,
  byzantine,
  gregorianToJdn,
  gregorianToJulian,
  indiction,
  ordinal,
  periodBounds,
  seasonalHour,
  sunEvents,
  weekdayIndex,
} from "../src/bdate.js";

test("Gregorian reform day", () => {
  assert.deepEqual(gregorianToJulian(1582, 10, 15), [1582, 10, 5]);
});

test("year rolls over on 1 September", () => {
  assert.equal(annoMundi(2026, 8), 7534);
  assert.equal(annoMundi(2026, 9), 7535);
});

test("indiction wraps to 15", () => {
  assert.equal(indiction(15), 15);
  assert.equal(indiction(30), 15);
  assert.equal(indiction(16), 1);
});

test("4 Oct 2026 is Kyriakē", () => {
  assert.equal(WEEKDAYS[weekdayIndex(gregorianToJdn(2026, 10, 4))], "Kyriakē");
});

test("ordinals", () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 21].map(ordinal), ["1st", "2nd", "3rd", "4th", "11th", "12th", "21st"]);
});

test("sunEvents returns ordered Dates", () => {
  const [rise, set] = sunEvents(new Date("2026-06-21T00:00Z"), 41.0086, 28.9802);
  assert.ok(rise instanceof Date && set instanceof Date);
  assert.ok(rise < set);
});

test("polar night has no seasonal hour", () => {
  assert.equal(seasonalHour(new Date("2026-12-21T12:00Z"), 80, 0, 0), null);
});

test("defaults: now, Constantinople, local offset", () => {
  const b = byzantine();
  assert.ok(b.anno_mundi > 7500);
  assert.ok(b.indiction >= 1 && b.indiction <= 15);
});

test("periodBounds brackets now and chains day to night", () => {
  const now = new Date("2026-06-21T10:00Z");
  const day = periodBounds(now, 41.0086, 28.9802);
  assert.equal(day.period, "day");
  assert.ok(day.start <= now && now < day.end);
  const night = periodBounds(new Date(day.end.getTime() + 1), 41.0086, 28.9802);
  assert.equal(night.period, "night");
  assert.equal(night.start.getTime(), day.end.getTime());
  assert.equal(periodBounds(new Date("2026-12-21T12:00Z"), 80, 0), null);
});

test("periodBounds fits every longitude", () => {
  // At 40°N a day or night lasts 8.5 to 15.5 hours, whichever UTC date the
  // local one straddles; the next period starts where this one ends.
  const start = Date.parse("2026-01-01T00:00Z");
  for (let lon = -180; lon <= 180; lon += 15) {
    for (let step = 0; step < 366 * 24; step += 23) {
      const now = new Date(start + step * 3600000);
      const p = periodBounds(now, 40, lon);
      const where = `${lon} ${now.toISOString()}`;
      assert.ok(p.start <= now && now < p.end, where);
      const hours = (p.end - p.start) / 3600000;
      assert.ok(hours >= 8.5 && hours <= 15.5, `${where}: ${hours} hours`);
      const next = periodBounds(new Date(p.end.getTime() + 1), 40, lon);
      assert.notEqual(next.period, p.period, where);
      assert.equal(next.start.getTime(), p.end.getTime(), where);
    }
  }
});
