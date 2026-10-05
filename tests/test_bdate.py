import io
import json
import unittest
from contextlib import redirect_stdout, redirect_stderr
from datetime import datetime, timedelta, timezone

import bdate


class CalendarTests(unittest.TestCase):
    def test_gregorian_reform_day(self):
        # 15 Oct 1582 (Gregorian) == 5 Oct 1582 (Julian)
        self.assertEqual(bdate.gregorian_to_julian(1582, 10, 15), (1582, 10, 5))

    def test_modern_offset_is_13_days(self):
        self.assertEqual(bdate.gregorian_to_julian(2026, 10, 4), (2026, 9, 21))
        self.assertEqual(bdate.gregorian_to_julian(2026, 1, 10), (2025, 12, 28))

    def test_fall_of_constantinople(self):
        # 29 May 1453: Julian == Gregorian-proleptic minus 10 days; AM 6961; indiction 1; a Tuesday.
        jdn = bdate.gregorian_to_jdn(1453, 6, 7)  # 7 June 1453 proleptic Gregorian
        self.assertEqual(bdate.jdn_to_julian(jdn), (1453, 5, 29))
        am = bdate.anno_mundi(1453, 5)
        self.assertEqual(am, 6961)
        self.assertEqual(bdate.indiction(am), 1)
        self.assertEqual(bdate.WEEKDAYS[bdate.weekday_index(jdn)], "Tritē")

    def test_year_boundary_on_1_september(self):
        self.assertEqual(bdate.anno_mundi(2026, 8), 7534)
        self.assertEqual(bdate.anno_mundi(2026, 9), 7535)

    def test_indiction_wraps_to_15(self):
        self.assertEqual(bdate.indiction(15), 15)
        self.assertEqual(bdate.indiction(30), 15)
        self.assertEqual(bdate.indiction(16), 1)

    def test_weekday_known_sunday(self):
        # 4 Oct 2026 is a Sunday
        self.assertEqual(bdate.WEEKDAYS[bdate.weekday_index(bdate.gregorian_to_jdn(2026, 10, 4))], "Kyriakē")


class SeasonalHourTests(unittest.TestCase):
    def test_noon_in_constantinople_is_daytime(self):
        now = datetime(2026, 6, 21, 10, 0, tzinfo=timezone.utc)  # 13:00 local (UTC+3)
        s = bdate.seasonal_hour(now, bdate.DEFAULT_LAT, bdate.DEFAULT_LON)
        self.assertIsNotNone(s)
        self.assertEqual(s.period, "day")
        self.assertTrue(5 <= s.hour <= 8)

    def test_midnight_in_constantinople_is_night(self):
        now = datetime(2026, 6, 21, 21, 0, tzinfo=timezone.utc)  # 00:00 local
        s = bdate.seasonal_hour(now, bdate.DEFAULT_LAT, bdate.DEFAULT_LON)
        self.assertEqual(s.period, "night")
        self.assertIn(s.watch, (2, 3))

    def test_polar_night_returns_none(self):
        now = datetime(2026, 12, 21, 12, 0, tzinfo=timezone.utc)
        self.assertIsNone(bdate.seasonal_hour(now, 80.0, 0.0))


    def test_sun_events_are_ordered_and_tz_aware(self):
        d = datetime(2026, 6, 21, tzinfo=timezone.utc).date()
        rise, sset = bdate.sun_events(d, bdate.DEFAULT_LAT, bdate.DEFAULT_LON)
        self.assertIsNotNone(rise)
        self.assertIsNotNone(sset)
        self.assertEqual(rise.tzinfo, timezone.utc)
        self.assertEqual(sset.tzinfo, timezone.utc)
        self.assertLess(rise, sset)

    def test_hour_is_between_1_and_12(self):
        start = datetime(2026, 3, 20, 0, 0, tzinfo=timezone.utc)
        for offset in range(0, 24):
            s = bdate.seasonal_hour(start + timedelta(hours=offset),
                                    bdate.DEFAULT_LAT, bdate.DEFAULT_LON)
            self.assertIsNotNone(s)
            self.assertIn(s.period, ("day", "night"))
            self.assertTrue(1 <= s.hour <= 12)
            if s.period == "night":
                self.assertTrue(1 <= s.watch <= 4)
            else:
                self.assertIsNone(s.watch)


