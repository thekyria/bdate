package app.bdate

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.widget.RemoteViews
import com.google.androidbrowserhelper.trusted.LauncherActivity

/**
 * The home-screen widget: the current seasonal hour, the Julian date and the
 * year for a chosen place. It shows the segment of the cached schedule that
 * holds the current time, and sets an alarm to redraw when that segment ends.
 */
class BdateWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        RefreshWorker.schedulePeriodic(context)
        render(context)
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        appWidgetIds.forEach { Store.forget(context, it) }
    }

    override fun onDisabled(context: Context) {
        RefreshWorker.cancel(context)
        context.getSystemService(AlarmManager::class.java)?.cancel(tick(context))
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            ACTION_TICK, Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED -> render(context)
        }
    }

    companion object {
        private const val ACTION_TICK = "app.bdate.action.TICK"

        // Don't refetch a missing or ending schedule more often than this.
        private const val RETRY_MS = 15 * 60_000L

        // Refetch once the schedule has less than this left.
        private const val LOW_MS = 12 * 3_600_000L

        // Without exact alarms, Android delivers a windowed one within 10 minutes.
        private const val WINDOW_MS = 10 * 60_000L

        /** Redraws every widget and sets the alarm for the next change. */
        fun render(c: Context) {
            val manager = AppWidgetManager.getInstance(c)
            val greek = Texts.greek()
            val now = System.currentTimeMillis()
            var next = Long.MAX_VALUE
            var refetch = false
            for (id in Store.widgetIds(c)) {
                val place = Store.place(c, id)
                val segments = Store.schedule(c, place).orEmpty()
                val seg = Schedule.at(segments, now)
                manager.updateAppWidget(id, views(c, place, seg, greek))
                if (seg != null) next = minOf(next, seg.to)
                val ending = segments.isEmpty() || segments.last().to - now < LOW_MS
                if (ending && now - Store.fetchedAt(c, place) > RETRY_MS) refetch = true
            }
            if (refetch) RefreshWorker.runNow(c)
            if (next != Long.MAX_VALUE) scheduleTick(c, next)
        }

        private fun views(c: Context, place: Place, seg: Segment?, greek: Boolean): RemoteViews {
            val v = RemoteViews(c.packageName, R.layout.widget)
            if (seg == null) {
                v.setTextViewText(R.id.hour, c.getString(R.string.waiting))
                v.setTextViewText(R.id.day, "")
                v.setTextViewText(R.id.year, "")
            } else {
                v.setTextViewText(R.id.hour, Texts.hour(seg.seasonal, greek))
                v.setTextViewText(R.id.day, Texts.day(seg, greek))
                v.setTextViewText(R.id.year, Texts.year(seg, greek))
            }
            v.setTextViewText(R.id.place, Texts.place(place, greek))
            v.setOnClickPendingIntent(R.id.root, openClock(c, place))
            return v
        }

        /** Opens the clock (the web app, in the app's Trusted Web Activity) at the widget's place. */
        private fun openClock(c: Context, place: Place): PendingIntent {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(Places.clockUrl(place)), c, LauncherActivity::class.java)
            return PendingIntent.getActivity(c, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        private fun tick(c: Context): PendingIntent {
            val intent = Intent(c, BdateWidget::class.java).setAction(ACTION_TICK)
            return PendingIntent.getBroadcast(c, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        private fun scheduleTick(c: Context, at: Long) {
            val alarms = c.getSystemService(AlarmManager::class.java) ?: return
            // RTC, not RTC_WAKEUP: a sleeping phone isn't woken, and the
            // widget is redrawn when the screen next comes on.
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()) {
                alarms.setExact(AlarmManager.RTC, at, tick(c))
            } else {
                alarms.setWindow(AlarmManager.RTC, at, WINDOW_MS, tick(c))
            }
        }
    }
}
