# RouteUbud — Expo Web + Mobile

This project keeps the original RouteUbud Expo / React Native application in `App.tsx` and adds a separate editorial website in `App.web.tsx`. Expo's platform resolver loads `App.web.tsx` for web builds and `App.tsx` for Android/iOS, so the web redesign does not replace the mobile UI.

## Stack
- Expo SDK 58, React 19, React Native 0.88 and React Native Web (kept from the supplied configuration)
- TypeScript
- Leaflet + OpenStreetMap for the dedicated interactive map
- Static web export to `dist/`, deployable on GitHub + Vercel

## Run locally
```bash
npm install
npx expo start --web
```

Mobile remains available with:
```bash
npx expo start
```

## Build for Vercel
```bash
npm run build:web
```
Vercel configuration is included in `vercel.json`:
- Build command: `npx expo export --platform web`
- Output directory: `dist`

Push this folder to a GitHub repository, import it into Vercel, and deploy. If Vercel does not detect settings automatically, use the values above.

## Local photography
The website uses local files in `public/photos/`. Copy your destination-specific photos there using the filenames listed in `public/photos/README.md`. Missing files show a neutral branded placeholder; no unrelated stock photo is silently substituted. The original mobile app's photo slots are documented in its `PHOTO` map inside `App.tsx` and currently remain commented out as in the supplied source.

## Map data note
The map uses the destination names and map search queries from the supplied app source. Marker coordinates in `src/content.ts` are approximate display positions for the prototype, not verified navigation coordinates. Use each marker's Google Maps search link for live directions and verify exact pins before public launch. OpenStreetMap map tiles require an internet connection and are subject to the tile provider's usage policy.

## Important prototype limitations carried forward
- The original app labels ratings/times as sample values; this website does not present those as verified facts.
- Business names and cultural descriptions are reproduced from the supplied app content. Verify current operations and culturally sensitive material with local stakeholders before publishing.
- Website language switch supports English and Bahasa Indonesia for its content sections.
- This is a static website prototype. It does not yet share account data, saved places, or user profiles with the mobile app; no backend/API was present in the supplied source.
