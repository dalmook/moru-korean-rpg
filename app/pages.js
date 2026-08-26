function renderLearnPage() {
  const current = recommendedLesson();
  const done = completedCount();
  const percentage = Math.round((done / ALL_LESSONS.length) * 100);
  const dailyPercent = Math.min(100, Math.round((progress.daily.minutes / progress.settings.dailyGoal) * 100));
  const filters = [
    ["all", "allLevels"],
    ["beginner", "beginner"],
    ["intermediate", "intermediate"],
    ["advanced", "advanced"],
  ];
  return `
    <main class="page page--learn" id="main-content">
      <section class="welcome-row">
        <div>
          <p class="eyebrow">${h(text("learningPath"))}</p>
          <h1 data-auto-focus tabindex="-1">${h(done ? text("welcomeBack") : text("onboardingWelcome"))}</h1>
          <p>${h(text("goodStart"))}</p>
        </div>
        <div class="daily-ring" style="--value:${dailyPercent}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${dailyPercent}">
          <strong>${progress.daily.minutes}</strong><small>/${progress.settings.dailyGoal} ${h(text("minutes"))}</small>
        </div>
      </section>

      ${current ? renderCurrentQuest(current, percentage) : ""}

      <section class="metric-strip" aria-label="${h(text("today"))}">
        <article><span aria-hidden="true">◆</span><strong>${progress.daily.xp}</strong><small>${h(text("today"))} XP</small></article>
        <article><span aria-hidden="true">✓</span><strong>${progress.daily.lessons}</strong><small>${h(text("lessons"))}</small></article>
        <article><span aria-hidden="true">↻</span><strong>${dueReviewItems().length}</strong><small>${h(dueReviewItems().length === 1 ? text("reviewDue") : text("reviewsDue"))}</small></article>
      </section>

      <section class="path-section" aria-labelledby="path-title">
        <div class="section-heading">
          <div><p class="eyebrow">A0 → C1 · TOPIK</p><h2 id="path-title">${h(text("learningPath"))}</h2><p>${h(text("pathDescription"))}</p></div>
          <label class="level-filter"><span class="sr-only">${h(text("chooseLevel"))}</span><select data-filter-select="level">${filters.map(([id, key]) => `<option value="${id}" ${levelFilter === id ? "selected" : ""}>${h(text(key))}</option>`).join("")}</select></label>
        </div>
        <div class="course-units">
          ${COURSE.units.filter(unitMatchesLevel).map(renderUnit).join("")}
        </div>
      </section>

      ${!installDismissed ? renderInstallCard() : ""}
    </main>`;
}

function renderCurrentQuest(lesson, percentage) {
  const complete = Boolean(progress.completedLessons[lesson.id]);
  return `
    <section class="current-card" aria-labelledby="current-quest-title">
      <div class="current-card__art" aria-hidden="true"><span>${lesson.unitIcon}</span><i></i><i></i></div>
      <div class="current-card__copy">
        <div class="card-topline"><span>${h(text("currentQuest"))}</span><span>${percentage}%</span></div>
        <h2 id="current-quest-title">${h(loc(lesson.title))}</h2>
        <p>${h(loc(lesson.subtitle))}</p>
        <div class="lesson-meta"><span>◷ ${lesson.duration} ${h(text("minutes"))}</span><span>◎ ${lesson.exercises.length} ${h(text("exercises"))}</span><span>${h(lesson.level)}</span></div>
        <button class="button button--primary button--large" type="button" data-action="open-lesson" data-lesson-id="${attr(lesson.id)}">${h(complete ? text("resume") : text("startQuest"))}<span aria-hidden="true">→</span></button>
      </div>
      <div class="route-line" aria-hidden="true"><span style="width:${percentage}%"></span></div>
    </section>`;
}

function unitMatchesLevel(unit) {
  if (levelFilter === "all") return true;
  const rank = unit.level.includes("A0") || unit.level.includes("A1") ? "beginner" : unit.level.includes("A2") || unit.level.includes("B1") ? "intermediate" : "advanced";
  return rank === levelFilter;
}

function renderUnit(unit, unitIndex) {
  const lessonsDone = unit.lessons.filter((lesson) => progress.completedLessons[lesson.id]).length;
  const currentId = recommendedLesson()?.id;
  return `
    <article class="unit-card ${lessonsDone === unit.lessons.length ? "is-complete" : ""}">
      <header class="unit-card__header">
        <span class="unit-icon" aria-hidden="true">${unit.icon}</span>
        <div><small>${h(unit.level)} · ${lessonsDone}/${unit.lessons.length}</small><h3>${h(loc(unit.title))}</h3><p>${h(loc(unit.subtitle))}</p></div>
        <span class="unit-progress" style="--unit-progress:${unit.lessons.length ? (lessonsDone / unit.lessons.length) * 100 : 0}%"><i></i></span>
      </header>
      <div class="lesson-list">
        ${unit.lessons.map((lesson, index) => renderLessonCard(lesson, index, currentId)).join("")}
      </div>
    </article>`;
}

