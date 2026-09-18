package expo.modules.navionicsbridge

// ─── S171 — THE NAVIONICS CHART BRIDGE (ANDROID) ────────────────────────────────
//
// What this is: the layer between LobsterLog's JavaScript and Garmin's Navionics chart
// library. JavaScript asks for a chart; this finds the map already on screen and hands it
// to Garmin.
//
// THE ONE RULE RUNNING THROUGH ALL OF IT: with no credentials, every function returns a
// clean answer and nothing crashes. S170 proved the native layer already behaves that way
// (it returned false rather than throwing); this must not undo it. Every public function
// is wrapped so that a throw from Garmin's side becomes a reported failure, never a
// crashed app on a boat.
//
// HOW THE MAP IS FOUND — read this before changing it. Garmin's extension needs a live
// com.mapbox.maps.Style. There are two ways to get one:
//   ROUTE A, by React tag: JavaScript sends findNodeHandle(mapRef) and we ask React's UI
//     manager to resolve it. Exact. DOES NOT WORK on this stack — proven at S171 under the
//     new architecture (bridgeless + Fabric), and proven not to be a timing problem.
//   ROUTE B, by walking the Activity's view tree for a Mapbox map. Works. This is what
//     S170's probe did and it is what carries the bridge.
// Route A is still attempted first so that the day it starts working we get the precise
// one for free, and every result reports which route was used.
//
// ⚠ ROUTE B FINDS THE FIRST MAP ON SCREEN. That is safe while the app has exactly one map
// (Garminmapbox.tsx). If a second map is ever added, this needs revisiting — the `route`
// field on every result is how that would show up.

import android.view.View
import android.view.ViewGroup
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.mapbox.maps.MapView
import com.mapbox.maps.Style
import com.navionics.android.nms.NMSCoordinateBounds
import com.navionics.android.nms.NMSEnum
import com.navionics.android.nms.NMSInitializationListener
import com.navionics.android.nms.NMSMapSettings
import com.navionics.android.nms.core.NMSError
import com.navionics.android.nms.model.NMSLocationCoordinate2D
import com.navionics.android.nms.NMSMapSettingsEdit
import com.navionics.android.nms.NMSSettings
import com.navionics.android.nms.NavionicsMobileServices
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import it.navionics.mapboxextension.NMSContentResolution
import it.navionics.mapboxextension.NMSContentTileSize
import it.navionics.mapboxextension.NMSMapboxLayerConfiguration
import it.navionics.mapboxextension.NavionicsMapboxLayer

class NavionicsBridgeModule : Module() {

  // The settings last asked for, kept so the chart can be re-applied after it is added and
  // so getSettings() can answer without going back to Garmin.
  private var currentSettings: NMSMapSettings = NMSMapSettings.mapSettings()

  // Set once initialize() has reported success. Garmin also exposes isInitialized(), and
  // that is the one trusted below — this is only a record of whether we ever tried.
  private var initializeAttempted = false

