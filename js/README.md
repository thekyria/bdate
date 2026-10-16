# bdate (JavaScript)

A dependency-free port of the Python [`bdate`](../python) package, for web
pages and Node ≥ 18. It computes the same layers (Julian date, Anno Mundi,
indiction, Greek names, seasonal hours) with the same formulas, and returns
the same object shape as `bdate --json`.

```js
import { byzantine, formatDefault } from "./src/bdate.js";

const b = byzantine(new Date(), { lat: 41.0086, lon: 28.9802 });
formatDefault(b);
// "Pemptē, 3 Oktōbrios 7535 AM (Julian 2026-10-03), indiction 5, 6th hour of the day"
```

Options for `byzantine(date, options)`:

| Option | Default | Meaning |
|---|---|---|
| `lat`, `lon` | Constantinople | Location for sunrise/sunset (east positive) |
| `withHours` | `true` | Compute the seasonal hour |
| `tzOffset` | the runtime's local offset | Minutes east of UTC used for the calendar date and ISO strings |

Also exported: `seasonalHour`, `sunEvents`, `gregorianToJdn`, `jdnToJulian`,
`gregorianToJulian`, `annoMundi`, `indiction`, `weekdayIndex`, `ordinal`,
`WEEKDAYS`, `MONTHS`, `DEFAULT_LAT`, `DEFAULT_LON`.

## Tests

```
npm test
```

`test/fixtures.test.js` checks every case in [`../fixtures/cases.json`](../fixtures),
which the Python package generates, so the two implementations stay in step.

The package is marked `"private"` so it can't be published by accident.
Remove that line (and check the npm name is free) before publishing.