function renderLessonCard(lesson, index, currentId) {
  const result = progress.lessonResults[lesson.id];
  const complete = Boolean(progress.completedLessons[lesson.id]);
  const current = lesson.id === currentId;
  return `
    <button class="lesson-row ${complete ? "is-complete" : ""} ${current ? "is-current" : ""}" type="button" data-action="open-lesson" data-lesson-id="${attr(lesson.id)}">
      <span class="lesson-node" aria-hidden="true">${complete ? "✓" : current ? "가" : String(index + 1).padStart(2, "0")}</span>
      <span class="lesson-row__copy"><small>${lesson.duration} ${h(text("minutes"))} · ${h(lesson.level)}</small><strong>${h(loc(lesson.title))}</strong><span>${h(loc(lesson.subtitle))}</span></span>
      <span class="lesson-row__status">${result ? `${"★".repeat(result.stars ?? 1)}${"☆".repeat(3 - (result.stars ?? 1))}` : current ? h(text("recommended")) : "→"}</span>
    </button>`;
}

function renderInstallCard() {
  return `
    <section class="install-card">
      <span class="install-card__icon" aria-hidden="true">▣</span>
      <div><h2>${h(text("installTitle"))}</h2><p>${h(text("installBody"))}</p></div>
      <div class="install-card__actions">
        <button class="button button--secondary" type="button" data-action="install-app">${h(text("install"))}</button>
        <button class="button button--quiet" type="button" data-action="dismiss-install">${h(text("notNow"))}</button>
      </div>
    </section>`;
}

