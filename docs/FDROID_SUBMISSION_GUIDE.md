# F-Droid submission guide

VolleyOS ships as a static Next.js PWA. F-Droid distributes Android APKs, so the
free build needs a thin Android shell that bundles the exported web app. This
guide is the exact path from `npm run build` to an F-Droid merge request.

## 1. Produce the offline web bundle

```bash
cd frontend
npm ci
NEXT_PUBLIC_BUILD_TARGET=fdroid npm run typecheck
NEXT_PUBLIC_BUILD_TARGET=fdroid npm run test
NEXT_PUBLIC_BUILD_TARGET=fdroid npm run build
```

The F-Droid target disables the paywall (`paywallEnabled() === false`) and the
Cloud badge in the UI. All 12 stations run locally, so the bundle is complete
without a backend.

If you prefer a pure static folder for the wrapper, add `output: "export"` to
`next.config.ts` for this build only. The app has no server actions, so the
export contains every page.

## 2. Add the Android wrapper

Create `android/` with a minimal WebView shell:

- `minSdk 24`, `targetSdk 35`, application id `app.volleyos.twa`.
- Copy the exported site into `android/app/src/main/assets/www/`.
- Load it with `WebViewAssetLoader` at `https://appassets.androidplatform.net/`.
- Enable JavaScript and DOM storage (scouting, vault, i18n need both).
- Block cleartext traffic and add no analytics, ads or proprietary SDKs.
- Reuse `/icon-512.png` as the launcher icon and `#070709` as the splash color.
- No internet permission is required for the offline build. Add it only if you
  want the optional Cloud features.

Build locally to verify:

```bash
cd android
./gradlew assembleFdroid
```

Commit the wrapper, tag `v1.0.0`, and push. F-Droid builds from that tag.

## 3. Prepare the metadata

`fastlane/metadata/android/{en-US,es-ES,pt-BR}/` already contains title, short
and full descriptions plus `changelogs/1.txt`. F-Droid reads these automatically
from the app repository.

Copy `.fdroid.yml` into a fork of
[fdroiddata](https://gitlab.com/fdroid/fdroiddata) as
`metadata/app.volleyos.twa.yml`, then fill the build recipe:

```yaml
Builds:
  - versionName: 1.0.0
    versionCode: 1
    commit: v1.0.0
    subdir: android
    gradle:
      - fdroid
    output: app/build/outputs/apk/fdroid/release/app-fdroid-release-unsigned.apk
```

Keep `License: AGPL-3.0-or-later`, `SourceCode` and `Changelog` unchanged. Do not
add `AntiFeatures` unless the build actually has them; the offline build has
none.

## 4. Reproducibility checklist

- No prebuilt `.apk`, `.jar` or `.aar` committed except the Gradle wrapper.
- No `google-services.json`, Firebase, Crashlytics, Play Services or Stripe SDK.
- Gradle dependencies pinned, no dynamic versions.
- `./gradlew assembleFdroid` succeeds inside a clean container.
- Version code increases with every tagged release.
- `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt` exists.

## 5. Submit

```bash
git clone https://gitlab.com/fdroid/fdroiddata.git
cd fdroiddata
git checkout -b volleyos
cp /path/to/VolleyOS/.fdroid.yml metadata/app.volleyos.twa.yml
fdroid lint app.volleyos.twa
fdroid rewritemeta app.volleyos.twa
git add metadata/app.volleyos.twa.yml
git commit -m "New app: VolleyOS"
git push origin volleyos
```

Open a merge request on GitLab. Answer the reviewer questions about the WebView
shell, the absence of tracking and the AGPL licence. Typical review takes days
to a few weeks.

## 6. Digital Asset Links (only for TWA)

If you use a Trusted Web Activity instead of a bundled WebView, the APK signing
certificate must be listed in
`https://volleyos.app/.well-known/assetlinks.json`. F-Droid signs with its own
key, so include both your release key and the F-Droid key fingerprint, or the
TWA will show a browser bar. A bundled WebView shell avoids this entirely and is
the recommended route for the free build.

## 7. After acceptance

- F-Droid rebuilds and signs the APK; your own signature will not match, which
  is expected.
- Tag the next release, bump `versionCode`, add a changelog, and open a merge
  request updating `commit` and `versionName`.
- Keep Cloud payment code server-side only. Shipping Stripe or Play Billing in
  the F-Droid flavour would add non-free dependencies and fail review.
