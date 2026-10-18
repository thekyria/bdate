package app.bdate

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/** Fetches the schedule for every place on the home screen, then redraws the widgets. */
class RefreshWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val c = applicationContext
        var failed = false
        for (place in Store.placesInUse(c)) {
            val now = System.currentTimeMillis()
            try {
                Store.saveSchedule(c, place, Schedule.fetch(place, now), now)
            } catch (e: Exception) {
                failed = true
            }
        }
        BdateWidget.render(c)
        return if (failed && runAttemptCount < 5) Result.retry() else Result.success()
    }

    companion object {
        private const val PERIODIC = "refresh"
        private const val NOW = "refresh-now"

        // A fetch covers Schedule.SPAN_HOURS; refetching twice a day leaves
        // more than a day of slack for a phone that is offline for a while.
        private const val EVERY_HOURS = 12L

        private val online = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

        fun schedulePeriodic(c: Context) {
            val request = PeriodicWorkRequestBuilder<RefreshWorker>(EVERY_HOURS, TimeUnit.HOURS)
                .setConstraints(online)
                .build()
            WorkManager.getInstance(c).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request)
        }

        /**
         * Fetches as soon as the phone is online. A fetch already queued or
         * running is kept, unless `restart` (a widget's place just changed).
         */
        fun runNow(c: Context, restart: Boolean = false) {
            val request = OneTimeWorkRequestBuilder<RefreshWorker>().setConstraints(online).build()
            val policy = if (restart) ExistingWorkPolicy.REPLACE else ExistingWorkPolicy.KEEP
            WorkManager.getInstance(c).enqueueUniqueWork(NOW, policy, request)
        }

        fun cancel(c: Context) {
            WorkManager.getInstance(c).cancelUniqueWork(PERIODIC)
            WorkManager.getInstance(c).cancelUniqueWork(NOW)
        }
    }
}
