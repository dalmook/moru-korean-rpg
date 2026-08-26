# Moru Korean RPG

Moru is a mobile-first Korean learning RPG that runs entirely in the browser. Version 2 expands the original English-only launch into a four-language experience and a broader curriculum from Hangul foundations through advanced reading and TOPIK-style tasks.

## What changed in v2

- **Four complete interface languages:** English, Simplified Chinese, Vietnamese, and Korean. Menus, onboarding, instructions, hints, explanations, grammar notes, culture notes, word meanings, and examples change together.
- **Mobile-first navigation:** sticky status header, thumb-friendly bottom navigation, 48px minimum targets, safe-area support, and a focused full-screen lesson player.
- **Expanded curriculum:** 5 units, 17 lessons, 85 exercises, 63 vocabulary records, and 26 practical phrases from A0 to C1 / TOPIK I–II.
- **Twelve exercise formats:** meaning, listening, ordering, typing, dialogue, speaking, reading, tracing, block building, grammar, cloze, and passage comprehension.
- **Learning loop:** XP, hearts, streaks, lesson stars, achievements, daily goals, word mastery, weak-point review, and spaced repetition.
- **Speaking practice:** Korean text-to-speech plus on-device speech recognition when the browser supports it. Voice is not uploaded or stored.
- **Offline-friendly PWA:** installable manifest and service-worker app shell.
- **Progress protection:** existing `moru.progress.v1` browser data is backed up and migrated into the v2 schema.
- **Accessibility:** keyboard focus states, semantic landmarks, live feedback, reduced-motion support, high-contrast themes, and text alternatives for audio.

## Run locally

No build step or external package is required.

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173` in a browser.

## Validate

```bash
npm test
npm run check
```

The test suite checks translation-key parity, localized content completeness, unique IDs, answer integrity, vocabulary links, curriculum counts, interaction coverage, PWA files, migration support, and mobile accessibility guards.

## Project structure

```text
.
├── app.js                 # Module bootstrap
├── app/                   # State, pages, lesson engine, speech, and event handlers
├── styles.css             # Modular stylesheet entry point
├── styles/                # Mobile-first design system and responsive layouts
├── data/
│   ├── i18n.js            # Four-language interface index
│   ├── locales/           # English, Chinese, Vietnamese, and Korean dictionaries
│   ├── lessons/           # One validated module per lesson
│   └── course-data.js     # Curriculum index, words, phrases, and scenarios
├── tests/validate.mjs     # Content and release validation
├── index.html
├── manifest.webmanifest
├── sw.js
└── moru-mark.svg
```

## Content authoring rules

1. Keep stable, unique IDs for units, lessons, exercises, words, and phrases.
2. Every localized object must include `en`, `zh`, `vi`, and `ko` strings.
3. Each choice-based exercise must include its answer among the choices.
4. Every referenced vocabulary ID must exist in `VOCABULARY`.
5. Keep lessons short and focused; the launch pattern is five exercises per lesson.
6. Run `npm test` before merging content changes.

## Privacy

Moru requires no account. Progress, settings, review dates, and achievements are stored in the current browser using `localStorage`. Speech recognition is requested only after a learner taps the microphone, and Moru does not save or upload voice recordings.
