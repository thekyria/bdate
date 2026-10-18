# bdate for Android

The [Byzantine clock](https://bdate.app/) as an Android app, with a
home-screen widget.

- **The app** is bdate.app itself, opened by Chrome in a
  [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity).
  It shares the web app's code and updates, so nothing in it is Android-only.
- **The widget** shows the current seasonal hour, the Julian date and the year
  for your location or one of the clock's places. Tapping it opens the clock
  there.

## Install

Each push that touches `android/`, on any branch, builds an APK on GitHub
Actions: open the latest [Android run](https://github.com/thekyria/bdate/actions/workflows/android.yml),
download `bdate-apk` and open the `.apk` inside it on the phone. Android asks
once to allow installs from the app you open it with.

Until the repository has a release key (below), each run signs with its own
throwaway key, so a newer APK only installs after uninstalling the old one.
The installed PWA is a separate app and can stay or go.

## The widget

Long-press the home screen, pick **Widgets**, then **Byzantine hour**, and
choose **Use my location** or a place. The widget:

- fetches 48 hours of hours and dates from
  [`/api/v1/schedule`](https://bdate.app/docs/usage.html#schedule) when it is
  added and about twice a day after that, sending only the place's
  coordinates and time zone;
- redraws itself at each hour boundary and at midnight, from that schedule,
  without the network;
- is in Greek when the phone is.

**Use my location** asks for approximate location once, reads it while the
setup screen is open, and keeps it rounded to 0.01° (about a kilometre). The
widget doesn't follow the phone afterwards: to update it, reconfigure the
widget (long-press it on Android 12 and later) or add it again.

To change hour on the minute, it needs **Alarms & reminders** (Settings →
Apps → Byzantine Clock). Android 12 and 13 allow it by default; from Android
14 it is off until you turn it on, and the widget may change up to 10 minutes
late.

## Release key and full screen

The app opens bdate.app without an address bar only once bdate.app vouches
for the app's signing key. To set that up, once:

1. Make a key, and keep the file and passwords safe: losing them means a new
   app that can't update the old one.

   ```
   keytool -genkeypair -v -keystore bdate.jks -alias bdate -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Add the repository secrets `BDATE_KEYSTORE_BASE64` (from
   `base64 -w0 bdate.jks`), `BDATE_KEYSTORE_PASSWORD`, `BDATE_KEY_ALIAS`
   (`bdate`) and `BDATE_KEY_PASSWORD`. The next run signs a release build with
   it.

3. Put the key's SHA-256 fingerprint (`keytool -list -v -keystore bdate.jks`)
   in `docs/clock/.well-known/assetlinks.json` (done for the current key):

   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "app.bdate",
       "sha256_cert_fingerprints": ["AB:CD:…"]
     }
   }]
   ```

## Build

With JDK 17 and the Android SDK:

```
./gradlew testDebugUnitTest   # unit tests
./gradlew assembleDebug       # app/build/outputs/apk/debug/app-debug.apk
```

The code is in `app/src/main/java/app/bdate/`: `BdateWidget` draws the widget
and sets the alarm for the next change, `RefreshWorker` fetches schedules,
`Schedule` reads them, and `Texts` words them as the clock does.
