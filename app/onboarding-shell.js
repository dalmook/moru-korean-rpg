function renderOnboarding() {
  const steps = 4;
  return `
    <main class="onboarding" id="main-content">
      <div class="onboarding__ambient" aria-hidden="true"><span>ㄱ</span><span>ㅏ</span><span>한</span></div>
      <section class="onboarding-card">
        <header class="onboarding-brand">
          <img src="./moru-mark.svg" alt="" width="42" height="42" />
          <div><strong>Moru</strong><small>${h(text("tagline"))}</small></div>
          <span class="step-dots" aria-label="${onboardingStep + 1} / ${steps}">
            ${Array.from({ length: steps }, (_, index) => `<i class="${index <= onboardingStep ? "is-active" : ""}"></i>`).join("")}
          </span>
        </header>
        ${onboardingStep === 0 ? renderOnboardingLanguage() : ""}
        ${onboardingStep === 1 ? renderOnboardingWelcome() : ""}
        ${onboardingStep === 2 ? renderOnboardingGoal() : ""}
        ${onboardingStep === 3 ? renderOnboardingLevel() : ""}
      </section>
    </main>`;
}

function renderOnboardingLanguage() {
  return `
    <div class="onboarding-panel onboarding-panel--language">
      <p class="eyebrow">1 · Language</p>
      <h1 data-auto-focus tabindex="-1">${h(text("onboardingChooseLanguage"))}</h1>
      <p class="lead">${h(text("onboardingChooseLanguageBody"))}</p>
      <div class="language-grid">
        ${SUPPORTED_LOCALES.map((code) => `
          <button class="language-card ${locale() === code ? "is-selected" : ""}" type="button" data-action="onboarding-language" data-locale="${code}">
            <span class="language-card__sample">${code === "en" ? "Hello" : code === "zh" ? "你好" : code === "vi" ? "Xin chào" : "안녕하세요"}</span>
            <strong>${h(LOCALE_META[code].label)}</strong>
            <small>${code === "en" ? "Learn Korean in English" : code === "zh" ? "用中文学习韩语" : code === "vi" ? "Học tiếng Hàn bằng tiếng Việt" : "한국어로 학습 안내 보기"}</small>
            <span class="language-card__check" aria-hidden="true">✓</span>
          </button>`).join("")}
      </div>
    </div>`;
}

function renderOnboardingWelcome() {
  return `
    <div class="onboarding-panel onboarding-panel--welcome">
      <div class="welcome-copy">
        <p class="eyebrow">2 · ${h(text("welcomeBack"))}</p>
        <h1 data-auto-focus tabindex="-1">${h(text("onboardingWelcome"))}</h1>
        <p class="lead">${h(text("onboardingWelcomeBody"))}</p>
        <div class="onboarding-benefits">
          <span><b>5–10</b><small>${h(text("minutes"))}</small></span>
          <span><b>85</b><small>${h(text("exercises"))}</small></span>
          <span><b>A0→C1</b><small>TOPIK</small></span>
        </div>
        <button class="button button--primary button--large" type="button" data-action="onboarding-next">${h(text("continue"))}<span aria-hidden="true">→</span></button>
        <p class="privacy-line">◇ ${h(text("onboardingPrivacy"))}</p>
      </div>
      <div class="moru-hero" aria-hidden="true">
        <div class="moru-bird"><span class="moru-bird__eye"></span><span class="moru-bird__wing">가</span></div>
        <span class="speech-spark">안녕!</span>
      </div>
    </div>`;
}

function renderOnboardingGoal() {
  const goals = [
    ["travel", "🧳", "goalTravel"],
    ["drama", "🎬", "goalDrama"],
    ["work", "💼", "goalWork"],
    ["topik", "급", "goalTopik"],
  ];
  return `
    <div class="onboarding-panel">
      <p class="eyebrow">3 · Goal</p>
      <h1 data-auto-focus tabindex="-1">${h(text("onboardingGoal"))}</h1>
      <p class="lead">${h(text("onboardingGoalBody"))}</p>
      <div class="choice-stack">
        ${goals.map(([id, icon, key]) => `
          <button class="choice-row ${onboardingDraft.goal === id ? "is-selected" : ""}" type="button" data-action="choose-goal" data-goal="${id}">
            <span class="choice-row__icon" aria-hidden="true">${icon}</span>
            <strong>${h(text(key))}</strong>
            <span class="radio-mark" aria-hidden="true"></span>
          </button>`).join("")}
      </div>
      <div class="onboarding-actions">
        <button class="button button--quiet" type="button" data-action="onboarding-back">← ${h(text("back"))}</button>
        <button class="button button--primary" type="button" data-action="onboarding-next">${h(text("continue"))} →</button>
      </div>
    </div>`;
}

