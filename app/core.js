const STORAGE_KEY = "moru.progress.v2";
const LEGACY_KEY = "moru.progress.v1";
const REVIEW_INTERVALS = [1, 3, 7, 14, 30];
const root = document.querySelector("#root");

if (!root) throw new Error("Moru could not find the app root.");

const EXERCISE_BY_ID = new Map(
  ALL_LESSONS.flatMap((lesson) => lesson.exercises.map((exercise) => [exercise.id, { exercise, lessonId: lesson.id }])),
);

let saveWarning = "";
let online = navigator.onLine;
let deferredInstallPrompt = null;
let installDismissed = sessionStorage.getItem("moru.install.dismissed") === "1";
let onboardingStep = 0;
let onboardingDraft = { goal: "travel", level: "new" };
let levelFilter = "all";
let wordQuery = "";
let wordFilter = "all";
let resetArmed = false;
let activeLessonSession = null;
let activeReviewSession = null;
let speakingResult = "";
let speakingListening = false;
let liveMessage = "";

const initialLocale = normalizeLocale(
  new URLSearchParams(window.location.search).get("lang") || navigator.languages?.[0] || navigator.language || "en",
);
let progress = syncDaily(loadProgress(initialLocale));

function createDefaultProgress(locale = "en") {
  return {
    version: 2,
    onboardingComplete: false,
    locale: normalizeLocale(locale),
    goal: "travel",
    startLevel: "new",
    xp: 0,
    hearts: 5,
    streak: 0,
    lastStudyDate: null,
    totalMinutes: 0,
    completedLessons: {},
    lessonResults: {},
    wordStats: {},
    reviewItems: {},
    currentLessonId: ALL_LESSONS[0]?.id ?? null,
    achievements: [],
    speakingCompleted: {},
    settings: {
      audio: true,
      romanization: true,
      theme: "system",
      dailyGoal: 10,
    },
    daily: {
      date: dayKey(),
      xp: 0,
      minutes: 0,
      lessons: 0,
      reviews: 0,
    },
  };
}

function loadProgress(locale) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return validateProgress(JSON.parse(raw), locale);
  } catch (error) {
    saveWarning = "Saved progress could not be read. Moru started with a safe local copy.";
    console.warn(error);
  }

  try {
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const migrated = migrateLegacy(JSON.parse(legacyRaw), locale);
      localStorage.setItem(`${LEGACY_KEY}.backup`, legacyRaw);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (error) {
    console.warn("Legacy progress migration failed", error);
  }

  return createDefaultProgress(locale);
}

function validateProgress(value, fallbackLocale) {
  const base = createDefaultProgress(fallbackLocale);
  if (!value || typeof value !== "object") return base;
  const locale = SUPPORTED_LOCALES.includes(value.locale) ? value.locale : base.locale;
  return {
    ...base,
    ...value,
    version: 2,
    locale,
    completedLessons: value.completedLessons && typeof value.completedLessons === "object" ? value.completedLessons : {},
    lessonResults: value.lessonResults && typeof value.lessonResults === "object" ? value.lessonResults : {},
    wordStats: value.wordStats && typeof value.wordStats === "object" ? value.wordStats : {},
    reviewItems: value.reviewItems && typeof value.reviewItems === "object" ? value.reviewItems : {},
    achievements: Array.isArray(value.achievements) ? value.achievements : [],
    speakingCompleted: value.speakingCompleted && typeof value.speakingCompleted === "object" ? value.speakingCompleted : {},
    settings: { ...base.settings, ...(value.settings ?? {}) },
    daily: { ...base.daily, ...(value.daily ?? {}) },
  };
}

