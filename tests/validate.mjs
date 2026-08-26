import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LOCALE_META, SUPPORTED_LOCALES, UI, localized, t } from "../data/i18n.js";
import {
  ACHIEVEMENTS,
  ALL_LESSONS,
  COURSE,
  PHRASES,
  SPEAKING_SCENARIOS,
  VOCABULARY,
} from "../data/course-data.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const locales = ["en", "zh", "vi", "ko"];

assert.deepEqual(SUPPORTED_LOCALES, locales, "Supported locale order should stay EN/ZH/VI/KO");
assert.deepEqual(Object.keys(LOCALE_META), locales, "Locale metadata must match the supported languages");

const englishKeys = Object.keys(UI.en).sort();
assert(englishKeys.length >= 150, "The interface dictionary should cover the full app");
for (const locale of locales) {
  assert.deepEqual(Object.keys(UI[locale]).sort(), englishKeys, `${locale} must have the same interface keys as English`);
  for (const key of englishKeys) {
    assert.equal(typeof UI[locale][key], "string", `${locale}.${key} must be a string`);
    assert(UI[locale][key].trim(), `${locale}.${key} must not be blank`);
  }
  assert.equal(typeof t(locale, "exerciseMeaning", { value: "물" }), "string");
}

assert.equal(COURSE.version, 2);
assert(COURSE.units.length >= 5, "At least five curriculum worlds are expected");
assert(ALL_LESSONS.length >= 17, "The expanded release should contain at least 17 lessons");
assert(VOCABULARY.length >= 60, "The expanded release should contain at least 60 vocabulary records");
assert(PHRASES.length >= 25, "The expanded release should contain at least 25 practical phrases");
assert.equal(SPEAKING_SCENARIOS.length, 4);
assert.equal(ACHIEVEMENTS.length, 5);

const vocabIds = new Set(VOCABULARY.map((item) => item.id));
assert.equal(vocabIds.size, VOCABULARY.length, "Vocabulary IDs must be unique");
const lessonIds = new Set();
const exerciseIds = new Set();
const exerciseTypes = new Map();
let exerciseCount = 0;

function assertLocalized(value, path) {
  assert(value && typeof value === "object", `${path} must be localized`);
  for (const locale of locales) {
    assert.equal(typeof value[locale], "string", `${path}.${locale} must be a string`);
    assert(value[locale].trim(), `${path}.${locale} must not be blank`);
    assert(localized(value, locale).trim(), `${path} must resolve in ${locale}`);
  }
}

for (const word of VOCABULARY) {
  assert(word.ko.trim(), `${word.id} needs Korean text`);
  assert(word.romanization.trim(), `${word.id} needs romanization`);
  assertLocalized(word.meaning, `vocabulary.${word.id}.meaning`);
  assertLocalized(word.exampleMeaning, `vocabulary.${word.id}.exampleMeaning`);
}

for (const phrase of PHRASES) {
  assert(phrase.id && phrase.ko && phrase.romanization);
  assertLocalized(phrase.meaning, `phrases.${phrase.id}.meaning`);
  assertLocalized(phrase.note, `phrases.${phrase.id}.note`);
  assertLocalized(phrase.grammar, `phrases.${phrase.id}.grammar`);
  assert(Array.isArray(phrase.tokens) && phrase.tokens.length >= 1);
}

for (const unit of COURSE.units) {
  assertLocalized(unit.title, `unit.${unit.id}.title`);
  assertLocalized(unit.subtitle, `unit.${unit.id}.subtitle`);
  assert(unit.lessons.length >= 1, `${unit.id} should contain playable lessons`);
  for (const lesson of unit.lessons) {
    assert(!lessonIds.has(lesson.id), `Duplicate lesson ID: ${lesson.id}`);
    lessonIds.add(lesson.id);
    assertLocalized(lesson.title, `lesson.${lesson.id}.title`);
    assertLocalized(lesson.subtitle, `lesson.${lesson.id}.subtitle`);
    assertLocalized(lesson.description, `lesson.${lesson.id}.description`);
    assertLocalized(lesson.objectives, `lesson.${lesson.id}.objectives`);
    assert(lesson.duration >= 3 && lesson.duration <= 12, `${lesson.id} should be bite-sized`);
    assert.equal(lesson.exercises.length, 5, `${lesson.id} should contain five focused exercises`);
    for (const vocabularyId of lesson.vocabularyIds) {
      assert(vocabIds.has(vocabularyId), `${lesson.id} references missing vocabulary ${vocabularyId}`);
    }

    for (const exercise of lesson.exercises) {
      exerciseCount += 1;
      assert(!exerciseIds.has(exercise.id), `Duplicate exercise ID: ${exercise.id}`);
      exerciseIds.add(exercise.id);
      exerciseTypes.set(exercise.type, (exerciseTypes.get(exercise.type) ?? 0) + 1);
      assert(exercise.answer !== undefined && exercise.answer !== null, `${exercise.id} needs an answer`);
      assertLocalized(exercise.explanation, `exercise.${exercise.id}.explanation`);
      assertLocalized(exercise.hint, `exercise.${exercise.id}.hint`);
      if (exercise.meaning) assertLocalized(exercise.meaning, `exercise.${exercise.id}.meaning`);
      if (exercise.question && typeof exercise.question === "object") assertLocalized(exercise.question, `exercise.${exercise.id}.question`);
      if (exercise.promptMeaning) assertLocalized(exercise.promptMeaning, `exercise.${exercise.id}.promptMeaning`);
      if (exercise.grammar) assertLocalized(exercise.grammar, `exercise.${exercise.id}.grammar`);
      if (exercise.culture) assertLocalized(exercise.culture, `exercise.${exercise.id}.culture`);
      for (const vocabularyId of exercise.vocabularyIds ?? []) {
        assert(vocabIds.has(vocabularyId), `${exercise.id} references missing vocabulary ${vocabularyId}`);
      }
      if (exercise.choices) {
        assert(exercise.choices.length >= 2, `${exercise.id} needs at least two choices`);
        assert(exercise.choices.some((choice) => String(choice.value) === String(exercise.answer)), `${exercise.id} choices must include its answer`);
        for (const choice of exercise.choices) assertLocalized(choice.meaning, `exercise.${exercise.id}.choice.${choice.value}`);
      }
      if (Array.isArray(exercise.answer)) {
        assert(Array.isArray(exercise.tokens), `${exercise.id} array answers need tokens`);
        for (const token of exercise.answer) assert(exercise.tokens.includes(token), `${exercise.id} tokens must include ${token}`);
      }
    }
  }
}

