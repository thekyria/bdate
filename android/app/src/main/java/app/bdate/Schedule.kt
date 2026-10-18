package app.bdate

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.time.Instant
import java.time.OffsetDateTime

data class Seasonal(val period: String, val hour: Int, val watch: Int?)

/** A stretch of time with one reckoning: a segment of /api/v1/schedule. */
data class Segment(
    val from: Long,
    val to: Long,
    val weekday: String,
    val julianDay: Int,
    val julianMonth: Int,
    val monthName: String,
    val annoMundi: Int,
    val indiction: Int,
    val seasonal: Seasonal?,
)

/** The reckoning ahead, from bdate.app's schedule endpoint (docs/usage.md#schedule). */
object Schedule {
    private const val API = "https://bdate.app/api/v1/schedule"

    /** Hours a fetch covers; the widget refetches well before they run out. */
    const val SPAN_HOURS = 48

    /**
     * The schedule from an hour before `now`, so a device clock running a
     * little behind bdate.app's still lands inside the first segment.
     */
    fun url(place: Place, now: Long): String {
        val from = Instant.ofEpochSecond(now / 1000 - 3600).toString()
        return "$API?date=$from&tz=${URLEncoder.encode(place.tz, "UTF-8")}" +
            "&lat=${place.lat}&lon=${place.lon}&span=$SPAN_HOURS"
    }

    fun parse(json: String): List<Segment> {
        val segments = JSONObject(json).getJSONArray("segments")
        return (0 until segments.length()).map { i ->
            val s = segments.getJSONObject(i)
            val seasonal = s.optJSONObject("seasonal")?.let {
                Seasonal(it.getString("period"), it.getInt("hour"), if (it.isNull("watch")) null else it.getInt("watch"))
            }
            Segment(
                from = millis(s.getString("from")),
                to = millis(s.getString("to")),
                weekday = s.getString("weekday"),
                julianDay = s.getInt("julian_day"),
                julianMonth = s.getInt("julian_month"),
                monthName = s.getString("month_name"),
                annoMundi = s.getInt("anno_mundi"),
                indiction = s.getInt("indiction"),
                seasonal = seasonal,
            )
        }
    }

    /** The segment that holds `now`, or null if the schedule doesn't reach it. */
    fun at(segments: List<Segment>, now: Long): Segment? = segments.firstOrNull { it.from <= now && now < it.to }

    /** Downloads the schedule for `place`; throws on a network or HTTP error. */
    fun fetch(place: Place, now: Long): String {
        val conn = URL(url(place, now)).openConnection() as HttpURLConnection
        conn.connectTimeout = 15_000
        conn.readTimeout = 15_000
        try {
            if (conn.responseCode != 200) error("HTTP ${conn.responseCode}")
            return conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
    }

    private fun millis(iso: String) = OffsetDateTime.parse(iso).toInstant().toEpochMilli()
}
