# 日課 — Nikka · Japanese Daily Tracker

A single-file app for learning to **read** Japanese from zero — built around one goal: get you to the point where you can play games in Japanese, from kana-only titles all the way up to text-heavy visual novels. No build step, no dependencies, no backend. Just one `index.html`.

Bilingual (English / Spanish), works on your phone, and everything lives on your device.

## What it is

Nikka started as a habit checklist and grew into a small, self-contained study engine. It teaches the two kana syllabaries with real spaced repetition, then layers reading, vocabulary, and short exercises on top — all gated so new material only unlocks once the previous material is solid. The design is deliberately **anti-Duolingo**: gamified and motivating, never punitive. No streak-shaming, no fake urgency, no lost hearts.

## Features

**Kana drill engine (hiragana + katakana).** Per-script SRS boxes with real cross-day scheduling, a mastery-gated pool so new characters only appear once earlier ones stick, confusable-aware wrong answers (ね/れ/わ, シ/ツ/ソ/ン, and friends), and leech re-teaching that resurfaces a mnemonic card when a character keeps tripping you up. A 4-level ladder walks you from hiragana → hiragana dakuten → katakana → katakana dakuten.

**Reading engine.** Once you know enough kana, words and fixed phrases enter the mix — with recognition quizzes in read / listen / recall modes. Content is gated to *only what you've already learned*, so you never get shown a word built from kana you haven't met.

**Exercises.** Beyond the core drill: *Armar la palabra* (build a word from kana tiles, with cloze and full-word variants) and *Emparejar* (kana↔romaji matching, silent by default so it's usable on the bus). A daily orchestrator interleaves drilling, matching, and word-building, shifting the balance as your mastery grows.

**Teach cards.** First exposure to any new character or word comes through a dedicated teach card (with audio, romaji, meaning, and a mnemonic) — it's the single front door for new material, so nothing sneaks in unlearned.

**"What can I play?"** A readiness ladder that answers the real question: *am I ready for this game yet?* Each title gets one of three honest verdicts — **Not yet**, **Playable with a dictionary**, or **Ready!** — based on your kana mastery plus how much of that game's core menu vocabulary you can actually read. Instead of a bare percentage, it tells you what's missing ("need katakana" or "5 more menu words").

**Progress & gamification.** Streak tracking with a hanko-style 済 ("done") seal stamped on each completed day, milestone ticks on the progress bars, a stage-by-stage "path" view, a 4-week calendar, and a date-seeded word of the day.

**Comfort.** Dark mode, EN/ES toggle, and installable to your phone's home screen.

## The learning model, in one breath

Everything is **mastery-gated**: characters, words, and games all unlock only when the material beneath them is solid. Reading mastery is measured separately from mere familiarity, so the numbers don't inflate. One coherent system — shared stats, shared pools, shared progress bars — rather than a pile of disconnected mini-games.

## Extending the game ladder

Adding a new game to "What can I play?" is a one-object edit. Append to the `GAMES` array in `index.html` with a name, a rung, and a word list — each word carrying its own teach data:

```js
{ id:'digimon', rung:2,
  name:{ es:'Digimon', en:'Digimon' },
  mode:{ es:'kana + furigana', en:'kana + furigana' },
  words:[
    { jp:'しんか', romaji:'shinka', es:'evolución', en:'evolve', emoji:'🌀' },
    // ...the game's core menu vocabulary
  ]
}
```

Any word not already in the app's pool is folded in automatically, so both the readiness verdict **and** the teachable content light up with no other changes. Thresholds (`READY_KANA_DEFAULT`, `READY_DICT`, `READY_COMFY`) are tunable constants at the top of the same block.

## Run it

Open `index.html` in any browser. For the intended "app on my phone" experience, host it and add it to your home screen.

### Host on GitHub Pages

1. Put `index.html` in the repo root.
2. **Settings → Pages → Source: Deploy from branch → `main` / `root` → Save.**
3. Open the resulting `https://<user>.github.io/<repo>/` URL in Safari → **Share → Add to Home Screen**.

## Data & privacy

Progress is saved in your browser via `localStorage` — it lives on your device, per-browser and per-device, and does **not** sync across devices. Don't clear the page's site data, or your progress and streak reset. There's an export/import panel in-app for moving your data or keeping a backup.

## Stack

Plain HTML/CSS/JS in a single file — no framework, no build. Fonts: Shippori Mincho, Zen Kaku Gothic New, and Noto Sans JP (Google Fonts). Study resources link out to Tofugu, AnkiWeb, the Kaishi 1.5k deck, Tae Kim's grammar guide, and HelloTalk.
