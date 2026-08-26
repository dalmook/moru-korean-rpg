function createReviewSession(items) {
  return {
    started: true,
    items,
    index: 0,
    answer: defaultAnswer(EXERCISE_BY_ID.get(items[0]?.exerciseId)?.exercise),
    feedback: null,
    showHint: false,
    completed: false,
    correctCount: 0,
    earnedXp: 0,
  };
}

function renderReviewPlayer() {
  const session = activeReviewSession;
  if (!session || session.completed) return renderReviewCompletion(session);
  const item = session.items[session.index];
  const record = item ? EXERCISE_BY_ID.get(item.exerciseId) : null;
  if (!record) {
    session.completed = true;
    return renderReviewCompletion(session);
  }
  const exercise = record.exercise;
  const percentage = Math.round((session.index / session.items.length) * 100);
  const ready = answerReady(exercise, session.answer);
  return `
    <div class="player-shell player-shell--review">
      <header class="player-topbar"><a class="close-player" href="#/practice" aria-label="${h(text("close"))}">×</a><div class="player-progress"><span style="width:${percentage}%"></span></div><div class="player-stats"><span>${session.index + 1}/${session.items.length}</span><span>◆ ${session.earnedXp}</span></div></header>
      <main class="exercise-main" id="exercise-main"><div class="exercise-counter"><span>${h(text("review"))}</span><span>${h(loc(LESSON_BY_ID.get(record.lessonId)?.title))}</span></div>${renderExercisePrompt(exercise)}${renderExerciseInteraction(exercise, session.answer, Boolean(session.feedback), "review")}${!session.feedback ? renderHint(exercise, session.showHint) : ""}</main>
      ${renderFeedbackDock(exercise, session.feedback, ready, "review")}
    </div>`;
}

function checkReviewAnswer() {
  const session = activeReviewSession;
  if (!session?.started || session.feedback) return;
  const item = session.items[session.index];
  const record = EXERCISE_BY_ID.get(item?.exerciseId);
  if (!record || !answerReady(record.exercise, session.answer)) return;
  const correct = isCorrect(record.exercise, session.answer);
  session.feedback = { correct };
  session.correctCount += correct ? 1 : 0;
  session.earnedXp += correct ? 8 : 2;
  updateProgress((current) => {
    const existing = current.reviewItems[item.exerciseId] ?? item;
    const intervalIndex = correct ? Math.min(4, (existing.intervalIndex ?? 0) + 1) : 0;
    const dueAt = addDays(new Date(), correct ? REVIEW_INTERVALS[intervalIndex] : 1);
    const next = {
      ...current,
      xp: current.xp + (correct ? 8 : 2),
      reviewItems: {
        ...current.reviewItems,
        [item.exerciseId]: { ...existing, intervalIndex, dueAt, lastCorrect: correct, strength: correct ? Math.min(5, (existing.strength ?? 0) + 1) : Math.max(0, (existing.strength ?? 1) - 1) },
      },
      daily: { ...current.daily, xp: current.daily.xp + (correct ? 8 : 2), reviews: current.daily.reviews + 1 },
    };
    return markStudyDay(next);
  }, { renderNow: false });
  render();
}

function continueReviewAnswer() {
  const session = activeReviewSession;
  if (!session?.feedback) return;
  session.index += 1;
  if (session.index >= session.items.length) {
    session.completed = true;
  } else {
    const next = EXERCISE_BY_ID.get(session.items[session.index].exerciseId)?.exercise;
    session.answer = defaultAnswer(next);
    session.feedback = null;
    session.showHint = false;
    speakingResult = "";
  }
  render();
}

function renderReviewCompletion(session) {
  const count = session?.items?.length ?? 0;
  return `<main class="completion-page"><div class="completion-moru" aria-hidden="true"><span>↻</span><i></i></div><p class="eyebrow">${h(text("reviewComplete"))}</p><h1 data-auto-focus tabindex="-1">${h(text("reviewCompleteBody", { count }))}</h1><section class="completion-metrics"><article><strong>${session?.correctCount ?? 0}/${count}</strong><small>${h(text("accuracy"))}</small></article><article><strong>+${session?.earnedXp ?? 0}</strong><small>${h(text("xpEarned"))}</small></article></section><div class="completion-actions"><a class="button button--primary button--large" href="#/practice">${h(text("navPractice"))}</a><a class="button button--secondary" href="#/learn">${h(text("continueTrail"))}</a></div></main>`;
}

