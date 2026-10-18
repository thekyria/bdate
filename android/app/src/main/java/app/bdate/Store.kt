package app.bdate

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context

/** Each widget's place, and the last schedule fetched for each place. */
object Store {
    private fun prefs(c: Context) = c.getSharedPreferences("bdate", Context.MODE_PRIVATE)

    fun place(c: Context, widgetId: Int): Place = Places.byKey(prefs(c).getString("widget.$widgetId", null))

    fun setPlace(c: Context, widgetId: Int, place: Place) {
        prefs(c).edit().putString("widget.$widgetId", place.key).apply()
    }

    fun forget(c: Context, widgetId: Int) {
        prefs(c).edit().remove("widget.$widgetId").apply()
    }

    fun widgetIds(c: Context): IntArray =
        AppWidgetManager.getInstance(c).getAppWidgetIds(ComponentName(c, BdateWidget::class.java))

    /** The places the widgets on the home screen show. */
    fun placesInUse(c: Context): List<Place> = widgetIds(c).map { place(c, it) }.distinct()

    fun schedule(c: Context, place: Place): List<Segment>? =
        prefs(c).getString("schedule.${place.key}", null)?.let { runCatching { Schedule.parse(it) }.getOrNull() }

    fun fetchedAt(c: Context, place: Place): Long = prefs(c).getLong("fetched.${place.key}", 0)

    /** Keeps `json` as the schedule for `place`; throws if it doesn't parse. */
    fun saveSchedule(c: Context, place: Place, json: String, now: Long) {
        Schedule.parse(json)
        prefs(c).edit().putString("schedule.${place.key}", json).putLong("fetched.${place.key}", now).apply()
    }
}