class AssemblyTests(unittest.TestCase):
    def test_byzantine_without_hours(self):
        now = datetime(1453, 6, 7, 12, 0, tzinfo=timezone.utc)
        b = bdate.byzantine(now, bdate.DEFAULT_LAT, bdate.DEFAULT_LON, with_hours=False)
        self.assertEqual((b.julian_year, b.julian_month, b.julian_day), (1453, 5, 29))
        self.assertEqual(b.month_name, "Maios")
        self.assertEqual(b.weekday, "Tritē")
        self.assertEqual(b.anno_mundi, 6961)
        self.assertEqual(b.indiction, 1)
        self.assertIsNone(b.seasonal)

    def test_ordinal(self):
        self.assertEqual(bdate._ordinal(1), "1st")
        self.assertEqual(bdate._ordinal(2), "2nd")
        self.assertEqual(bdate._ordinal(3), "3rd")
        self.assertEqual(bdate._ordinal(4), "4th")
        self.assertEqual(bdate._ordinal(11), "11th")
        self.assertEqual(bdate._ordinal(12), "12th")
        self.assertEqual(bdate._ordinal(21), "21st")

    def test_format_default_without_hours(self):
        now = datetime(1453, 6, 7, 12, 0, tzinfo=timezone.utc)
        b = bdate.byzantine(now, bdate.DEFAULT_LAT, bdate.DEFAULT_LON, with_hours=False)
        self.assertEqual(
            bdate.format_default(b),
            "Tritē, 29 Maios 6961 AM (Julian 1453-05-29), indiction 1",
        )

    def test_format_default_mentions_night_watch(self):
        b = bdate.ByzantineDate(
            gregorian="1453-05-29T00:00:00+00:00",
            julian_year=1453, julian_month=5, julian_day=29,
            month_name="Maios", weekday="Tritē", anno_mundi=6961, indiction=1,
            seasonal=bdate.SeasonalHour("night", 5, 2, "x", "y"),
        )
        self.assertTrue(
            bdate.format_default(b).endswith("5th hour of the night (2nd watch)")
        )


class ArgParsingTests(unittest.TestCase):
    def test_defaults(self):
        args = bdate.parse_args([])
        self.assertIsNone(args.date)
        self.assertFalse(args.utc)
        self.assertFalse(args.json)
        self.assertFalse(args.no_hours)
        self.assertEqual(args.lat, bdate.DEFAULT_LAT)
        self.assertEqual(args.lon, bdate.DEFAULT_LON)

    def test_overrides(self):
        args = bdate.parse_args(["-u", "--json", "--no-hours",
                                 "--lat", "37.98", "--lon", "23.73",
                                 "-d", "1453-05-29T12:00+02:00"])
        self.assertTrue(args.utc)
        self.assertTrue(args.json)
        self.assertTrue(args.no_hours)
        self.assertEqual(args.lat, 37.98)
        self.assertEqual(args.lon, 23.73)
        self.assertEqual(args.date, "1453-05-29T12:00+02:00")

    def test_version_exits(self):
        buf = io.StringIO()
        with self.assertRaises(SystemExit) as cm, redirect_stdout(buf):
            bdate.parse_args(["--version"])
        self.assertEqual(cm.exception.code, 0)
        self.assertIn(bdate.__version__, buf.getvalue())


class CliTests(unittest.TestCase):
    def test_main_runs(self):
        self.assertEqual(bdate.main(["-d", "1453-05-29T12:00+02:00", "--no-hours"]), 0)

    def test_bad_date(self):
        buf = io.StringIO()
        with redirect_stderr(buf):
            self.assertEqual(bdate.main(["-d", "nonsense"]), 1)
        self.assertIn("invalid date", buf.getvalue())

    def test_default_output(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = bdate.main(["-d", "1453-06-07T12:00+00:00", "--no-hours", "-u"])
        self.assertEqual(rc, 0)
        self.assertEqual(
            buf.getvalue().strip(),
            "Tritē, 29 Maios 6961 AM (Julian 1453-05-29), indiction 1",
        )

    def test_json_output(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = bdate.main(["-d", "1453-06-07T12:00+00:00", "--no-hours", "-u", "--json"])
        self.assertEqual(rc, 0)
        payload = json.loads(buf.getvalue())
        self.assertEqual(payload["anno_mundi"], 6961)
        self.assertEqual(payload["indiction"], 1)
        self.assertEqual(payload["month_name"], "Maios")
        self.assertIsNone(payload["seasonal"])

    def test_naive_date_with_utc_flag(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = bdate.main(["-d", "1453-05-29T12:00", "--no-hours", "-u", "--json"])
        self.assertEqual(rc, 0)
        self.assertTrue(json.loads(buf.getvalue())["gregorian"].endswith("+00:00"))

    def test_json_output_includes_seasonal_hour(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = bdate.main(["-d", "2026-06-21T10:00+00:00", "-u", "--json"])
        self.assertEqual(rc, 0)
        seasonal = json.loads(buf.getvalue())["seasonal"]
        self.assertEqual(seasonal["period"], "day")
        self.assertTrue(1 <= seasonal["hour"] <= 12)


if __name__ == "__main__":
    unittest.main()
