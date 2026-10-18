package app.bdate

/** A place the widget can show, with the time zone its calendar date is read in. */
data class Place(
    val key: String,
    val name: String,
    val nameEl: String,
    val lat: Double,
    val lon: Double,
    val tz: String,
)

/** The clock's preset places (PLACES in docs/clock/index.html). */
object Places {
    val ALL = listOf(
        Place("constantinople", "Constantinople", "Κωνσταντινούπολη", 41.0086, 28.9802, "Europe/Istanbul"),
        Place("thessaloniki", "Thessaloniki", "Θεσσαλονίκη", 40.632, 22.951, "Europe/Athens"),
        Place("athens", "Athens", "Αθήνα", 37.972, 23.727, "Europe/Athens"),
        Place("trebizond", "Trebizond", "Τραπεζούντα", 41.005, 39.726, "Europe/Istanbul"),
        Place("nicaea", "Nicaea", "Νίκαια", 40.429, 29.721, "Europe/Istanbul"),
        Place("antioch", "Antioch", "Αντιόχεια", 36.202, 36.160, "Europe/Istanbul"),
        Place("jerusalem", "Jerusalem", "Ιερουσαλήμ", 31.778, 35.235, "Asia/Jerusalem"),
        Place("alexandria", "Alexandria", "Αλεξάνδρεια", 31.200, 29.918, "Africa/Cairo"),
        Place("ravenna", "Ravenna", "Ραβέννα", 44.418, 12.204, "Europe/Rome"),
        Place("rome", "Rome", "Ρώμη", 41.902, 12.453, "Europe/Rome"),
    )

    val DEFAULT = ALL.first()

    fun byKey(key: String?): Place = ALL.firstOrNull { it.key == key } ?: DEFAULT
}
