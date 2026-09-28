# VibeNewz — Node.js + React Native + Supabase

This is your capstone project ("VibeNewz") ported from Java/Spring Boot +
React to Node.js/Express + React Native (Expo), using Supabase as the
database instead of MySQL. Same features, new language.

You'll end up with two folders:
- `vibenewz-backend/` — the Node.js server (replaces your Spring Boot app)
- `vibenewz-mobile/` — the React Native app (replaces your React web app)

Follow the steps **in order** — each one depends on the last.

---

## 0. Install what you need (macOS)

Open **Terminal** and run these one at a time.

**1. Homebrew** (a package installer for Mac — skip if you already have it):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**2. Node.js** (version 20 or newer):
```bash
brew install node
node --version   # should print v20.x.x or higher
```

**3. Watchman** (makes React Native's file-watching faster and more reliable):
```bash
brew install watchman
```

**4. Expo Go app on your phone** — search "Expo Go" in the App Store (iPhone)
   and install it. This is how you'll preview the app on your actual phone
   without needing Xcode.

   *Optional:* if you want to use the iOS **Simulator** on your Mac instead
   of a physical phone, install Xcode from the Mac App Store (it's large,
   ~15GB, and can take a while). You do not need this if you're happy
   testing on your real phone with Expo Go.

You do **not** need to install React Native CLI, Java, Android Studio, or
anything MySQL-related — Expo and Supabase handle all of that for you.

---

## 1. Set up your Supabase database

You already created a Supabase project (I can see it in your `backend.zip`'s
`.env` file). We'll reuse it.

1. Go to [supabase.com](https://supabase.com) and open your project.
2. In the left sidebar, click **SQL Editor** → **New query**.
3. Open `vibenewz-backend/sql/schema.sql` (in the files I've given you),
   copy **all** of it, paste it into the SQL editor, and click **Run**.
4. Click **Table Editor** in the sidebar — you should now see 4 tables:
   `users`, `news`, `user_bookmarks`, `muted_keywords`.

That's it — no MySQL install, no migrations to run by hand.

### 🔒 One security note
Your `backend.zip`'s `.env` file had real API keys in it, which you shared
with me in this chat. That's fine for a school project, but as a habit:
**rotate keys that get shared anywhere outside your own machine.** In
Supabase: Project Settings → API → regenerate the service role key. For
NewsData.io: dashboard → regenerate key. Then update your `.env` with the
new values. Not urgent, just good practice going forward — and never commit
`.env` to GitHub (I've already added it to `.gitignore` for you).

---

## 2. Run the backend

1. Unzip `vibenewz-backend.zip` somewhere sensible, e.g. `~/Projects/`.
2. In Terminal:
   ```bash
   cd ~/Projects/vibenewz-backend
   npm install
   ```
3. Create your real `.env` file:
   ```bash
   cp .env.example .env
   ```
   Then open `.env` in any text editor and fill in the same values you
   already had in your old `backend.zip`'s `.env` (Supabase URL, Supabase
   secret key, NewsData API key). The `SENTIMENT_API_BASE_URL` line can
   stay exactly as it is in `.env.example`.

4. Start the server:
   ```bash
   npm run dev
   ```
   You should see:
   ```
   VibeNewz backend running at http://localhost:3000
   ```
5. **Test it** — open `http://localhost:3000/api/news` in your browser. It
   should show `[]` (empty array — no articles yet, that's expected).

Leave this running in its own Terminal tab/window. Everything below assumes
the backend is up.

### Load some real articles
The app fetches live news the first time a user opens their dashboard, but
you can trigger it manually to test:
```bash
curl http://localhost:3000/api/users -X POST -H "Content-Type: application/json" -d '{"username":"testuser"}'
curl http://localhost:3000/api/news/fetch/testuser
```
The second command can take 20-60 seconds — it's calling the AI sentiment
model once per article. That's normal, not a hang.

---

## 3. Create the React Native app

We're using **Expo**, which is the easiest way to build React Native apps —
it handles the native iOS/Android build tooling for you so you don't need
Xcode just to get started.

1. In Terminal, go to wherever you keep projects (NOT inside the backend
   folder):
   ```bash
   cd ~/Projects
   npx create-expo-app@latest vibenewz-mobile-app
   cd vibenewz-mobile-app
   ```
2. Install the extra packages this app needs (this uses `expo install`
   instead of plain `npm install` so it picks versions that are guaranteed
   compatible with your Expo version):
   ```bash
   npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context @react-native-async-storage/async-storage @expo/vector-icons
   ```
3. Now copy the code I've written into this new project, **replacing** the
   default files:
   - Copy `App.tsx` from `vibenewz-mobile/` into your new project's root
     (overwrite the one create-expo-app made).
   - Copy the entire `src/` folder from `vibenewz-mobile/` into your new
     project's root.

   In Terminal, from inside `vibenewz-mobile-app`:
   ```bash
   cp ~/Downloads/vibenewz-mobile/App.tsx ./App.tsx
   cp -r ~/Downloads/vibenewz-mobile/src ./src
   ```
   (adjust `~/Downloads/vibenewz-mobile` to wherever you unzipped the
   `vibenewz-mobile.zip` I gave you)

4. **Important:** open `src/api.ts` and check the `esconstant
   near the top. If you're testing with:
   - **iOS Simulator** → leave it as `http://localhost:3000/api`
   - **A real iPhone with Expo Go** → change it to your Mac's local IP,
     e.g. `http://192.168.1.23:3000/api`. Find your IP with:
     ```bash
     ipconfig getifaddr en0
     ```
     Your phone and Mac must be on the same Wi-Fi network.

5. Start the app:
   ```bash
   npx expo start
   ```
   - To open in the iOS Simulator: press `i`
   - To open on your phone: open the **Expo Go** app and scan the QR code
     shown in your terminal

You should land on the VibeNewz login screen. Type any username — it'll be
created automatically (there's no password, same as your old app).

---

## What I changed from your original project (and why)

Being upfront about the simplifications, since you said you're okay with
an honest review:

- **Dropped the `Category` entity/controller.** Your Java backend had a
  full `Category` JPA entity + repository + controller, but nothing in your
  React frontend ever called `/api/categories` — articles just store their
  category as a plain text field. I kept the text field, dropped the dead
  entity.
- **Dropped `/api/preferences`.** Your frontend's `api.ts` had
  `getUserPreference`/`createUserPreference`/`updateUserPreference`
  functions calling `/api/preferences/*` — but your Java backend never
  defined that route. It was dead code that would have thrown errors if
  called. I used the real, working route instead:
  `PUT /api/users/:username/sentiment`.
- **Merged `Profile.tsx` and `Settings.tsx` into one `ProfileScreen`.**
  `Settings.tsx` (748 lines) was never wired into your router (`routes.tsx`
  only ever pointed to `Profile.tsx`) — it was unreachable dead code. All
  the real functionality (account info, topics, muted keywords) was
  already in `Profile.tsx`, so that's what became `ProfileScreen.tsx`.
- **Topics are a Postgres array column, not a join table.** Your Java
  version needed a separate `USER_TOPICS` table for this. Postgres
  supports array columns natively (`text[]`), so Supabase makes this a
  single column — simpler, same result.
- **Styling is simplified, not pixel-matched.** Your web app used Tailwind
  + a full Radix UI component library with ~40 custom UI components. React
  Native doesn't use those — I built clean, simple screens with React
  Native's built-in `StyleSheet`, using your app's color palette (the
  green accent, warm background). It won't look identical, but it's easy
  to read and easy for you to keep customizing.
- **No charting library for Analytics.** Your web app used `recharts`. To
  keep the code simple to read as a beginner, I built the sentiment/category
  breakdowns as plain colored bars instead of pulling in a charting
  dependency. Works the same, way less code to understand.

## What still needs your NewsData.io / Sentiment API keys to actually work

The AI sentiment scoring and live news fetching depend on the same two
external services your Java backend used (NewsData.io + the Hugging
Face-hosted sentiment model) — I didn't change those, just the code that
calls them.

## A note on what I could and couldn't verify

I syntax-checked every backend file (`node --check`) and every mobile file
(a full TypeScript compile pass) — no errors. I could **not** run
`npm install` or start the servers live in this sandbox (the environment
I'm running in blocks outbound connections to the npm registry), so I
haven't done a live end-to-end run myself. Follow the steps above in order
and it should come up clean; if you hit an error, paste it back to me
exactly as shown and I'll fix it.

---

## Next term's features

You mentioned more features are coming later — the backend is split into
small files (`src/routes/news.js`, `src/routes/users.js`,
`src/services/*.js`) specifically so you can add a new route or service
file without touching existing ones. Same idea on the mobile side — each
screen is its own file, and `src/api.ts` is the one place all new backend
calls should be added.
