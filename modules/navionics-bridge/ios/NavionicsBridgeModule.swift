import ExpoModulesCore

// ─── S171 — iOS STUB. DELIBERATELY DOES NOTHING. ────────────────────────────────
//
// Garmin's iOS Navionics extension crashes at launch — their side, not ours — so charts
// ship Android-first. The rule for this file is that iOS must still BUILD and RUN, and
// every function must answer politely rather than crash or be missing.
//
// It answers in the SAME SHAPE as Android, so the JavaScript never needs a platform check:
// it reads `ok` / `state` and gets a sensible answer either way.
//
// ⚠ Nothing Navionics is linked on iOS. When Garmin fixes their extension, this file is
// where the real implementation goes; until then adding the .framework would only import
// the crash.

public class NavionicsBridgeModule: Module {

  private static let unsupportedDetail =
    "Charts are Android-only for now — Garmin's iOS extension crashes at launch."

  private func unsupported() -> [String: Any?] {
    return ["ok": false, "route": "none", "detail": NavionicsBridgeModule.unsupportedDetail]
  }

  public func definition() -> ModuleDefinition {
    Name("NavionicsBridge")

    Events("onChartDownload")

    AsyncFunction("getStatus") { () -> [String: Any?] in
      return [
        "state": "unavailable",
        "detail": NavionicsBridgeModule.unsupportedDetail,
        "sdkVersion": nil,
        "extensionVersion": nil
      ]
    }

    AsyncFunction("initialize") { (_: [String: Any?]) -> [String: Any?] in
      return [
        "ok": false,
        "state": "unavailable",
        "detail": NavionicsBridgeModule.unsupportedDetail
      ]
    }

    AsyncFunction("showChart") { (_: [String: Any?]) -> [String: Any?] in self.unsupported() }
    AsyncFunction("hideChart") { () -> [String: Any?] in self.unsupported() }
    AsyncFunction("applySettings") { (_: [String: Any?]) -> [String: Any?] in self.unsupported() }

    // Empty rather than a refusal: these two describe settings, and an empty description
    // is the honest answer when there are none.
    AsyncFunction("getSettings") { () -> [String: Any?] in [:] }
    AsyncFunction("getSettingLimits") { () -> [String: Any?] in [:] }

    AsyncFunction("setMinimumZoom") { (_: Double, _: Bool) -> [String: Any?] in self.unsupported() }
    AsyncFunction("canDownloadArea") { (_: [String: Any?]) -> [String: Any?] in self.unsupported() }
    AsyncFunction("downloadArea") { (_: [String: Any?]) -> [String: Any?] in self.unsupported() }
    AsyncFunction("stopDownload") { () -> [String: Any?] in self.unsupported() }
    AsyncFunction("checkForUpdates") { () -> [String: Any?] in self.unsupported() }
    AsyncFunction("applyUpdates") { (_: Bool) -> [String: Any?] in self.unsupported() }

    AsyncFunction("getChartDataSize") { () -> [String: Any?] in
      var result = self.unsupported()
      result["bytes"] = 0
      return result
    }

    AsyncFunction("deleteAllCharts") { () -> [String: Any?] in self.unsupported() }
    AsyncFunction("shutdown") { () -> [String: Any?] in self.unsupported() }
  }
}
