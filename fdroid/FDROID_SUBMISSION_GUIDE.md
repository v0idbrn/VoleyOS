# VolleyOS → F-Droid / IzzyOnDroid / Obtainium submission guide

VolleyOS ships as a single AGPL-3.0-or-later repo with **no proprietary SDKs,
no telemetry, no Google dependency blobs**, so every fdroid-family store
checkout is straightforward.

## What is where

| Artifact | Path | Consumer |
| --- | --- | --- |
| Package metadata (fdroiddata style) | `fdroid/org.voleyos.global.yml` | F-Droid fsck/metadata review |
| Update-check hints | `.fdroid.yml` (repo root) | fdroid audit from source |
| Store listing per locale | `fastlane/metadata/android/{en-US,es-ES,pt-BR}` | IzzyOnDroid + F-Droid |
| Screenshots 1080×1920 | `fastlane/metadata/android/*/images/phoneScreenshots/*.png` | all stores |
| Obtainium import | `fdroid/obtainium-voleyos.json` | Obtainium "Import ID" |

## F-Droid main repository checklist

1. Open a merge request on [fdroiddata](https://gitlab.com/fdroid/fdroiddata) adding
   `metadata/org.voleyos.global.yml` from `fdroid/org.voleyos.global.yml`.
2. `versionCode`/`versionName` must match `android/app/build.gradle` of the release tag.
3. Each `Builds:` entry pins a git tag (`commit: v11.0.2`) so the build is
   reproducible from source; `dependenciesInfo { includeInApk = false }` keeps
   `fdroid scanner` clean (zero `GoogleDependencyInfo` findings).
4. Permissions stay minimal and auditable: `INTERNET`, `ACCESS_WIFI_STATE`, `VIBRATE`.
5. `fdroid checkupdates`, `fdroid build -l` and `fdroid scan` must all pass;
   the WebView assets are regenerated inside the build (no committed `out/` blob).

## IzzyOnDroid

No PR needed: IzzyOnDroid ingests the in-source `fastlane/metadata` directly
from the default branch. Keep the strict limits enforced in this repo:

- `title.txt` ≤ 30 chars, `short_description.txt` ≤ 80 chars,
- `full_description.txt` ≤ 4000 bytes, every `changelogs/<code>.txt` ≤ 480 bytes,
- 1080×1920 PNG screenshots (min 2, max 8 per locale).

## Obtainium

Import `fdroid/obtainium-voleyos.json` ("Import an app" → JSON) or add the repo
URL manually; the GitHub "release" workflow publishes `voleyos-universal.apk`
as the public release asset, which the filter picks up (never the creator APK —
that artifact is always deleted from GitHub Actions before merging).

## Release hygiene

- Public release = GitHub Releases `v<semver>` with exactly one asset:
  `voleyos-universal.apk`.
- Creator-only builds (`voleyos-creator-unlocked-apk` artifacts) are private and
  purged from CI after verification.
- Tags are built by both the main and tag workflows; both must be green.
