# Google Play Automated Submission Setup

This file documents the one-time manual steps required to enable `eas submit --platform android`
to push builds to Google Play automatically.

---

## Step 1 — Link Google Play Console to a Google Cloud Project

1. Open [Google Play Console](https://play.google.com/console) → **Setup** → **API access**
2. Click **Link to a Google Cloud project** (create a new one if needed)
3. Confirm the link

---

## Step 2 — Create a Service Account

1. In the Google Cloud project linked above, go to **IAM & Admin** → **Service accounts**
2. Click **Create service account**
   - Name: `eas-submit` (or similar)
   - Role: **Service Account User**
3. After creation, go to **Keys** → **Add key** → **Create new key** → **JSON**
4. Download the JSON file — this is your service account key

---

## Step 3 — Grant Google Play permissions to the service account

1. Back in Google Play Console → **Setup** → **API access**
2. Find the service account you just created → click **Manage Play Console permissions**
3. Grant the **Release Manager** role (minimum: release apps to all tracks)
4. Click **Apply** and **Save**

---

## Step 4 — Save the key file in the project

Save the downloaded JSON key as:

```
google-services-account.json
```

in the **project root** (same folder as `eas.json`).

This file is already in `.gitignore` — never commit it to source control.

---

## Step 5 — Run `eas submit`

```bash
eas submit --platform android
```

EAS will pick up `./google-services-account.json` as configured in `eas.json`:

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-services-account.json",
      "track": "internal"
    }
  }
}
```

Change `"track"` to `"production"` when ready to ship to the full production track.

---

## Alternative — Store the key as an EAS Secret (CI/CD environments)

If you prefer not to keep the JSON on disk, store it as an EAS project secret:

```bash
eas secret:create --scope project --name GOOGLE_SERVICE_ACCOUNT_KEY --value "$(cat google-services-account.json)"
```

Then update `eas.json` to use the secret instead of the file path:

```json
"android": {
  "serviceAccountKeyPath": "/dev/stdin"
}
```

And pipe it in via EAS's secret injection — see [EAS docs](https://docs.expo.dev/eas/environment-variables/).
