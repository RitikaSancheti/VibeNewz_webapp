# Running VibeNewz as a web app

Good news: nothing about the actual app code had to change. It was already
built with Expo, and Expo can render the exact same React Native
components in a browser using something called `react-native-web` — same
screens, same navigation, same `src/api.ts`, just rendered as HTML/CSS
instead of a native iOS/Android view. I updated `package.json` and
`app.json` to turn that on; the screens themselves are untouched.

This replaces the mobile setup steps from before — you do **not** need
Expo Go, a simulator, or a phone at all now.

---

## 1. Backend — no change

Keep your backend running exactly as before:
```bash
cd vibenewz-backend
npm run dev
```
Leave that terminal tab open.

## 2. Create the Expo project (same as before)

```bash
cd ~/Projects
npx create-expo-app@latest vibenewz-web-app
cd vibenewz-web-app
```

## 3. Install dependencies — note the extra web ones this time

```bash
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context @react-native-async-storage/async-storage @expo/vector-icons react-dom react-native-web @expo/metro-runtime
```

The last three (`react-dom`, `react-native-web`, `@expo/metro-runtime`)
are the new ones — they're what let this run in a browser at all.

## 4. Copy in the code

From the `vibenewz-mobile.zip` I gave you (the folder inside is still
named `vibenewz-mobile` — that's fine, it's just a folder name):

```bash
cp ~/Downloads/vibenewz-mobile/App.tsx ./App.tsx
cp ~/Downloads/vibenewz-mobile/app.json ./app.json
cp -r ~/Downloads/vibenewz-mobile/src ./src
```
(adjust the path to wherever you unzipped it)

## 5. Run it

```bash
npx expo start --web
```

This opens `http://localhost:8081` in your default browser automatically
(or press `w` in the terminal if it doesn't). You should land on the
VibeNewz login screen, now running as a regular web page.

No IP address or emulator settings to worry about this time — since the
browser and your backend are on the same Mac, `http://localhost:3000/api`
(already set in `src/api.ts`) just works as-is.

---

## What to expect, since this wasn't originally designed as a web layout

- The bottom tab bar (Dashboard / Bookmarks / Analytics / Profile) will
  render as a bar across the bottom of the browser window, mobile-app
  style, rather than a typical website nav bar. It works fine, just looks
  more "app-like" than "website-like." Totally fine for a class project —
  say the word if you'd rather I convert it to a top navbar layout instead.
- Everything else (login, fetching news, bookmarking, muting keywords,
  analytics bars) behaves identically to the mobile version, since it's
  the same code.

## If something doesn't load

Open your browser's DevTools (right-click → Inspect → Console tab) and
check for red errors — paste them back to me exactly as shown and I'll
fix it, same as we did with the backend.
