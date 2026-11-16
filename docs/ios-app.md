# SignalBoard iPhone app (Capacitor)

The iPhone app is the same React code as the website, wrapped in a native shell
(Capacitor 8). Web, phone browser and iPhone app all come from this repo.

- Bundle ID: `com.dhruvilkotak.signalboard` (iPhone only)
- Native project: `ios/App/App.xcodeproj` (Swift Package Manager, no CocoaPods)
- Sign-in: native Google sheet → Google ID token → Firebase JS SDK (`src/lib/googleSignIn.js`)
- New accounts: "Request Access" in the app opens the website; sign-up stays on web

Steps marked **(you)** need your accounts or your Mac; the code side is already done.

---

## 1. Install packages and check the phone layout (free)

```bash
git checkout feat/mobile-responsive-v1
npm install            # adds the Capacitor packages
npm run dev            # open http://localhost:3000, DevTools → device toolbar → iPhone
```

Once the PR is merged and deployed, anyone can install the **web app** today:
iPhone Safari → `signalboard-frontend.vercel.app` → Share → **Add to Home Screen**.

## 2. Install Xcode (you, free)

1. Mac App Store → **Xcode** (large download).
2. Open it once, accept the license, and install the **iOS** platform when asked.
3. `xcode-select -p` should print `/Applications/Xcode.app/Contents/Developer`
   (if not: `sudo xcode-select -s /Applications/Xcode.app`).

## 3. Firebase: register the iOS app (you, free)

1. Firebase console → project **signalboard-bc35e** → ⚙ Project settings →
   **Add app** → iOS.
2. Apple bundle ID: `com.dhruvilkotak.signalboard`, nickname `SignalBoard iOS`.
   Skip the SDK/code steps in the wizard (already done).
3. Download **GoogleService-Info.plist** and save it as
   `ios/App/App/GoogleService-Info.plist` (it's already wired into the Xcode
   project and is git-ignored).
4. Run once:
   ```bash
   sh scripts/ios-google-setup.sh   # copies REVERSED_CLIENT_ID into Info.plist
   ```
   Google sign-in is already enabled under Authentication → Sign-in method;
   registering the iOS app creates the iOS OAuth client automatically.

## 4. Backend: allow the app's origin (you, backend repo)

Inside the iPhone app, pages load from `capacitor://localhost`. Add that origin
to the FastAPI `CORSMiddleware` `allow_origins` list (next to the Vercel URL),
deploy, and restart `signalboard.service`. Without this, API calls from the app
fail with CORS errors (the website is unaffected).

## 5. Run it in the Simulator (free)

```bash
npm run ios:sync   # vite build + copy into the iOS project
npm run ios:open   # opens Xcode
```

In Xcode pick an iPhone simulator → ▶ Run. First build downloads the Swift
packages (Firebase, Google Sign-In), which takes a few minutes.

**On your own iPhone without paying:** plug it in, Xcode → App target →
Signing & Capabilities → Team = *your Apple ID (Personal Team)* → pick the phone
→ ▶ Run. Free signing expires after 7 days (just run again).

Every time the web code changes: `npm run ios:sync`, then ▶ Run.

## 6. Apple Developer Program — $99/year (you)

Needed for TestFlight and the App Store.

1. https://developer.apple.com/programs/enroll → enroll as **Individual** with
   your Apple ID (two-factor auth on). Approval is usually 1–2 days.
   Your legal name is shown as the seller.
2. Xcode → Settings → Accounts → add the Apple ID. App target → Signing &
   Capabilities → Team = your paid team, **Automatically manage signing** on.

## 7. App Store Connect + TestFlight for family (you)

1. https://appstoreconnect.apple.com → Apps → **+ New App**: iOS, name
   `SignalBoard` (must be unique on the store — add a word if taken),
   bundle ID `com.dhruvilkotak.signalboard`, SKU `signalboard-ios`.
2. Xcode: device = **Any iOS Device (arm64)** → Product → **Archive** →
   Distribute App → **App Store Connect** → Upload.
   Before each new upload, bump **Build** (App target → General).
3. Users and Access → invite each family member (their Apple ID email).
4. TestFlight → **Internal Testing** → new group → add them and the build.
   They install the **TestFlight** app and accept the invite.

Internal testing has no Apple review (up to 100 people on your team); builds
expire after 90 days, so upload a new one at least that often.

## Before a public App Store release (later)

- **Sign in with Apple** must be offered next to Google (guideline 4.8):
  enable the Apple provider in Firebase, add the capability in Xcode, add
  `apple.com` to `capacitor.config.json` providers, and a button in Login.
- **Paid plans:** don't show Stripe checkout inside the iOS app (guideline
  3.1.1) — either hide billing when `isNativeApp`, or use Apple in-app purchase.
- Privacy policy URL, App Privacy answers, 6.9" iPhone screenshots.
- Apple can reject apps that look like a wrapped website (guideline 4.2);
  native touches (push notifications, haptics) help.
