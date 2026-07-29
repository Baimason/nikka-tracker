# 日課 — Nikka · Japanese Daily Tracker

A tiny, single-file habit tracker for learning Japanese from scratch. No build step,
no dependencies, no backend — just one `index.html`.

## What it does

- **Phase-aware checklist** that changes with your week: hiragana → katakana + Anki →
  the full daily routine (Anki + grammar + immersion) → speaking practice.
- **Streak tracking** with a hanko-style 済 ("done") seal that stamps each completed day.
- **A 6-week roadmap** and a 4-week calendar view.
- **Quick links** to the resources you actually use daily (Tofugu, AnkiWeb, the Kaishi 1.5k
  deck, Tae Kim's grammar guide, HelloTalk).
- Progress is saved in your browser via `localStorage` — it lives on **your device**.

## Run it

Just open `index.html` in a browser. For the intended "app on my phone" experience,
host it (see below) and add it to your home screen.

## Host on GitHub Pages

1. Put `index.html` in the repo root.
2. **Settings → Pages → Source:** Deploy from branch → `main` / `root` → Save.
3. Open the resulting `https://<user>.github.io/<repo>/` URL in Safari →
   **Share → Add to Home Screen.**

## Notes

- Progress is per-browser/per-device and does not sync across devices.
- Don't clear site data for the page, or the streak resets.

## Stack

Plain HTML/CSS/JS. Fonts: Shippori Mincho + Zen Kaku Gothic New (Google Fonts).
