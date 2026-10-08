# How a trip-planner app gets built

This is the process followed for Wayfare, from idea to an app on your phone.

## 1. Define the job

A person gives three inputs: where they are going, when, and which spots they want to visit. The app turns that into a plan. A photo library lets them decorate the trip before they leave.

Keep the first version to that one flow. Maps, bookings and sharing come later.

## 2. Pick the app type

| Option | Needs | Good for |
| --- | --- | --- |
| PWA (used here) | A browser and a free GitHub account | Fast demos, installs from a link |
| Native iOS (SwiftUI) | Mac, Xcode, Apple Developer account for installing beyond 7 days | Full device features, App Store |
| Wrapped web app (Capacitor) | The PWA plus Xcode | Reusing the web code as an App Store app |

A PWA is the quickest route to a real icon on your Home Screen. The code here can later be wrapped with Capacitor if you want the App Store.

## 3. Model the data

```
Trip  { id, destination, start, end, cover, photos[], spots[] }
Spot  { id, name, day }       day = 0 for the first day of the trip
Photo { id }                  image data lives in IndexedDB under that id
```

Trips are small, so they go in `localStorage`. Photos are large, so they go in IndexedDB after being resized to 1400 px.

## 4. Design the screens

1. **Trips**: a list of postcard-style cards with the cover photo and day count.
2. **New trip**: destination, dates, places, cover photo.
3. **Trip, Plan tab**: one section per day with its places.
4. **Trip, Photos tab**: the photo library for that trip.

The look borrows from airmail: red and blue stripes, a stamp for the day count, and photos shown like prints.

## 5. Build the plan logic

When a trip is created, the places are split evenly across the days in the order typed: with 5 places and 3 days, the days get 2, 2 and 1. The person can then move any place to another day.

## 6. Make it installable

- `manifest.webmanifest` gives the name, colours and icons.
- `index.html` adds the Apple meta tags and `apple-touch-icon` so Safari offers a proper Home Screen app.
- `sw.js` caches the files so the app opens offline.

## 7. Deploy

Push to GitHub. The workflow in `.github/workflows/pages.yml` publishes the folder to GitHub Pages over HTTPS, which iOS requires for installing a PWA.

## 8. What to build next

- Edit dates and rename a trip.
- Reorder places inside a day, and add times.
- Search for places and show them on a map.
- Export or share a trip as a PDF or image.
- Cloud sync, so trips and photos survive a phone change.