function dueReviewItems() {
  const now = Date.now();
  return Object.values(progress.reviewItems)
    .filter((item) => item?.exerciseId && EXERCISE_BY_ID.has(item.exerciseId) && new Date(item.dueAt).getTime() <= now)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

function renderPracticePage() {
  const due = dueReviewItems();
  return `
    <main class="page page--practice" id="main-content">
      <section class="page-heading">
        <p class="eyebrow">${h(text("review"))} · ${h(text("pronunciation"))} · ${h(text("listening"))}</p>
        <h1 data-auto-focus tabindex="-1">${h(text("practiceTitle"))}</h1>
        <p>${h(text("practiceDescription"))}</p>
      </section>

      <section class="review-hero ${due.length ? "has-due" : ""}">
        <div class="review-orbit" aria-hidden="true"><span>${due.length}</span><i></i><i></i><i></i></div>
        <div>
          <p class="eyebrow">${h(text("dueNow"))}</p>
          <h2>${due.length ? `${due.length} ${h(due.length === 1 ? text("reviewDue") : text("reviewsDue"))}` : h(text("noReviews"))}</h2>
          <p>${h(due.length ? text("practiceDescription") : text("noReviewsBody"))}</p>
          <button class="button button--primary button--large" type="button" data-action="start-review" ${due.length ? "" : "disabled"}>${h(text("startReview"))}<span aria-hidden="true">→</span></button>
        </div>
      </section>

      <section class="practice-section" aria-labelledby="quick-practice-title">
        <div class="section-heading"><div><p class="eyebrow">3–5 ${h(text("minutes"))}</p><h2 id="quick-practice-title">${h(text("quickPractice"))}</h2></div></div>
        <div class="practice-grid">
          ${renderPracticeShortcut("👂", text("listening"), loc(ALL_LESSONS[5]?.title), ALL_LESSONS[5]?.id)}
          ${renderPracticeShortcut("🗣️", text("pronunciation"), loc(ALL_LESSONS[4]?.title), ALL_LESSONS[4]?.id)}
          ${renderPracticeShortcut("급", "TOPIK", loc(ALL_LESSONS.at(-1)?.title), ALL_LESSONS.at(-1)?.id)}
        </div>
      </section>

      <section class="practice-section" aria-labelledby="speaking-title">
        <div class="section-heading"><div><p class="eyebrow">${h(text("speakingDescription"))}</p><h2 id="speaking-title">${h(text("speakingMissions"))}</h2></div></div>
        <div class="scenario-grid">
          ${SPEAKING_SCENARIOS.map((scenario) => `
            <button class="scenario-card" type="button" data-action="open-speaking" data-scenario-id="${scenario.id}">
              <span aria-hidden="true">${scenario.icon}</span><div><strong>${h(text(scenario.titleKey))}</strong><small lang="ko">${h(scenario.promptKo)}</small></div><i aria-hidden="true">→</i>
            </button>`).join("")}
        </div>
      </section>
    </main>`;
}

function renderPracticeShortcut(icon, title, subtitle, lessonId) {
  return `<button class="practice-card" type="button" data-action="open-lesson" data-lesson-id="${attr(lessonId)}"><span aria-hidden="true">${icon}</span><strong>${h(title)}</strong><small>${h(subtitle)}</small><i aria-hidden="true">→</i></button>`;
}

function learnedWords() {
  return VOCABULARY.filter((word) => (progress.wordStats[word.id]?.seen ?? 0) > 0);
}

function wordMastery(id) {
  const stats = progress.wordStats[id] ?? { correct: 0, wrong: 0, seen: 0 };
  return stats.correct - stats.wrong >= 2 || stats.correct >= 3 ? "familiar" : "learning";
}

function renderWordsPage() {
  const allLearned = learnedWords();
  const query = wordQuery.trim().toLocaleLowerCase();
  const visible = allLearned.filter((word) => {
    const mastery = wordMastery(word.id);
    const matchesFilter = wordFilter === "all" || wordFilter === mastery;
    const haystack = `${word.ko} ${word.romanization} ${loc(word.meaning)} ${word.example}`.toLocaleLowerCase();
    return matchesFilter && (!query || haystack.includes(query));
  });
  return `
    <main class="page page--words" id="main-content">
      <section class="page-heading">
        <p class="eyebrow">${allLearned.length}/${VOCABULARY.length}</p>
        <h1 data-auto-focus tabindex="-1">${h(text("wordsTitle"))}</h1>
        <p>${h(text("wordsDescription"))}</p>
      </section>
      <section class="word-tools">
        <label class="search-box"><span aria-hidden="true">⌕</span><input type="search" data-action="word-search" value="${attr(wordQuery)}" placeholder="${attr(text("searchWords"))}" /></label>
        <div class="segmented" role="group" aria-label="Word filter">
          ${[["all", "filterAll"], ["learning", "filterLearning"], ["familiar", "filterFamiliar"]].map(([id, key]) => `<button type="button" data-action="word-filter" data-filter="${id}" class="${wordFilter === id ? "is-active" : ""}" aria-pressed="${wordFilter === id}">${h(text(key))}</button>`).join("")}
        </div>
      </section>
      ${visible.length ? `<section class="word-grid">${visible.map(renderWordCard).join("")}</section>` : renderWordEmpty(allLearned.length)}
      <p class="results-line">${visible.length} / ${allLearned.length}</p>
    </main>`;
}

function renderWordCard(word) {
  const mastery = wordMastery(word.id);
  const stats = progress.wordStats[word.id];
  return `
    <article class="word-card">
      <div class="word-card__top"><span class="word-emoji" aria-hidden="true">${word.emoji}</span><button class="audio-pill" type="button" data-action="play-audio" data-audio="${attr(word.ko)}" aria-label="${attr(text("listen"))}">▶</button></div>
      <h2 lang="ko">${h(word.ko)}</h2>
      ${progress.settings.romanization ? `<p class="romanization">${h(word.romanization)}</p>` : ""}
      <strong>${h(loc(word.meaning))}</strong>
      <div class="word-example"><span lang="ko">${h(word.example)}</span><small>${h(loc(word.exampleMeaning))}</small></div>
      <footer><span class="mastery mastery--${mastery}">${h(text(mastery))}</span><small>${stats?.seen ?? 0} ${h(text("timesSeen"))}</small></footer>
    </article>`;
}

function renderWordEmpty(hasWords) {
  return `<section class="empty-state"><span aria-hidden="true">가</span><div><h2>${h(hasWords ? text("noSearchResults") : text("noWords"))}</h2><p>${h(hasWords ? text("searchWords") : text("noWordsBody"))}</p></div>${hasWords ? "" : `<a class="button button--secondary" href="#/learn">${h(text("continueTrail"))}</a>`}</section>`;
}

function unlockedAchievements() {
  const set = new Set(progress.achievements);
  return ACHIEVEMENTS.map((achievement) => ({ ...achievement, unlocked: set.has(achievement.id) }));
}

function renderProfilePage() {
  const level = levelNumber(progress.xp);
  const levelProgress = progress.xp % 250;
  return `
    <main class="page page--profile" id="main-content">
      <section class="profile-hero">
        <div class="profile-avatar" aria-hidden="true"><span>${level}</span><i>가</i></div>
        <div><p class="eyebrow">${h(text("profileTitle"))}</p><h1 data-auto-focus tabindex="-1">${h(text("welcomeBack"))}</h1><p>${h(text("profileDescription"))}</p></div>
        <div class="level-meter"><span><b>${h(text("level"))} ${level}</b><small>${levelProgress}/250 XP</small></span><i><b style="width:${(levelProgress / 250) * 100}%"></b></i></div>
      </section>

      <section class="profile-metrics" aria-label="Learning totals">
        ${profileMetric("◆", progress.xp, text("totalXp"))}
        ${profileMetric("✓", completedCount(), text("totalLessons"))}
        ${profileMetric("◷", progress.totalMinutes, text("totalMinutes"))}
        ${profileMetric("🔥", progress.streak, text("streak"))}
      </section>

      <section class="profile-section" aria-labelledby="achievement-title">
        <div class="section-heading"><div><p class="eyebrow">${progress.achievements.length}/${ACHIEVEMENTS.length}</p><h2 id="achievement-title">${h(text("achievements"))}</h2></div></div>
        <div class="achievement-grid">
          ${unlockedAchievements().map((achievement) => `<article class="achievement-card ${achievement.unlocked ? "is-earned" : ""}"><span aria-hidden="true">${achievement.icon}</span><div><strong>${h(text(achievement.titleKey))}</strong><small>${h(achievement.unlocked ? text("completed") : text(achievement.bodyKey))}</small></div></article>`).join("")}
        </div>
      </section>

      <section class="settings-panel" aria-labelledby="settings-title">
        <div class="section-heading"><div><p class="eyebrow">${h(text("preferences"))}</p><h2 id="settings-title">${h(text("settings"))}</h2></div></div>
        ${renderSettingSelect("locale", text("interfaceLanguage"), text("interfaceLanguageBody"), SUPPORTED_LOCALES.map((code) => [code, LOCALE_META[code].label]), locale())}
        ${renderToggle("audio", text("audio"), text("audioBody"), progress.settings.audio)}
        ${renderToggle("romanization", text("romanization"), text("romanizationBody"), progress.settings.romanization)}
        ${renderSettingSelect("theme", text("theme"), "", [["system", text("themeSystem")], ["light", text("themeLight")], ["dark", text("themeDark")]], progress.settings.theme)}
        ${renderSettingSelect("dailyGoal", text("dailyGoalSetting"), "", [[5, "5 min"], [10, "10 min"], [15, "15 min"], [20, "20 min"]], progress.settings.dailyGoal)}
      </section>

      <section class="data-panel">
        <div><p class="eyebrow">${h(text("localData"))}</p><h2>${h(text("localData"))}</h2><p>${h(text("localDataBody"))}</p></div>
        <div class="data-actions">
          <button class="button button--secondary" type="button" data-action="install-app">${h(text("install"))}</button>
          <button class="button button--secondary" type="button" data-action="export-progress">${h(text("export"))}</button>
          ${resetArmed ? `<div class="reset-box" role="group"><strong>${h(text("resetConfirmTitle"))}</strong><p>${h(text("resetConfirmBody"))}</p><button class="button button--danger" type="button" data-action="confirm-reset">${h(text("erase"))}</button><button class="button button--quiet" type="button" data-action="cancel-reset">${h(text("cancel"))}</button></div>` : `<button class="button button--danger-quiet" type="button" data-action="arm-reset">${h(text("reset"))}</button>`}
        </div>
      </section>
    </main>`;
}

function profileMetric(icon, value, label) {
  return `<article><span aria-hidden="true">${icon}</span><strong>${value}</strong><small>${h(label)}</small></article>`;
}

function renderSettingSelect(setting, title, body, options, value) {
  return `<label class="setting-row"><span><strong>${h(title)}</strong>${body ? `<small>${h(body)}</small>` : ""}</span><select data-setting="${setting}">${options.map(([optionValue, label]) => `<option value="${attr(optionValue)}" ${String(value) === String(optionValue) ? "selected" : ""}>${h(label)}</option>`).join("")}</select></label>`;
}

function renderToggle(setting, title, body, checked) {
  return `<label class="setting-row"><span><strong>${h(title)}</strong><small>${h(body)}</small></span><input class="switch" type="checkbox" data-setting="${setting}" ${checked ? "checked" : ""} /></label>`;
}
