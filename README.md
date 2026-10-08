# Wayfare

A small demo app that plans a trip. You enter where you are going, the dates and the places you want to see. Wayfare spreads those places across your days. You can then add photos from your own library and pick one as the trip cover.

It is a Progressive Web App (PWA), so it installs on an iPhone from Safari. It needs no App Store account, no Xcode and no build step.

## What the demo does

- Create a trip: destination, dates, places to visit (one per line), optional cover photo.
- Day-by-day plan: places are spread across the days. Move a place to another day, add one, or remove one.
- Photo library: add photos from the iPhone library, pick a cover, delete photos. Photos are shrunk and stored on the device.
- Works offline once installed. All data stays on the phone.

## Install on your iPhone

1. Push this repo to GitHub (see below) and wait for the **Deploy to GitHub Pages** action to finish.
2. On the iPhone, open `https://<your-username>.github.io/<repo-name>/` in **Safari**.
3. Tap the Share button, then **Add to Home Screen**, then **Add**.
4. Open Wayfare from the Home Screen. It runs full screen like a normal app.

## Put it on GitHub

```bash
git init
git add .
git commit -m "Wayfare trip planner demo"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then in the repo go to **Settings > Pages** and set **Source** to **GitHub Actions**. Every push to `main` redeploys the app.

## Run it locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. Service workers only run on `localhost` or HTTPS, so opening `index.html` as a file will not install.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | App shell and iPhone home-screen settings |
| `styles.css` | Layout and look, with dark mode |
| `app.js` | All app logic: trips, plan, photo library |
| `manifest.webmanifest` | Name, icons and colours used when installed |
| `sw.js` | Service worker for offline use |
| `icons/` | App icons (180, 192 and 512 px) |
| `.github/workflows/pages.yml` | Deploys the app to GitHub Pages |
| `docs/PROCESS.md` | How the app was designed and built, step by step |

## Known limits of the demo

- Data is stored in the browser on one device. Clearing Safari website data deletes it. There is no sync or backup.
- No maps, routing or weather. Places are plain text.
- If you change files after installing, close the app fully and reopen it once or twice to pick up the update.
