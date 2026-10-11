# EcoLearn mobile app (Android & iOS)

This is the student app for EcoLearn, built with Expo (SDK 57, Expo Router, TypeScript). It has no data of its own. Everything comes from the EcoLearn **web backend** (the Next.js project in the folder above) over its HTTP API.

```
Phone app ──HTTP/JSON──► Web backend (Next.js API routes) ──► MongoDB
```

The app never connects to the database and never holds any secrets.

## What's in the app

| Tab | What it shows | Backend endpoint |
| --- | --- | --- |
| News | Approved economics news; tap a story to open it | `GET /api/economics-news`, `GET /api/economics-news/[id]` |
| Current Affairs | Filtered to your board and class | `GET /api/current-affairs` |
| Economy | Indian economy indicators with period, unit, source and revision status, plus history | `GET /api/economic-indicators`, `GET /api/economic-indicators/[code]` |
| Resources | Learning resources by level; "Read original" opens the source | `GET /api/learning-resources` |
| Profile | Language (ગુજરાતી/English), board, class; sign in or create an account | `GET /api/meta`, `POST /api/auth/login`, `POST /api/auth/register`, `GET`/`PATCH /api/auth/me` |

Every list loads more items as you scroll, supports pull-to-refresh, and can be filtered by topic.

## How sign-in works

- Reading content doesn't need an account.
- When you sign in or register, the app sends `client: "mobile"` and gets back a signed token. The token is valid for 30 days.
- The token is stored in the device's secure storage (Keychain or Keystore via `expo-secure-store`) and sent as `Authorization: Bearer <token>` on each request.
- The backend re-checks the account on every request, so deactivating an account blocks its token immediately.
- Students only get student permissions. Admin features stay on the website.

## Run it on your phone (development)

1. Start the backend in the project root folder (see the main README for MongoDB and seed setup):

   ```bash
   npm run seed:demo   # first time only
   npm run dev         # serves http://<your-computer-ip>:3000
   ```

2. Start the app in this folder:

   ```bash
   cd mobile
   npm install
   npx expo start
   ```

3. Install **Expo Go** on your phone and scan the QR code. The phone and computer must be on the **same Wi-Fi**.

You don't need to set a backend URL in development. The app uses the IP of the computer running `npx expo start`, on port 3000. Check **Profile → Server** to see which URL it is using.

If the app says "Cannot reach the server":

- Allow Node.js through the Windows firewall for private networks.
- Make sure `npm run dev` is running.
- Or set `EXPO_PUBLIC_API_URL` in `mobile/.env.local` (see `.env.example`), for example `http://192.168.1.20:3000`. Fully reload the app after changing it.

Android emulator and iOS simulator work the same way: press `a` or `i` in the Expo terminal.

## Checks

```bash
npm run lint        # expo lint
npm run typecheck   # tsc --noEmit
npx expo-doctor     # dependency/config health
```

## Release builds

1. Deploy the web backend over **HTTPS**. Release builds should not use plain `http://`.
2. Set `EXPO_PUBLIC_API_URL=https://your-backend.example.com`, in `.env` or as an EAS environment variable. This value is public; never put secrets in `EXPO_PUBLIC_*` variables.
3. Set your own app identifiers in `app.json`: `ios.bundleIdentifier` and `android.package` (for example `in.ecolearn.app`). Replace the placeholder icons in `assets/images/`.
4. Build and submit with EAS:

   ```bash
   npx eas-cli@latest build --platform android   # or ios / all
   npx eas-cli@latest submit
   ```

## Project layout

```
src/app/            screens (Expo Router): one folder per tab, each with its own Stack
src/components/     cards, lists, chips, status views
src/hooks/use-api   data loading, pagination, pull-to-refresh
src/lib/            API client (api.ts), backend URL (config.ts), types, Gujarati/English strings
src/state/          language/board/class preferences, sign-in state, topic list from /api/meta
```
