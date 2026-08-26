const CACHE_NAME = "moru-v2.0.0";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./app/core.js",
  "./app/onboarding-shell.js",
  "./app/pages.js",
  "./app/lesson.js",
  "./app/review-speech.js",
  "./app/events.js",
  "./styles/base.css",
  "./styles/onboarding.css",
  "./styles/learn.css",
  "./styles/practice-words-profile.css",
  "./styles/player.css",
  "./styles/completion-speaking-responsive.css",
  "./data/i18n.js",
  "./data/course-data.js",
  "./data/vocabulary.js",
  "./data/phrases.js",
  "./data/scenarios.js",
  "./data/achievements.js",
  "./data/locales/en.js",
  "./data/locales/zh.js",
  "./data/locales/vi.js",
  "./data/locales/ko.js",
  "./data/vocabulary/part-1.js",
  "./data/vocabulary/part-2.js",
  "./data/phrases/part-1.js",
  "./data/phrases/part-2.js",
  "./data/lessons/advanced-argument.js",
  "./data/lessons/batchim-basics.js",
  "./data/lessons/cafe-restaurant.js",
  "./data/lessons/culture-honorifics.js",
  "./data/lessons/friends-plans.js",
  "./data/lessons/grammar-connectors.js",
  "./data/lessons/greetings-intros.js",
  "./data/lessons/hangul-consonants.js",
  "./data/lessons/hangul-vowels.js",
  "./data/lessons/news-opinions.js",
  "./data/lessons/numbers-shopping.js",
  "./data/lessons/syllable-blocks.js",
  "./data/lessons/time-routine.js",
  "./data/lessons/topik-mini.js",
  "./data/lessons/transit-directions.js",
  "./data/lessons/weather-home.js",
  "./data/lessons/workplace.js",

  "./manifest.webmanifest",
  "./moru-mark.svg",
  "./assets/noto-sans-kr-korean-400-normal-CmjJz_gz.woff2",
  "./assets/noto-sans-kr-korean-700-normal-DvnDzSjd.woff2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html")),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
