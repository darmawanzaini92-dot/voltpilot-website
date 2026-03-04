# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoltPilot Website — a static marketing site for an EV charger finder and trip planning mobile app. Built with vanilla JS, styled with Tailwind CSS, and deployed on Netlify.

## Commands

```bash
npm run dev       # Vite dev server on port 3000
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
```

No test runner or linter is configured.

## Architecture

- **Single-page static site**: `index.html` (main markup + Tailwind styling) + `src/main.js` (all JS logic)
- **Build**: Vite 5 with `VITE_` env var prefix; output to `dist/`
- **Deploy**: Netlify (`netlify.toml`) — auto-builds on push, Node 18
- **External libs loaded via CDN**: Firebase SDK 10.7.1, Globe.GL, Tailwind CSS, Google Fonts (Roboto)
- **No npm runtime dependencies** — only Vite as a dev dependency

## Key Technical Details

- **Firebase Firestore** provides live data: fetches `route_planned_events` collection (latest 20, ordered by timestamp), auto-refreshes every 60s
- **Globe.GL** renders a 3D Earth with route arcs (origin→destination) and fallback points (origin-only)
- **Environment variables** (Firebase config): defined in `.env`, template in `.env.example`. All prefixed `VITE_FIREBASE_*`
- **Theme**: Deep space black (`#121212`), VoltPilot Orange (`#F86A28`), glass-morphism effects
- **Contact form**: Handled by Formspree (no backend needed)

## App Store URLs

- **iOS**: https://apps.apple.com/app/voltpilot/id6758271158 (Apple ID: 6758271158)
- **Android**: https://play.google.com/store/apps/details?id=com.wawanz.voltpilot (Bundle ID: com.wawanz.voltpilot)

## Firestore Data Model

Collection `route_planned_events`:
- `origin_lat`, `origin_long` (required)
- `destination_lat`, `destination_long` (optional — absence triggers point fallback)
- `timestamp` (used for ordering)
