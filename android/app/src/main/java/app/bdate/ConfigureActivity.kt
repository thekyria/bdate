package app.bdate

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.ListView

/** Asks which place a new (or reconfigured) widget shows. */
class ConfigureActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        val id = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (id == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        val greek = Texts.greek()
        val list = ListView(this)
        list.adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, Places.ALL.map { Texts.place(it, greek) })
        list.setOnItemClickListener { _, _, position, _ ->
            Store.setPlace(this, id, Places.ALL[position])
            BdateWidget.render(this)
            RefreshWorker.schedulePeriodic(this)
            RefreshWorker.runNow(this, restart = true)
            setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id))
            finish()
        }
        setTitle(R.string.choose_place)
        setContentView(list)
    }
}