function renderOnboardingLevel() {
  const levels = [
    ["new", "ㄱ", "levelNew", "levelNewBody"],
    ["hangul", "가", "levelHangul", "levelHangulBody"],
    ["everyday", "말", "levelEveryday", "levelEverydayBody"],
    ["topik", "급", "levelTopik", "levelTopikBody"],
  ];
  return `
    <div class="onboarding-panel">
      <p class="eyebrow">4 · Level</p>
      <h1 data-auto-focus tabindex="-1">${h(text("onboardingLevel"))}</h1>
      <p class="lead">${h(text("onboardingLevelBody"))}</p>
      <div class="level-grid">
        ${levels.map(([id, icon, titleKey, bodyKey]) => `
          <button class="level-card ${onboardingDraft.level === id ? "is-selected" : ""}" type="button" data-action="choose-start-level" data-level="${id}">
            <span>${icon}</span><div><strong>${h(text(titleKey))}</strong><small>${h(text(bodyKey))}</small></div><i aria-hidden="true"></i>
          </button>`).join("")}
      </div>
      <div class="onboarding-actions">
        <button class="button button--quiet" type="button" data-action="onboarding-back">← ${h(text("back"))}</button>
        <button class="button button--primary button--large" type="button" data-action="complete-onboarding">${h(text("beginAdventure"))} →</button>
      </div>
    </div>`;
}

function renderShell(route) {
  const safeRoute = ["learn", "practice", "words", "profile", "review"].includes(route) ? route : "learn";
  return `
    <div class="app-shell">
      <a class="skip-link" href="#main-content">${h(text("skipToContent"))}</a>
      ${renderHeader()}
      ${!online ? `<div class="network-banner" role="status">${h(text("offlineMode"))}</div>` : ""}
      ${saveWarning ? `<div class="network-banner network-banner--warning" role="alert">${h(saveWarning)}</div>` : ""}
      ${safeRoute === "learn" ? renderLearnPage() : ""}
      ${safeRoute === "practice" || safeRoute === "review" ? renderPracticePage() : ""}
      ${safeRoute === "words" ? renderWordsPage() : ""}
      ${safeRoute === "profile" ? renderProfilePage() : ""}
      ${renderBottomNavigation(safeRoute)}
      <div class="sr-only" aria-live="polite">${h(liveMessage)}</div>
    </div>`;
}

function renderHeader() {
  return `
    <header class="topbar">
      <a class="brand" href="#/learn" aria-label="Moru ${h(text("navLearn"))}">
        <img src="./moru-mark.svg" alt="" width="38" height="38" />
        <span><strong>Moru</strong><small>${h(text("tagline"))}</small></span>
      </a>
      <div class="topbar__stats" aria-label="Learning status">
        <span title="${h(text("streak"))}"><i aria-hidden="true">🔥</i><b>${progress.streak}</b></span>
        <span title="${h(text("hearts"))}"><i aria-hidden="true">♥</i><b>${progress.hearts}</b></span>
        <span title="${h(text("xp"))}"><i aria-hidden="true">◆</i><b>${progress.xp}</b></span>
      </div>
      ${renderLocaleSelect("topbar-language")}
    </header>`;
}

function renderLocaleSelect(className = "") {
  return `
    <label class="locale-select ${className}">
      <span class="sr-only">${h(text("interfaceLanguage"))}</span>
      <select data-setting="locale" aria-label="${h(text("interfaceLanguage"))}">
        ${SUPPORTED_LOCALES.map((code) => `<option value="${code}" ${locale() === code ? "selected" : ""}>${h(LOCALE_META[code].short)}</option>`).join("")}
      </select>
      <i aria-hidden="true">⌄</i>
    </label>`;
}

function renderBottomNavigation(active) {
  const nav = [
    ["learn", "⌂", "navLearn"],
    ["practice", "↻", "navPractice"],
    ["words", "가", "navWords"],
    ["profile", "●", "navProfile"],
  ];
  return `
    <nav class="bottom-nav" aria-label="Primary navigation">
      ${nav.map(([id, icon, key]) => `
        <a href="#/${id}" class="${active === id ? "is-active" : ""}" ${active === id ? 'aria-current="page"' : ""}>
          <span aria-hidden="true">${icon}</span><small>${h(text(key))}</small>
          ${id === "practice" && dueReviewItems().length ? `<b>${dueReviewItems().length}</b>` : ""}
        </a>`).join("")}
    </nav>`;
}

function completedCount() {
  return ALL_LESSONS.filter((lesson) => progress.completedLessons[lesson.id]).length;
}

function preferredStartIndex() {
  const mapping = { new: 0, hangul: 4, everyday: 8, topik: 12 };
  return mapping[progress.startLevel] ?? 0;
}

function recommendedLesson() {
  const unfinished = ALL_LESSONS.filter((lesson) => !progress.completedLessons[lesson.id]);
  if (!unfinished.length) return ALL_LESSONS.at(-1) ?? null;
  const current = LESSON_BY_ID.get(progress.currentLessonId);
  if (current && !progress.completedLessons[current.id]) return current;
  const startingIndex = preferredStartIndex();
  return ALL_LESSONS.slice(startingIndex).find((lesson) => !progress.completedLessons[lesson.id]) ?? unfinished[0];
}
