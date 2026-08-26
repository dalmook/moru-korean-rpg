root.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const context = button.dataset.context ?? "lesson";
  if (action === "onboarding-language") {
    const code = normalizeLocale(button.dataset.locale);
    progress = { ...progress, locale: code };
    saveProgress();
    onboardingStep = 1;
    render();
  } else if (action === "onboarding-next") {
    onboardingStep = Math.min(3, onboardingStep + 1);
    render();
  } else if (action === "onboarding-back") {
    onboardingStep = Math.max(0, onboardingStep - 1);
    render();
  } else if (action === "choose-goal") {
    onboardingDraft.goal = button.dataset.goal;
    render();
  } else if (action === "choose-start-level") {
    onboardingDraft.level = button.dataset.level;
    render();
  } else if (action === "complete-onboarding") {
    const startMap = { new: 0, hangul: 4, everyday: 8, topik: 12 };
    const lesson = ALL_LESSONS[startMap[onboardingDraft.level] ?? 0] ?? ALL_LESSONS[0];
    updateProgress((current) => ({ ...current, onboardingComplete: true, goal: onboardingDraft.goal, startLevel: onboardingDraft.level, currentLessonId: lesson.id, xp: current.xp + 20 }));
    go("learn");
  } else if (action === "open-lesson") {
    activeLessonSession = null;
    go(`lesson/${button.dataset.lessonId}`);
  } else if (action === "play-audio") {
    speakKorean(button.dataset.audio ?? "");
  } else if (action === "select-answer") {
    setPlayerAnswer(context, button.dataset.value ?? "");
  } else if (action === "add-token") {
    const session = currentPlayerSession(context);
    if (session && !session.feedback) {
      session.answer = [...(Array.isArray(session.answer) ? session.answer : []), button.dataset.value ?? ""];
      render();
    }
  } else if (action === "remove-token") {
    const session = currentPlayerSession(context);
    if (session && !session.feedback) {
      session.answer = (Array.isArray(session.answer) ? session.answer : []).filter((_, index) => index !== Number(button.dataset.index));
      render();
    }
  } else if (action === "toggle-hint") {
    const session = currentPlayerSession(context);
    if (session) { session.showHint = !session.showHint; render(); }
  } else if (action === "self-check-speech") {
    setPlayerAnswer(context, button.dataset.value ?? "");
  } else if (action === "start-speech") {
    startSpeechRecognition(context);
  } else if (action === "complete-trace") {
    setPlayerAnswer(context, button.dataset.value ?? "");
  } else if (action === "clear-trace") {
    const session = currentPlayerSession(context);
    if (session) session.answer = "";
    render();
  } else if (action === "check-answer") {
    context === "review" ? checkReviewAnswer() : checkLessonAnswer();
  } else if (action === "continue-answer") {
    context === "review" ? continueReviewAnswer() : continueLessonAnswer();
  } else if (action === "start-review") {
    const items = dueReviewItems();
    if (items.length) {
      activeReviewSession = createReviewSession(items);
      go("review");
      render();
    }
  } else if (action === "open-speaking") {
    speakingResult = "";
    go(`speak/${button.dataset.scenarioId}`);
  } else if (action === "start-scenario-speech") {
    startSpeechRecognition("scenario", button.dataset.value ?? "");
  } else if (action === "complete-speaking") {
    const id = button.dataset.scenarioId;
    updateProgress((current) => {
      const already = current.speakingCompleted[id] === dayKey();
      const reward = already ? 0 : 10;
      return markStudyDay({ ...current, xp: current.xp + reward, speakingCompleted: { ...current.speakingCompleted, [id]: dayKey() }, daily: { ...current.daily, xp: current.daily.xp + reward, minutes: current.daily.minutes + (already ? 0 : 2) }, totalMinutes: current.totalMinutes + (already ? 0 : 2) });
    }, { renderNow: false });
    go("practice");
  } else if (action === "word-filter") {
    wordFilter = button.dataset.filter ?? "all";
    render();
  } else if (action === "export-progress") {
    exportProgress();
  } else if (action === "arm-reset") {
    resetArmed = true;
    render();
  } else if (action === "cancel-reset") {
    resetArmed = false;
    render();
  } else if (action === "confirm-reset") {
    localStorage.removeItem(STORAGE_KEY);
    progress = createDefaultProgress(locale());
    activeLessonSession = null;
    activeReviewSession = null;
    resetArmed = false;
    onboardingStep = 0;
    render();
  } else if (action === "install-app") {
    installApp();
  } else if (action === "dismiss-install") {
    installDismissed = true;
    sessionStorage.setItem("moru.install.dismissed", "1");
    render();
  }
});

root.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
  if (target.dataset.action === "text-answer") {
    const session = currentPlayerSession(target.dataset.context ?? "lesson");
    if (session && !session.feedback) session.answer = target.value;
    const checkButton = root.querySelector('[data-action="check-answer"]');
    if (checkButton instanceof HTMLButtonElement) checkButton.disabled = !session || !answerReady((target.dataset.context === "review" ? EXERCISE_BY_ID.get(activeReviewSession?.items[activeReviewSession.index]?.exerciseId)?.exercise : activeLessonSession?.queue[activeLessonSession.index]?.exercise), session.answer);
  } else if (target.dataset.action === "word-search") {
    wordQuery = target.value;
    render();
    requestAnimationFrame(() => {
      const input = root.querySelector('[data-action="word-search"]');
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }
});

root.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement || target instanceof HTMLInputElement)) return;
  if (target.dataset.filterSelect === "level") {
    levelFilter = target.value;
    render();
    return;
  }
  const setting = target.dataset.setting;
  if (!setting) return;
  if (setting === "locale") {
    updateProgress((current) => ({ ...current, locale: normalizeLocale(target.value) }));
  } else if (setting === "audio" || setting === "romanization") {
    updateProgress((current) => ({ ...current, settings: { ...current.settings, [setting]: target.checked } }));
  } else if (setting === "theme") {
    updateProgress((current) => ({ ...current, settings: { ...current.settings, theme: target.value } }));
  } else if (setting === "dailyGoal") {
    updateProgress((current) => ({ ...current, settings: { ...current.settings, dailyGoal: Number(target.value) } }));
  }
});

window.addEventListener("hashchange", () => {
  const [route] = routeParts();
  if (route !== "lesson") activeLessonSession = null;
  if (route !== "review") activeReviewSession = null;
  speakingResult = "";
  speakingListening = false;
  window.scrollTo({ top: 0, behavior: "instant" });
  render();
});

window.addEventListener("online", () => { online = true; render(); });
window.addEventListener("offline", () => { online = false; render(); });
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  render();
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installDismissed = true;
});

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("Service worker registration failed", error)));
}

if (!window.location.hash) window.location.hash = "#/learn";
render();
