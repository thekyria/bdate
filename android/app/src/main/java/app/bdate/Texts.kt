package app.bdate

import java.util.Locale

/** The widget's lines, worded as the clock words them (I18N in docs/clock/index.html). */
object Texts {
    private val WEEKDAYS = listOf("Kyriakē", "Deutera", "Tritē", "Tetartē", "Pemptē", "Paraskeuē", "Sabbaton")
    private val DAYS_EL = listOf("Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατον")
    private val MONTHS_EL = listOf( // genitive, as in "29 Μαΐου"
        "Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου",
        "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου",
    )
    private val WATCH = listOf("first", "second", "third", "fourth")

    /** Greek when the device is set to Greek, as the clock follows the browser. */
    fun greek(locale: Locale = Locale.getDefault()) = locale.language == "el"

    fun ordinal(n: Int): String {
        val suffix = if (n % 100 in 10..20) "th" else when (n % 10) {
            1 -> "st"
            2 -> "nd"
            3 -> "rd"
            else -> "th"
        }
        return "$n$suffix"
    }

    fun hour(s: Seasonal?, greek: Boolean): String = when {
        s == null -> if (greek) "χωρίς ανατολή ή δύση σήμερα" else "no sunrise or sunset today"
        s.period == "day" -> if (greek) "${s.hour}η ώρα της ημέρας" else "${ordinal(s.hour)} hour of the day"
        s.watch == null -> if (greek) "${s.hour}η ώρα της νύχτας" else "${ordinal(s.hour)} hour of the night"
        greek -> "${s.hour}η ώρα της νύχτας, ${s.watch}η φυλακή"
        else -> "${ordinal(s.hour)} hour of the night, ${WATCH[s.watch - 1]} watch"
    }

    fun day(seg: Segment, greek: Boolean): String =
        if (greek) {
            "${DAYS_EL.getOrElse(WEEKDAYS.indexOf(seg.weekday)) { seg.weekday }}, ${seg.julianDay} ${MONTHS_EL[seg.julianMonth - 1]}"
        } else {
            "${seg.weekday}, ${seg.julianDay} ${seg.monthName}"
        }

    fun year(seg: Segment, greek: Boolean): String =
        if (greek) {
            "${seg.annoMundi} από κτίσεως κόσμου · ινδικτιώνα ${seg.indiction}"
        } else {
            "${seg.annoMundi} Anno Mundi · indiction ${seg.indiction}"
        }

    fun place(p: Place, greek: Boolean) = if (greek) p.nameEl else p.name
}
