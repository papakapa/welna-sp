# Welna SP

Mental Math Trainer

One-minute sessions to train speed, accuracy, and raw calculation focus.

## Quick start

### Option A — one command (recommended)

```bash
./start.sh
```

This will:
- install `web/` dependencies (using `npm ci` when possible)
- start the web dev server
- open the app in your default browser

### Option B — manual

```bash
cd web
npm ci
npm run dev
```

Then open `http://localhost:5173`.

## Requirements

- Node.js + npm

## Project structure

- `web/`: the frontend (Vite + React)

## Common commands (from repo root)

```bash
npm run start       # runs ./start.sh
npm run web:dev     # runs web dev server
npm run web:build   # builds production bundle
npm run web:preview # previews production build
```