assert.equal(exerciseCount, 85, "Release content should contain 85 exercises");
assert(exerciseTypes.size >= 12, "At least 12 interaction types should be represented");
for (const expected of ["meaning", "listening", "order", "type", "dialogue", "speak", "read", "trace", "build", "grammar", "reading", "cloze"]) {
  assert(exerciseTypes.has(expected), `Missing interaction type: ${expected}`);
}

for (const scenario of SPEAKING_SCENARIOS) {
  assert(UI.en[scenario.titleKey], `${scenario.id} references a missing UI title`);
  assertLocalized(scenario.promptMeaning, `scenario.${scenario.id}.promptMeaning`);
  assertLocalized(scenario.answerMeaning, `scenario.${scenario.id}.answerMeaning`);
}

const files = [
  "index.html", "styles.css", "app.js", "sw.js", "manifest.webmanifest", "moru-mark.svg",
  "data/i18n.js", "data/course-data.js", "data/locales/en.js", "data/locales/zh.js", "data/locales/vi.js", "data/locales/ko.js",
  "app/core.js", "app/events.js", "styles/base.css", "styles/player.css",
];
for (const file of files) {
  const contents = await readFile(join(root, file), "utf8");
  assert(contents.trim(), `${file} must exist and not be empty`);
}

const indexHtml = await readFile(join(root, "index.html"), "utf8");
assert(indexHtml.includes('viewport-fit=cover'), "Mobile safe-area viewport support is required");
assert(indexHtml.includes('type="module" src="./app.js"'), "The application module must be loaded");
assert(indexHtml.includes('rel="manifest"'), "PWA manifest must be linked");

const appSource = (await Promise.all([
  "app.js", "app/core.js", "app/onboarding-shell.js", "app/pages.js", "app/lesson.js", "app/review-speech.js", "app/events.js",
].map((file) => readFile(join(root, file), "utf8")))).join("\n");
assert(appSource.includes("migrateLegacy"), "Existing v1 browser progress must be migrated");
assert(appSource.includes("SpeechRecognition"), "Speaking practice should support device recognition when available");
assert(appSource.includes("serviceWorker.register"), "The PWA service worker must be registered");
assert(!appSource.includes('settings.language:Wa([`en`,`es`,`ja`])'), "Old unsupported locale schema must not remain");

const css = (await Promise.all([
  "styles.css", "styles/base.css", "styles/onboarding.css", "styles/learn.css", "styles/practice-words-profile.css", "styles/player.css", "styles/completion-speaking-responsive.css",
].map((file) => readFile(join(root, file), "utf8")))).join("\n");
assert(css.includes("--tap: 48px"), "Touch targets must use a 48px minimum token");
assert(css.includes("env(safe-area-inset-bottom"), "Mobile safe-area insets must be supported");
assert(css.includes("prefers-reduced-motion"), "Reduced-motion preferences must be respected");
assert(css.includes('@media (min-width: 1040px)'), "A wider-screen navigation layout must exist");

const manifest = JSON.parse(await readFile(join(root, "manifest.webmanifest"), "utf8"));
assert.equal(manifest.display, "standalone");
assert.equal(manifest.orientation, "portrait-primary");
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 1);

console.log(`✓ ${locales.length} complete interface locales`);
console.log(`✓ ${COURSE.units.length} units, ${ALL_LESSONS.length} lessons, ${exerciseCount} exercises`);
console.log(`✓ ${exerciseTypes.size} interaction types: ${[...exerciseTypes.keys()].join(", ")}`);
console.log(`✓ ${VOCABULARY.length} words, ${PHRASES.length} phrases, ${SPEAKING_SCENARIOS.length} speaking scenes`);
console.log("✓ Mobile, PWA, migration, and accessibility guards validated");
