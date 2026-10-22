@echo off
setlocal
set VOLEYOS_STATIC_EXPORT=true
pushd frontend
call npm run build
if errorlevel 1 exit /b 1
popd
if exist android\app\src\main\assets\public rmdir /s /q android\app\src\main\assets\public
mkdir android\app\src\main\assets\public
xcopy /e /i /q frontend\out\* android\app\src\main\assets\public\
pushd android
call gradle assembleDebug
if errorlevel 1 exit /b 1
popd
echo APK: android\app\build\outputs\apk\debug\app-debug.apk
