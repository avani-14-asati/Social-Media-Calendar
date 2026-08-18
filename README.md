# Social Media Calendar

A shared, live-updating content calendar for planning Instagram & LinkedIn posts by day. Anyone with the link can view, add, edit, and check off posts — changes sync for everyone within a few seconds via Firebase.

## Live site
https://avani-14-asati.github.io/Social-Media-Calendar/

## Project structure
```
index.html          — page markup
style.css            — all styling
app.js               — calendar logic, modal handling, rendering
firebase-config.js   — Firebase project setup + Firestore read/write helpers
```

## How it works
- Posts are stored in a Firestore collection called `posts` (one document per post).
- `firebase-config.js` initializes Firebase and exposes `window.fb.loadAll() / savePost() / deletePost()`.
- `app.js` calls those helpers to load, save, and delete posts, and re-renders the calendar grid.
- The page polls Firestore every 8 seconds so everyone sees each other's edits without a manual refresh (paused while a modal is open, so it doesn't interrupt someone mid-edit).

## Making changes
Edit the files locally, then commit + push to `main` — GitHub Pages rebuilds automatically (usually live within 1–2 minutes). Hard-refresh (Ctrl/Cmd+Shift+R) if the browser is showing a cached version.

## Firebase project
Project: `bits-content-calendar` (Firestore, Spark/free plan).
Security rules currently allow open read/write — fine for an internal team tool, but avoid putting sensitive data in it. If you want to restrict access later, look at Firebase Authentication + tightening the Firestore rules.