function migrateLegacy(legacy, fallbackLocale) {
  const base = createDefaultProgress(fallbackLocale);
  const legacyLocale = legacy?.settings?.language;
  const locale = SUPPORTED_LOCALES.includes(legacyLocale) ? legacyLocale : fallbackLocale;
  const completedLessons = Object.fromEntries(
    (legacy?.completedLessonIds ?? []).map((id) => [id, { completedAt: new Date().toISOString(), accuracy: 100 }]),
  );
  const wordStats = {};
  for (const [id, stats] of Object.entries(legacy?.vocabularyMastery ?? {})) {
    wordStats[id] = {
      seen: Math.max(1, Number(stats.correct ?? 0) + Number(stats.wrong ?? 0)),
      correct: Number(stats.correct ?? 0),
      wrong: Number(stats.wrong ?? 0),
      lastSeenAt: stats.lastSeenAt ?? new Date().toISOString(),
    };
  }
  const currentLesson = ALL_LESSONS.find((lesson) => !completedLessons[lesson.id])?.id ?? ALL_LESSONS.at(-1)?.id ?? null;
  return {
    ...base,
    onboardingComplete: Boolean(legacy?.onboardingComplete),
    locale: normalizeLocale(locale),
    goal: "travel",
    startLevel: legacy?.selectedLevel === "placement" ? "everyday" : legacy?.selectedLevel ?? "new",
    xp: Number(legacy?.xp ?? 0),
    hearts: Math.max(1, Math.min(5, Number(legacy?.hearts ?? 5))),
    streak: Number(legacy?.streak ?? 0),
    lastStudyDate: legacy?.lastStudyDate ?? null,
    totalMinutes: Number(legacy?.totalMinutes ?? 0),
    completedLessons,
    lessonResults: legacy?.lessonResults ?? {},
    wordStats,
    reviewItems: legacy?.reviewItems ?? {},
    currentLessonId: currentLesson,
    achievements: legacy?.achievements ?? [],
    settings: {
      ...base.settings,
      audio: legacy?.settings?.audioEnabled ?? true,
    },
  };
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    saveWarning = "";
  } catch (error) {
    saveWarning = "This browser blocked local saving. Keep this tab open or export a backup from Profile.";
    console.warn(error);
  }
}

function updateProgress(updater, { renderNow = true } = {}) {
  progress = syncDaily(typeof updater === "function" ? updater(progress) : updater);
  saveProgress();
  if (renderNow) render();
}

function syncDaily(value) {
  const today = dayKey();
  if (value.daily?.date === today) return value;
  return {
    ...value,
    hearts: 5,
    daily: { date: today, xp: 0, minutes: 0, lessons: 0, reviews: 0 },
  };
}

function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromDayKey(key) {
  const [year, month, day] = String(key).split("-").map(Number);
  return new Date(year, Math.max(0, (month || 1) - 1), day || 1);
}

function daysBetween(a, b) {
  return Math.round((dateFromDayKey(b).getTime() - dateFromDayKey(a).getTime()) / 86400000);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next.toISOString();
}

function markStudyDay(value) {
  const today = dayKey();
  if (value.lastStudyDate === today) return value;
  const streak = value.lastStudyDate && daysBetween(value.lastStudyDate, today) === 1 ? value.streak + 1 : 1;
  return { ...value, lastStudyDate: today, streak };
}

function levelNumber(xp) {
  return Math.floor(xp / 250) + 1;
}

function locale() {
  return progress.locale;
}

function text(key, values) {
  return t(locale(), key, values);
}

function h(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loc(value) {
  return localized(value, locale());
}

function attr(value) {
  return h(value).replaceAll("`", "&#096;");
}

function routeParts() {
  return window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
}

function go(path) {
  window.location.hash = path.startsWith("#") ? path : `#/${path.replace(/^\//, "")}`;
}

function applyDocumentPreferences() {
  const meta = LOCALE_META[locale()] ?? LOCALE_META.en;
  document.documentElement.lang = meta.htmlLang;
  document.documentElement.dataset.theme = progress.settings.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", progress.settings.theme === "dark" ? "#102a27" : "#f36f45");
  document.title = `${text("appName")} — ${text("tagline")}`;
}

function render() {
  applyDocumentPreferences();
  progress = syncDaily(progress);
  const [route = "learn", id] = routeParts();

  if (!progress.onboardingComplete) {
    root.innerHTML = renderOnboarding();
  } else if (route === "lesson") {
    root.innerHTML = renderLessonPlayer(id);
  } else if (route === "review" && activeReviewSession?.started) {
    root.innerHTML = renderReviewPlayer();
  } else if (route === "speak") {
    root.innerHTML = renderSpeakingPlayer(id);
  } else {
    root.innerHTML = renderShell(route);
  }

  setupTraceCanvas();
  const focusTarget = root.querySelector("[data-auto-focus]");
  if (focusTarget instanceof HTMLElement) requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
  window.__MORU_READY__ = true;
}
