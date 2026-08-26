import { LOCALE_META, SUPPORTED_LOCALES, localized, normalizeLocale, t } from "./data/i18n.js";
import {
  ACHIEVEMENTS,
  ALL_LESSONS,
  COURSE,
  LESSON_BY_ID,
  SPEAKING_SCENARIOS,
  VOCABULARY,
  VOCAB_BY_ID,
} from "./data/course-data.js";

Object.assign(globalThis, {
  LOCALE_META,
  SUPPORTED_LOCALES,
  localized,
  normalizeLocale,
  t,
  ACHIEVEMENTS,
  ALL_LESSONS,
  COURSE,
  LESSON_BY_ID,
  SPEAKING_SCENARIOS,
  VOCABULARY,
  VOCAB_BY_ID,
});

const APP_PARTS = [
  "./app/core.js",
  "./app/onboarding-shell.js",
  "./app/pages.js",
  "./app/lesson.js",
  "./app/review-speech.js",
  "./app/events.js",
];

async function loadApplication() {
  for (const src of APP_PARTS) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.append(script);
    });
  }
}

loadApplication().catch((error) => {
  console.error(error);
  document.querySelector("#root").innerHTML = `
    <main style="max-width:42rem;margin:4rem auto;padding:1rem;font-family:system-ui,sans-serif">
      <h1>Moru could not start</h1>
      <p>Please reload the page. Your local learning progress has not been erased.</p>
    </main>`;
});
