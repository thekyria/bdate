package app.bdate

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.OffsetDateTime

// schedule-athens.json is /api/v1/schedule?date=2026-10-18T21:00&tz=Europe/Athens
// &lat=37.972&lon=23.727&span=6, as tests/api's handler returns it.
class ScheduleTest {
    private val json = javaClass.getResource("/schedule-athens.json")!!.readText()
    private val segments = Schedule.parse(json)

    private fun at(iso: String) = Schedule.at(segments, OffsetDateTime.parse(iso).toInstant().toEpochMilli())

    @Test
    fun parsesEverySegmentEndToEnd() {
        assertEquals(7, segments.size)
        assertEquals(OffsetDateTime.parse("2026-10-18T21:00:00+03:00").toInstant().toEpochMilli(), segments.first().from)
        for (i in 1 until segments.size) assertEquals(segments[i - 1].to, segments[i].from)
    }

    @Test
    fun findsTheSegmentAtATime() {
        val late = at("2026-10-18T23:30:00+03:00")!!
        assertEquals(Seasonal("night", 5, 2), late.seasonal)
        assertEquals("Kyriakē", late.weekday)
        assertEquals(5, late.julianDay)

        // Midnight changes the date but not the hour.
        val midnight = at("2026-10-19T00:03:00+03:00")!!
        assertEquals(Seasonal("night", 5, 2), midnight.seasonal)
        assertEquals("Deutera", midnight.weekday)
        assertEquals(6, midnight.julianDay)

        assertNull(at("2026-10-18T20:59:59+03:00"))
        assertNull(at("2026-10-19T03:19:22+03:00"))
    }

    @Test
    fun wordsTheLinesLikeTheClock() {
        val seg = at("2026-10-18T23:30:00+03:00")!!
        assertEquals("5th hour of the night, second watch", Texts.hour(seg.seasonal, greek = false))
        assertEquals("5η ώρα της νύχτας, 2η φυλακή", Texts.hour(seg.seasonal, greek = true))
        assertEquals("Kyriakē, 5 Oktōbrios", Texts.day(seg, greek = false))
        assertEquals("Κυριακή, 5 Οκτωβρίου", Texts.day(seg, greek = true))
        assertEquals("7535 Anno Mundi · indiction 5", Texts.year(seg, greek = false))
        assertEquals("7535 από κτίσεως κόσμου · ινδικτιώνα 5", Texts.year(seg, greek = true))
        assertEquals("6th hour of the day", Texts.hour(Seasonal("day", 6, null), greek = false))
        assertEquals("no sunrise or sunset today", Texts.hour(null, greek = false))
    }

    @Test
    fun ordinals() {
        val got = listOf(1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 111).map(Texts::ordinal)
        assertEquals(listOf("1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "111th"), got)
    }

    @Test
    fun asksForTheNextTwoDaysFromAnHourAgo() {
        val now = OffsetDateTime.parse("2026-10-18T21:00:30+00:00").toInstant().toEpochMilli()
        assertEquals(
            "https://bdate.app/api/v1/schedule?date=2026-10-18T20:00:30Z&tz=Europe%2FAthens&lat=37.972&lon=23.727&span=48",
            Schedule.url(Places.byKey("athens"), now),
        )
    }

    @Test
    fun yourLocationIsRoundedAndOpensTheClockThere() {
        val here = Places.here(37.97191, 23.72643, "Europe/Athens")
        assertEquals(37.97 to 23.73, here.lat to here.lon)
        assertEquals("Your location", Texts.place(here, greek = false))
        assertEquals("https://bdate.app/?lat=37.97&lon=23.73&mine=1&tz=Europe%2FAthens", Places.clockUrl(here))
        assertEquals("https://bdate.app/?place=athens", Places.clockUrl(Places.byKey("athens")))
        assertEquals(
            "https://bdate.app/api/v1/schedule?date=2026-10-18T20:00:30Z&tz=Europe%2FAthens&lat=37.97&lon=23.73&span=48",
            Schedule.url(here, OffsetDateTime.parse("2026-10-18T21:00:30Z").toInstant().toEpochMilli()),
        )
    }

    @Test
    fun unknownPlacesFallBackToConstantinople() {
        assertEquals("constantinople", Places.byKey("atlantis").key)
        assertEquals("constantinople", Places.byKey(null).key)
    }
}