function renderSpeakingPlayer(scenarioId) {
  const scenario = SPEAKING_SCENARIOS.find((item) => item.id === scenarioId) ?? SPEAKING_SCENARIOS[0];
  const completedToday = progress.speakingCompleted[scenario.id] === dayKey();
  return `
    <div class="speaking-page">
      <header class="player-topbar"><a class="close-player" href="#/practice" aria-label="${h(text("close"))}">×</a><div class="speaking-title"><span>${scenario.icon}</span><strong>${h(text(scenario.titleKey))}</strong></div><span class="local-badge">Local</span></header>
      <main id="main-content" class="speaking-scene">
        <section class="scene-card"><span class="scene-icon" aria-hidden="true">${scenario.icon}</span><p class="eyebrow">Moru</p><h1 data-auto-focus tabindex="-1" lang="ko">${h(scenario.promptKo)}</h1><p>${h(loc(scenario.promptMeaning))}</p><button class="listen-orb listen-orb--small" type="button" data-action="play-audio" data-audio="${attr(scenario.promptKo)}"><span aria-hidden="true">▶</span></button></section>
        <section class="your-line"><p class="eyebrow">${h(text("scenarioPrompt"))}</p><h2 lang="ko">${h(scenario.answerKo)}</h2>${progress.settings.romanization ? `<p class="romanization">${h(scenario.romanization)}</p>` : ""}<p>${h(loc(scenario.answerMeaning))}</p><div class="speaking-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="speak-actions"><button class="mic-button ${speakingListening ? "is-listening" : ""}" type="button" data-action="start-scenario-speech" data-value="${attr(scenario.answerKo)}" ${speechRecognitionAvailable() ? "" : "disabled"}><span aria-hidden="true">●</span>${h(speakingListening ? text("listeningNow") : text("speak"))}</button><button class="button button--secondary" type="button" data-action="complete-speaking" data-scenario-id="${scenario.id}">${h(completedToday ? text("done") : text("selfCheck"))}</button></div>${speakingResult ? `<div class="speech-result"><small>${h(text("heard"))}</small><strong>${h(speakingResult)}</strong></div>` : ""}<p class="privacy-line">◇ ${h(text("speakingPrivacy"))}</p></section>
      </main>
    </div>`;
}

function speakKorean(value) {
  if (!progress.settings.audio || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    liveMessage = `${text("audio")}: ${value}`;
    render();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  utterance.lang = "ko-KR";
  utterance.rate = 0.82;
  const voice = window.speechSynthesis.getVoices().find((item) => item.lang?.toLowerCase().startsWith("ko"));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  liveMessage = `${text("listen")}: ${value}`;
}

function startSpeechRecognition(context, expected = "") {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return;
  const recognition = new Recognition();
  recognition.lang = "ko-KR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;
  speakingListening = true;
  speakingResult = "";
  render();
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript ?? "";
    speakingResult = transcript;
    speakingListening = false;
    if (context === "scenario") {
      liveMessage = normalizeValue(transcript) === normalizeValue(expected) ? text("speechMatched") : text("speechTryAgain");
    } else {
      const session = currentPlayerSession(context);
      if (session) session.answer = transcript;
    }
    render();
  };
  recognition.onerror = () => {
    speakingListening = false;
    liveMessage = text("microphoneUnavailable");
    render();
  };
  recognition.onend = () => {
    speakingListening = false;
    render();
  };
  recognition.start();
}

function setupTraceCanvas() {
  const canvas = root.querySelector("[data-trace-canvas]");
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const surface = canvas.parentElement;
  const rect = surface.getBoundingClientRect();
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) return;
  context.scale(ratio, ratio);
  context.lineWidth = 14;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ef7049";
  let drawing = false;
  const point = (event) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  canvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    context.beginPath();
    context.moveTo(p.x, p.y);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    const p = point(event);
    context.lineTo(p.x, p.y);
    context.stroke();
  });
  const finish = () => { drawing = false; };
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);
}

function exportProgress() {
  const blob = new Blob([JSON.stringify(progress, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `moru-progress-${dayKey()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function installApp() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    render();
  } else {
    liveMessage = text("installUnavailable");
    render();
  }
}
