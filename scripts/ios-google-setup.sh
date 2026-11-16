#!/bin/sh
# Copies the Google sign-in URL scheme (REVERSED_CLIENT_ID) from
# ios/App/App/GoogleService-Info.plist into ios/App/App/Info.plist.
# Run once after downloading GoogleService-Info.plist from Firebase (macOS only).
set -e
cd "$(dirname "$0")/.."
PLIST=ios/App/App/GoogleService-Info.plist
INFO=ios/App/App/Info.plist
[ -f "$PLIST" ] || { echo "Missing $PLIST — download it from Firebase console → Project settings → your iOS app."; exit 1; }
REV=$(/usr/libexec/PlistBuddy -c "Print :REVERSED_CLIENT_ID" "$PLIST")
/usr/libexec/PlistBuddy -c "Set :CFBundleURLTypes:0:CFBundleURLSchemes:0 $REV" "$INFO"
echo "✔ Google sign-in URL scheme set to $REV"
