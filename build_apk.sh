#!/usr/bin/env bash
set -euo pipefail

cd frontend
VOLEYOS_STATIC_EXPORT=true npm run build
cd ..

rm -rf android/app/src/main/assets/public
mkdir -p android/app/src/main/assets/public
cp -R frontend/out/. android/app/src/main/assets/public/

cd android
gradle assembleDebug
echo "APK: android/app/build/outputs/apk/debug/app-debug.apk"