  override fun definition() = ModuleDefinition {
    Name("NavionicsBridge")

    Events(DOWNLOAD_EVENT)

    // Optional hint from JavaScript: the map's native tag, from findNodeHandle(mapRef).
    // It lets Route A be genuinely attempted rather than decoratively mentioned. Nothing
    // depends on it — Route B works with or without it.
    Function("setMapTag") { tag: Int? ->
      lastKnownTag = tag
      true
    }

    // ── STATUS ───────────────────────────────────────────────────────────────────
    // Never throws. This is what the app asks before showing anything chart-related.
    AsyncFunction("getStatus") {
      guard("getStatus") {
        val ready = NavionicsMobileServices.isInitialized()
        mapOf(
          "state" to when {
            ready -> STATE_READY
            initializeAttempted -> STATE_NOT_CONFIGURED
            else -> STATE_NOT_STARTED
          },
          "sdkVersion" to runCatching { NavionicsMobileServices.version() }.getOrNull(),
          "extensionVersion" to runCatching { NavionicsMapboxLayer.version() }.getOrNull()
        )
      }
    }

    // ── START THE CHART LIBRARY ──────────────────────────────────────────────────
    // The four secrets arrive as arguments. NOTHING is hardcoded here and nothing is read
    // from the environment — where the credentials come from is the app's decision, not
    // this module's, and that decision is still open.
    AsyncFunction("initialize") { credentials: Map<String, Any?>, promise: expo.modules.kotlin.Promise ->
      val projectToken = credentials["projectToken"] as? String
      val configurationToken = credentials["configurationToken"] as? String
      val privateKey = credentials["privateKey"] as? String
      val sandbox = credentials["sandbox"] as? Boolean ?: true
      val language = credentials["language"] as? String

      // No credentials is a NORMAL state, not an error: Garmin has not issued them yet.
      // Say so plainly and do not touch the SDK.
      if (projectToken.isNullOrBlank() || configurationToken.isNullOrBlank() || privateKey.isNullOrBlank()) {
        promise.resolve(
          mapOf(
            "ok" to false,
            "state" to STATE_NOT_CONFIGURED,
            "detail" to "No Navionics credentials supplied — charts are not set up yet."
          )
        )
        return@AsyncFunction
      }

      initializeAttempted = true

      try {
        val settings = NMSSettings.settings().apply {
          setProjectToken(projectToken)
          setConfigurationToken(configurationToken)
          setPrivateKey(privateKey)
          setMode(
            if (sandbox) NMSEnum.NMSFrameworkMode.NMSFrameworkModeSandbox
            else NMSEnum.NMSFrameworkMode.NMSFrameworkModeProduction
          )
          // The app is bilingual, so pass its language through rather than hardcoding
          // English the way Garmin's sample does.
          setLanguage(
            when (language) {
              "fr" -> NMSEnum.NMSLanguage.NMSLanguageFrench
              "en" -> NMSEnum.NMSLanguage.NMSLanguageEnglish
              else -> NMSEnum.NMSLanguage.NMSLanguageAuto
            }
          )
        }

        // Initialisation is asynchronous and reports back on a listener, so the promise is
        // held until Garmin answers rather than resolved optimistically.
        NavionicsMobileServices.initializeWithSettings(
          settings,
          object : NMSInitializationListener {
            override fun onSuccess() {
              promise.resolve(mapOf("ok" to true, "state" to STATE_READY))
            }

            override fun onError(error: NMSError?) {
              promise.resolve(
                mapOf(
                  "ok" to false,
                  "state" to STATE_NOT_CONFIGURED,
                  "detail" to describeError(error)
                )
              )
            }
          }
        )
      } catch (t: Throwable) {
        promise.resolve(
          mapOf(
            "ok" to false,
            "state" to STATE_NOT_CONFIGURED,
            "detail" to "Could not start the chart library: ${t.message ?: t.javaClass.name}"
          )
        )
      }
    }

    // ── PUT THE CHART ON THE MAP ─────────────────────────────────────────────────
    AsyncFunction("showChart") { options: Map<String, Any?> ->
      guard("showChart") {
        val found = findMap()
          ?: return@guard found_nothing("showChart")

        applySettingsFrom(options["settings"] as? Map<String, Any?>)

        val configuration = NMSMapboxLayerConfiguration(
          options["mapContent"] as? String ?: "",
          options["transparent"] as? Boolean ?: true,
          if ((options["lowResolution"] as? Boolean) == true) NMSContentResolution.LOW
          else NMSContentResolution.AUTO,
          (options["cacheControl"] as? Number)?.toInt() ?: 0,
          if ((options["smallTiles"] as? Boolean) == true) NMSContentTileSize.SIZE_256
          else NMSContentTileSize.SIZE_512
        )

        // layerPosition is left null deliberately: null means the top of the layer stack,
        // which is where a chart overlay belongs. Our pins are Mapbox annotations drawn
        // above the layer stack, so they stay on top of the chart either way.
        val added = NavionicsMapboxLayer.addNavionicsLayerToStyle(
          found.style,
          configuration,
          currentSettings
        )

        // ⚠ `false` is this method's entire vocabulary — it cannot say WHY. It returns
        // false for missing credentials, for an empty mapContent, and for a layer that is
        // already present. Do not read a specific cause into it.
        mapOf(
          "ok" to added,
          "route" to found.route,
          "detail" to if (added) null
          else "Garmin refused to add the chart layer. With no tokens and no map content that is expected."
        )
      }
    }.runOnQueue(Queues.MAIN)

    // ── TAKE THE CHART OFF ───────────────────────────────────────────────────────
    AsyncFunction("hideChart") {
      guard("hideChart") {
        val found = findMap() ?: return@guard found_nothing("hideChart")
        mapOf(
          "ok" to NavionicsMapboxLayer.removeNavionicsLayerToStyle(found.style) {},
          "route" to found.route
        )
      }
    }.runOnQueue(Queues.MAIN)

    // ── CHANGE HOW THE CHART LOOKS ───────────────────────────────────────────────
    AsyncFunction("applySettings") { settings: Map<String, Any?> ->
      guard("applySettings") {
        applySettingsFrom(settings)
        val found = findMap() ?: return@guard found_nothing("applySettings")
        mapOf(
          "ok" to NavionicsMapboxLayer.applyNavionicsMapSettings(currentSettings, found.style),
          "route" to found.route
        )
      }
    }.runOnQueue(Queues.MAIN)

    // What the chart is currently set to, read back from the settings object itself.
    AsyncFunction("getSettings") {
      guard("getSettings") { readSettings(currentSettings) }
    }

    // ⭐ The min and max for every numeric setting, asked of the SDK rather than guessed.
    // A settings screen should build its sliders from this, not from hardcoded numbers.
    AsyncFunction("getSettingLimits") {
      guard("getSettingLimits") {
        val s = currentSettings
        mapOf(
          "depthContours" to mapOf("min" to s.depthContoursMin, "max" to s.depthContoursMax),
          "depthAreas" to mapOf("min" to s.depthAreasMin, "max" to s.depthAreasMax),
          "shallowDepthLimit" to mapOf("min" to s.shallowDepthLimitMin, "max" to s.shallowDepthLimitMax),
          "fishingAreaRangeLower" to mapOf("min" to s.fishingAreaRangeLowerMin, "max" to s.fishingAreaRangeLowerMax),
          "fishingAreaRangeUpper" to mapOf("min" to s.fishingAreaRangeUpperMin, "max" to s.fishingAreaRangeUpperMax),
          "poolWaterLevel" to mapOf("min" to s.poolWaterLevelMin, "max" to s.poolWaterLevelMax)
        )
      }
    }

    // ── HIDE THE CHART UNTIL ZOOMED IN ───────────────────────────────────────────
    // ⚠ Garmin caps this between 5 and 11. The value is clamped rather than refused, so a
    // caller cannot accidentally make the chart never appear.
    AsyncFunction("setMinimumZoom") { zoom: Double, fadeIn: Boolean ->
      guard("setMinimumZoom") {
        val found = findMap() ?: return@guard found_nothing("setMinimumZoom")
        val clamped = zoom.coerceIn(MIN_ZOOM, MAX_ZOOM)
        mapOf(
          "ok" to NavionicsMapboxLayer.setMinimumZoomLevel(found.style, clamped.toFloat(), fadeIn),
          "requested" to zoom,
          "applied" to clamped,
          "route" to found.route
        )
      }
    }.runOnQueue(Queues.MAIN)

    // ── DOWNLOADS ────────────────────────────────────────────────────────────────
    // "Can this area be downloaded at all?" Ask before offering it — a box outside our
    // licensed region is refused by Garmin, and it is better to know before the tap.
    AsyncFunction("canDownloadArea") { bounds: Map<String, Any?> ->
      guard("canDownloadArea") {
        val box = toBounds(bounds)
          ?: return@guard mapOf("ok" to false, "detail" to "Bounding box is missing or malformed.")
        mapOf("ok" to NavionicsMapboxLayer.canDownloadBoundingBox(box))
      }
    }

    // Start a download. Size and progress arrive as events, NOT as a return value — the
    // SDK reports the size in its own phase before any bytes move, which is what makes
    // "this will cost N MB, go ahead?" possible.
    AsyncFunction("downloadArea") { bounds: Map<String, Any?> ->
      guard("downloadArea") {
        val box = toBounds(bounds)
          ?: return@guard mapOf("ok" to false, "detail" to "Bounding box is missing or malformed.")
        listenForDownloads()
        if (!NavionicsMapboxLayer.canDownloadBoundingBox(box)) {
          return@guard mapOf(
            "ok" to false,
            "detail" to "Garmin will not download this area. It may be outside the licensed region."
          )
        }
        mapOf("ok" to NavionicsMapboxLayer.downloadBoundingBox(box))
      }
    }

    AsyncFunction("stopDownload") {
      guard("stopDownload") { mapOf("ok" to NavionicsMobileServices.stopDownload()) }
    }

    // Ask Garmin whether downloaded charts have updates. The answer arrives as an event.
    AsyncFunction("checkForUpdates") {
      guard("checkForUpdates") {
        listenForDownloads()
        mapOf("ok" to NavionicsMobileServices.checkUpdates())
      }
    }

    AsyncFunction("applyUpdates") { confirm: Boolean ->
      guard("applyUpdates") {
        NavionicsMobileServices.update(confirm)
        mapOf("ok" to true)
      }
    }

    // How much chart data is on the phone, in bytes.
    AsyncFunction("getChartDataSize") {
      // getNavionicsDataSize() is the one method on the extension that is an instance
      // member rather than a static, so it is called as a function, not read as a property.
      guard("getChartDataSize") { mapOf("ok" to true, "bytes" to NavionicsMapboxLayer.getNavionicsDataSize()) }
    }

    // ⚠⚠ WIPES EVERY DOWNLOADED CHART. Garmin provides no per-area delete — this is the
    // only removal method in the whole extension. Never call it without asking the user.
    AsyncFunction("deleteAllCharts") {
      guard("deleteAllCharts") { mapOf("ok" to NavionicsMapboxLayer.resetNavionicsData()) }
    }

    // ── SHUT DOWN ────────────────────────────────────────────────────────────────
    // Resets everything; the SDK must be initialised again afterwards.
    AsyncFunction("shutdown") {
      guard("shutdown") {
        NavionicsMobileServices.shutDown()
        initializeAttempted = false
        mapOf("ok" to true)
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // FINDING THE MAP
  // ───────────────────────────────────────────────────────────────────────────────

  private class FoundMap(val mapView: MapView, val style: Style, val route: String)

  // Must run on the main thread: the Mapbox view tree is main-thread only. Every caller
  // reaches this through guard(), which hops to main first.
  private fun findMap(): FoundMap? {
    val reactContext = appContext.reactContext as? ReactContext
    val activity = appContext.currentActivity

    // ROUTE A — by React tag. Kept because it is the exact answer if it ever works.
    // It does not work under the new architecture today (S171), hence Route B below.
    var mapView: MapView? = null
    var route = "tree"
    val tag = lastKnownTag
    if (reactContext != null && tag != null) {
      val resolved = UIManagerHelper.getUIManagerForReactTag(reactContext, tag)?.resolveView(tag)
      val viaTag = resolved?.let { searchForMapView(it) }
      if (viaTag != null) {
        mapView = viaTag
        route = "tag"
      }
    }

    // ROUTE B — walk the Activity's views. This is the one that carries the bridge.
    if (mapView == null) {
      mapView = activity?.window?.decorView?.let { searchForMapView(it) }
    }

    val view = mapView ?: return null
    // Style loads asynchronously; no style yet is a "not ready", not a break.
    val style = view.mapboxMap.style ?: return null
    return FoundMap(view, style, route)
  }

  private fun searchForMapView(root: View): MapView? {
    if (root is MapView) return root
    if (root is ViewGroup) {
      for (i in 0 until root.childCount) {
        searchForMapView(root.getChildAt(i))?.let { return it }
      }
    }
    return null
  }

  // Optional hint from JavaScript so Route A can be attempted. Nothing depends on it.
  private var lastKnownTag: Int? = null

  // ───────────────────────────────────────────────────────────────────────────────
  // SETTINGS
  // ───────────────────────────────────────────────────────────────────────────────

  // Applies only the keys actually present, so a caller can change one thing without
  // restating the rest. Unknown keys are ignored rather than throwing.
  private fun applySettingsFrom(settings: Map<String, Any?>?) {
    if (settings == null) return
    val edit = NMSMapSettingsEdit(currentSettings)

    // ⛔ MAP MODE IS DELIBERATELY NOT SETTABLE FROM JAVASCRIPT.
    // The SDK offers NMSMapModeSonarCharts, but the signed licence is for Bathymetry
    // Content and explicitly excludes the SonarChart product. Mode is pinned to Default
    // and there is no key for it — leaving it unreachable is the point.
    edit.setMapMode(NMSEnum.NMSMapMode.NMSMapModeDefault)

    (settings["depthUnit"] as? String)?.let {
      edit.setDepthUnit(
        when (it) {
          "feet" -> NMSEnum.NMSDepthUnit.NMSDepthUnitFeet
          "fathoms" -> NMSEnum.NMSDepthUnit.NMSDepthUnitFathoms
          else -> NMSEnum.NMSDepthUnit.NMSDepthUnitMeters
        }
      )
    }
    (settings["distanceUnit"] as? String)?.let {
      edit.setDistanceUnit(
        when (it) {
          "kilometers" -> NMSEnum.NMSDistanceUnit.NMSDistanceUnitKilometers
          "statuteMiles" -> NMSEnum.NMSDistanceUnit.NMSDistanceUnitStatuteMiles
          else -> NMSEnum.NMSDistanceUnit.NMSDistanceUnitNauticalMiles
        }
      )
    }
    (settings["speedUnit"] as? String)?.let {
      edit.setSpeedUnit(
        when (it) {
          "mph" -> NMSEnum.NMSSpeedUnit.NMSSpeedUnitMPH
          "kph" -> NMSEnum.NMSSpeedUnit.NMSSpeedUnitKPH
          else -> NMSEnum.NMSSpeedUnit.NMSSpeedUnitKnots
        }
      )
    }
    (settings["contourDensity"] as? String)?.let {
      edit.setDepthContoursDensity(
        when (it) {
          "low" -> NMSEnum.NMSDepthContoursDensity.NMSDepthContoursDensityLow
          "medium" -> NMSEnum.NMSDepthContoursDensity.NMSDepthContoursDensityMedium
          "veryHigh" -> NMSEnum.NMSDepthContoursDensity.NMSDepthContoursDensityVeryHigh
          else -> NMSEnum.NMSDepthContoursDensity.NMSDepthContoursDensityHigh
        }
      )
    }

    (settings["easyView"] as? Boolean)?.let { edit.setEasyViewEnabled(it) }
    (settings["seabedArea"] as? Boolean)?.let { edit.setSeabedAreaEnabled(it) }
    (settings["fishingMode"] as? Boolean)?.let { edit.setFishingModeEnabled(it) }
    (settings["allDepthContours"] as? Boolean)?.let { edit.setDepthContoursAll(it) }

    // Numeric settings are clamped to the SDK's own limits rather than passed through.
    // A value outside the range is a caller mistake, not something to send to Garmin.
    (settings["depthContours"] as? Number)?.let {
      edit.setDepthContours(it.toInt().coerceIn(edit.depthContoursMin, edit.depthContoursMax))
    }
    (settings["depthAreas"] as? Number)?.let {
      edit.setDepthAreas(it.toInt().coerceIn(edit.depthAreasMin, edit.depthAreasMax))
    }
    (settings["shallowDepthLimit"] as? Number)?.let {
      edit.setShallowDepthLimit(it.toInt().coerceIn(edit.shallowDepthLimitMin, edit.shallowDepthLimitMax))
    }
    (settings["fishingAreaRangeLower"] as? Number)?.let {
      edit.setFishingAreaRangeLower(it.toInt().coerceIn(edit.fishingAreaRangeLowerMin, edit.fishingAreaRangeLowerMax))
    }
    (settings["fishingAreaRangeUpper"] as? Number)?.let {
      edit.setFishingAreaRangeUpper(it.toInt().coerceIn(edit.fishingAreaRangeUpperMin, edit.fishingAreaRangeUpperMax))
    }
    (settings["poolWaterLevel"] as? Number)?.let {
      edit.setPoolWaterLevel(it.toInt().coerceIn(edit.poolWaterLevelMin, edit.poolWaterLevelMax))
    }

    currentSettings = edit
  }

  private fun readSettings(s: NMSMapSettings): Map<String, Any?> = mapOf(
    "depthUnit" to when (s.depthUnit) {
      NMSEnum.NMSDepthUnit.NMSDepthUnitFeet -> "feet"
      NMSEnum.NMSDepthUnit.NMSDepthUnitFathoms -> "fathoms"
      else -> "meters"
    },
    "distanceUnit" to when (s.distanceUnit) {
      NMSEnum.NMSDistanceUnit.NMSDistanceUnitKilometers -> "kilometers"
      NMSEnum.NMSDistanceUnit.NMSDistanceUnitStatuteMiles -> "statuteMiles"
      else -> "nauticalMiles"
    },
    "speedUnit" to when (s.speedUnit) {
      NMSEnum.NMSSpeedUnit.NMSSpeedUnitMPH -> "mph"
      NMSEnum.NMSSpeedUnit.NMSSpeedUnitKPH -> "kph"
      else -> "knots"
    },
    "contourDensity" to when (s.depthContoursDensity) {
      NMSEnum.NMSDepthContoursDensity.NMSDepthContoursDensityLow -> "low"
      NMSEnum.NMSDepthContoursDensity.NMSDepthContoursDensityMedium -> "medium"
      NMSEnum.NMSDepthContoursDensity.NMSDepthContoursDensityVeryHigh -> "veryHigh"
      else -> "high"
    },
    "easyView" to s.isEasyViewEnabled,
    "seabedArea" to s.isSeabedAreaEnabled,
    "fishingMode" to s.isFishingModeEnabled,
    "allDepthContours" to s.isDepthContoursAll,
    "depthContours" to s.depthContours,
    "depthAreas" to s.depthAreas,
    "shallowDepthLimit" to s.shallowDepthLimit,
    "fishingAreaRangeLower" to s.fishingAreaRangeLower,
    "fishingAreaRangeUpper" to s.fishingAreaRangeUpper,
    "poolWaterLevel" to s.poolWaterLevel
  )

  // ───────────────────────────────────────────────────────────────────────────────
  // DOWNLOADS
  // ───────────────────────────────────────────────────────────────────────────────

  private var downloadListenerAttached = false

  private fun listenForDownloads() {
    if (downloadListenerAttached) return
    downloadListenerAttached = true
    NavionicsMobileServices.setOnTilesDownload(
      object : NavionicsMobileServices.OnTilesDownloadListener {
        // ⭐ This is the "it will cost you N MB" moment — it arrives BEFORE any bytes move.
        override fun onTilesUpdateInfo(totalBytes: Long) {
          send("sizeKnown", mapOf("totalBytes" to totalBytes))
        }

        override fun onTilesDownloadStatusChanged(status: NMSEnum.NMSTilesDownloadStatus?) {
          send(
            "status",
            mapOf(
              "status" to when (status) {
                NMSEnum.NMSTilesDownloadStatus.CALCULATING_DOWNLOAD_SIZE -> "calculating"
                NMSEnum.NMSTilesDownloadStatus.STARTED -> "started"
                NMSEnum.NMSTilesDownloadStatus.ENDED -> "ended"
                NMSEnum.NMSTilesDownloadStatus.ABORTED -> "aborted"
                else -> "unknown"
              }
            )
          )
        }

        override fun onTilesDownloadProgress(progressBytes: Long, totalBytes: Long) {
          send("progress", mapOf("progressBytes" to progressBytes, "totalBytes" to totalBytes))
        }

        override fun onTilesDownloadError(error: NMSError?) {
          send("error", mapOf("detail" to describeError(error)))
        }
      }
    )
  }

  private fun send(kind: String, payload: Map<String, Any?>) {
    // A listener callback must never take the app down, whatever else has gone wrong.
    runCatching { sendEvent(DOWNLOAD_EVENT, payload + mapOf("kind" to kind)) }
  }

  private fun toBounds(bounds: Map<String, Any?>?): NMSCoordinateBounds? {
    if (bounds == null) return null
    val south = (bounds["south"] as? Number)?.toDouble() ?: return null
    val west = (bounds["west"] as? Number)?.toDouble() ?: return null
    val north = (bounds["north"] as? Number)?.toDouble() ?: return null
    val east = (bounds["east"] as? Number)?.toDouble() ?: return null
    return NMSCoordinateBounds.initWithCoordinate(
      NMSLocationCoordinate2D(south, west),
      NMSLocationCoordinate2D(north, east)
    )
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // THE SAFETY NET
  // ───────────────────────────────────────────────────────────────────────────────

  // Every public function goes through here, and it has ONE job: turn any throw from
  // Garmin's side into a reported failure. A harvester offshore gets "charts unavailable",
  // never a crash.
  //
  // It does NOT change threads. The four functions that touch the Mapbox view tree
  // (showChart, hideChart, applySettings, setMinimumZoom) declare .runOnQueue(Queues.MAIN)
  // themselves, because that view tree is main-thread only.
  private inline fun guard(name: String, body: () -> Map<String, Any?>): Map<String, Any?> =
    try {
      body()
    } catch (t: Throwable) {
      mapOf(
        "ok" to false,
        "detail" to "$name failed inside the chart library: ${t.message ?: t.javaClass.name}"
      )
    }

  private fun found_nothing(name: String): Map<String, Any?> = mapOf(
    "ok" to false,
    "route" to "none",
    "detail" to "$name could not find a loaded map on screen. Open the map first, and wait for it to finish loading."
  )

  // Garmin's error object carries a code plus up to three sentences. Use them — the code
  // alone (NMSErrorEmptyTokenOrKey, NMSErrorDownloadOutOfRegions, …) is what tells us
  // whether a failure is "no tokens yet" or something that needs looking at.
  private fun describeError(error: NMSError?): String {
    if (error == null) return "Garmin reported an error with no detail."
    return runCatching {
      listOfNotNull(
        error.errorDescription?.takeIf { it.isNotBlank() },
        error.errorFailureReason?.takeIf { it.isNotBlank() },
        error.errorRecoverySuggestion?.takeIf { it.isNotBlank() }
      ).joinToString(" ").ifBlank { "Garmin error code ${error.errorCode}." }
    }.getOrDefault("Garmin reported an error.")
  }

  companion object {
    private const val DOWNLOAD_EVENT = "onChartDownload"
    private const val STATE_READY = "ready"
    private const val STATE_NOT_CONFIGURED = "not-configured"
    private const val STATE_NOT_STARTED = "not-started"

    // Garmin's own cap on the minimum-zoom setting.
    private const val MIN_ZOOM = 5.0
    private const val MAX_ZOOM = 11.0
  }
}
