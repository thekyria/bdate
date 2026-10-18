package app.bdate

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.ArrayAdapter
import android.widget.ListView
import android.widget.Toast
import java.util.TimeZone

/**
 * Asks which place a new (or reconfigured) widget shows: the phone's location
 * or one of the clock's places. The location is read here, while the screen is
 * open, so the app never needs location access in the background.
 */
class ConfigureActivity : Activity() {
    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private var locating = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        widgetId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        val greek = Texts.greek()
        val names = listOf(getString(R.string.locate)) + Places.ALL.map { Texts.place(it, greek) }
        val list = ListView(this)
        list.adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, names)
        list.setOnItemClickListener { _, _, position, _ ->
            if (position == 0) askForLocation() else choose(Places.ALL[position - 1])
        }
        setTitle(R.string.choose_place)
        setContentView(list)
    }

    private fun choose(place: Place) {
        Store.setPlace(this, widgetId, place)
        BdateWidget.render(this)
        RefreshWorker.schedulePeriodic(this)
        RefreshWorker.runNow(this, restart = true)
        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
        finish()
    }

    private fun askForLocation() {
        if (checkSelfPermission(COARSE) == PackageManager.PERMISSION_GRANTED) {
            locate()
        } else {
            requestPermissions(arrayOf(COARSE), ASK_LOCATION)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != ASK_LOCATION) return
        if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
            locate()
        } else {
            Toast.makeText(this, R.string.denied, Toast.LENGTH_LONG).show()
        }
    }

    /** A recent last-known location if there is one, else a fresh fix, else the stale one. */
    @SuppressLint("MissingPermission") // checked first thing, below
    private fun locate() {
        if (locating) return
        val lm = getSystemService(LocationManager::class.java)
        if (lm == null || checkSelfPermission(COARSE) != PackageManager.PERMISSION_GRANTED) {
            found(null)
            return
        }
        // Only the providers this app may use; GPS needs fine location before Android 12.
        val providers = lm.getProviders(true).filter { it != LocationManager.PASSIVE_PROVIDER }
        val last = providers.mapNotNull { runCatching { lm.getLastKnownLocation(it) }.getOrNull() }.maxByOrNull { it.time }
        if (last != null && System.currentTimeMillis() - last.time < FRESH_MS) {
            found(last)
            return
        }
        val provider = providers.firstOrNull { it == LocationManager.NETWORK_PROVIDER } ?: providers.firstOrNull()
        if (provider == null) {
            found(last)
            return
        }

        locating = true
        Toast.makeText(this, R.string.finding, Toast.LENGTH_SHORT).show()
        var done = false
        val settle = { loc: Location? ->
            if (!done) {
                done = true
                locating = false
                found(loc ?: last)
            }
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                // Gives up by itself after about 30 seconds, with null.
                lm.getCurrentLocation(provider, null, mainExecutor) { settle(it) }
            } else {
                val listener = OneFix(settle)
                @Suppress("DEPRECATION")
                lm.requestSingleUpdate(provider, listener, Looper.getMainLooper())
                Handler(Looper.getMainLooper()).postDelayed({
                    lm.removeUpdates(listener)
                    settle(null)
                }, TIMEOUT_MS)
            }
        } catch (e: SecurityException) {
            settle(null)
        }
    }

    private fun found(loc: Location?) {
        if (isFinishing || isDestroyed) return
        if (loc == null) {
            Toast.makeText(this, R.string.no_location, Toast.LENGTH_LONG).show()
            return
        }
        val here = Places.here(loc.latitude, loc.longitude, TimeZone.getDefault().id)
        Store.setHere(this, here)
        choose(here)
    }

    /**
     * One location update, for Android 8 to 10. Every method is written out:
     * those Android versions call them all, and have no defaults for them.
     */
    private class OneFix(val done: (Location?) -> Unit) : LocationListener {
        override fun onLocationChanged(location: Location) = done(location)

        @Deprecated("Deprecated in Java")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}

        override fun onProviderEnabled(provider: String) {}

        override fun onProviderDisabled(provider: String) = done(null)
    }

    companion object {
        private const val COARSE = Manifest.permission.ACCESS_COARSE_LOCATION
        private const val ASK_LOCATION = 1

        // A last-known location younger than this is good enough.
        private const val FRESH_MS = 6 * 3_600_000L
        private const val TIMEOUT_MS = 30_000L
    }
}
