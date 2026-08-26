function createLessonSession(lesson) {
  return {
    lessonId: lesson.id,
    queue: lesson.exercises.map((exercise) => ({ exercise, retry: false })),
    retryScheduled: new Set(),
    index: 0,
    answer: lesson.exercises[0]?.type === "order" || lesson.exercises[0]?.type === "build" ? [] : "",
    feedback: null,
    showHint: false,
    attempts: {},
    firstTryCorrect: {},
    outcomes: {},
    combo: 0,
    bestCombo: 0,
    earnedXp: 0,
    hearts: progress.hearts,
    completed: false,
    committed: false,
    result: null,
  };
}

function renderLessonPlayer(lessonId) {
  const lesson = LESSON_BY_ID.get(lessonId);
  if (!lesson) return renderMissingLesson();
  if (!activeLessonSession || activeLessonSession.lessonId !== lesson.id) activeLessonSession = createLessonSession(lesson);
  if (activeLessonSession.completed) return renderLessonCompletion(lesson, activeLessonSession);
  const session = activeLessonSession;
  const item = session.queue[session.index];
  if (!item) {
    completeLesson(lesson, session);
    return renderLessonCompletion(lesson, session);
  }
  const progressValue = Math.round((session.index / session.queue.length) * 100);
  const ready = answerReady(item.exercise, session.answer);
  return `
    <div class="player-shell">
      <a class="skip-link" href="#exercise-main">${h(text("skipToContent"))}</a>
      <header class="player-topbar">
        <a class="close-player" href="#/learn" aria-label="${h(text("close"))}">×</a>
        <div class="player-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressValue}"><span style="width:${progressValue}%"></span></div>
        <div class="player-stats"><span>♥ ${session.hearts}</span><span>◆ ${session.earnedXp}</span></div>
      </header>
      <main class="exercise-main" id="exercise-main">
        <div class="exercise-counter"><span>${item.retry ? h(text("retry")) : `${Math.min(session.index + 1, lesson.exercises.length)} / ${lesson.exercises.length}`}</span><span>${h(lesson.level)} · ${item.exercise.xp} XP</span></div>
        ${renderExercisePrompt(item.exercise)}
        ${renderExerciseInteraction(item.exercise, session.answer, Boolean(session.feedback), "lesson")}
        ${!session.feedback ? renderHint(item.exercise, session.showHint) : ""}
      </main>
      ${renderFeedbackDock(item.exercise, session.feedback, ready, "lesson", item.retry)}
    </div>`;
}

function renderMissingLesson() {
  return `<main class="fatal-state"><span aria-hidden="true">⌁</span><h1>${h(text("comingSoon"))}</h1><p>${h(text("pathDescription"))}</p><a class="button button--primary" href="#/learn">${h(text("continueTrail"))}</a></main>`;
}

function renderExercisePrompt(exercise) {
  let kicker = text("skillConversation");
  let question = "";
  let visual = "";
  if (exercise.type === "meaning") {
    kicker = text("skillVocabulary");
    question = text("exerciseMeaning", { value: exercise.target });
    visual = `<div class="target-glyph" lang="ko">${h(exercise.target)}</div>${showRomanization(exercise)}`;
  } else if (exercise.type === "listening") {
    kicker = text("listening");
    question = text("exerciseListen");
    visual = `<div class="listen-stage"><button class="listen-orb" type="button" data-action="play-audio" data-audio="${attr(exercise.audio)}" aria-label="${attr(text("playKorean"))}"><span aria-hidden="true">▶</span></button><small>${h(text("listen"))}</small></div>`;
  } else if (exercise.type === "order") {
    kicker = text("skillGrammar");
    question = text("exerciseOrder", { value: loc(exercise.meaning) });
  } else if (exercise.type === "type") {
    kicker = text("skillVocabulary");
    question = text("exerciseType", { value: loc(exercise.meaning) });
  } else if (exercise.type === "dialogue") {
    kicker = text("skillConversation");
    question = text("exerciseDialogue");
    visual = `<div class="dialogue-bubble"><span>Moru</span><strong lang="ko">${h(exercise.promptKo)}</strong><small>${h(loc(exercise.promptMeaning))}</small><button type="button" data-action="play-audio" data-audio="${attr(exercise.audio)}" aria-label="${attr(text("listen"))}">▶</button></div>`;
  } else if (exercise.type === "trace") {
    kicker = text("skillHangul");
    question = text("exerciseTrace", { value: exercise.target });
  } else if (exercise.type === "build") {
    kicker = text("skillHangul");
    question = text("exerciseBuild", { value: exercise.target });
  } else if (exercise.type === "speak") {
    kicker = text("skillConversation");
    question = text("exerciseSpeak", { value: loc(exercise.meaning) });
  } else if (exercise.type === "grammar") {
    kicker = text("skillGrammar");
    question = text("exerciseGrammar");
  } else if (exercise.type === "read") {
    kicker = text("skillHangul");
    question = text("exerciseRead");
    visual = `<div class="target-glyph" lang="ko">${h(exercise.target)}</div>`;
  } else if (exercise.type === "cloze") {
    kicker = text("skillGrammar");
    question = text("exerciseGrammar");
    visual = `<div class="reading-passage" lang="ko">${h(exercise.passage)}</div>`;
  } else if (exercise.type === "reading") {
    kicker = text("skillReading");
    question = loc(exercise.question);
    visual = `<div class="reading-passage" lang="ko">${h(exercise.passage)}</div>`;
  }
  return `
    <section class="exercise-heading">
      <p class="eyebrow">${h(kicker)}</p>
      <h1 data-auto-focus tabindex="-1">${h(question)}</h1>
      ${visual}
      ${exercise.audio && !["listening", "dialogue"].includes(exercise.type) ? `<button class="model-audio" type="button" data-action="play-audio" data-audio="${attr(exercise.audio)}"><span aria-hidden="true">▶</span>${h(text("listen"))}</button>` : ""}
    </section>`;
}

function showRomanization(exercise) {
  return progress.settings.romanization && exercise.romanization ? `<p class="romanization romanization--center">${h(exercise.romanization)}</p>` : "";
}

function renderExerciseInteraction(exercise, answer, disabled, context) {
  if (["meaning", "listening", "dialogue", "grammar", "read", "cloze", "reading"].includes(exercise.type)) {
    return renderChoiceGrid(exercise, answer, disabled, context);
  }
  if (["order", "build"].includes(exercise.type)) return renderTokenBuilder(exercise, answer, disabled, context);
  if (exercise.type === "type") return renderTypeAnswer(exercise, answer, disabled, context);
  if (exercise.type === "speak") return renderSpeakAnswer(exercise, answer, disabled, context);
  if (exercise.type === "trace") return renderTraceAnswer(exercise, answer, disabled, context);
  return "";
}

function renderChoiceGrid(exercise, answer, disabled, context) {
  return `<div class="answer-grid answer-grid--${exercise.type}" role="group" aria-label="Answers">
    ${(exercise.choices ?? []).map((choice) => {
      const selected = normalizeValue(answer) === normalizeValue(choice.value);
      const primary = exercise.type === "meaning" ? loc(choice.meaning) : choice.label ?? choice.value;
      const secondary = exercise.type === "meaning" ? "" : loc(choice.meaning);
      const word = VOCABULARY.find((entry) => entry.ko === choice.value);
      return `<button class="answer-choice ${selected ? "is-selected" : ""}" type="button" data-action="select-answer" data-context="${context}" data-value="${attr(choice.value)}" aria-pressed="${selected}" ${disabled ? "disabled" : ""}>
        ${exercise.type === "meaning" && word?.emoji ? `<span class="choice-emoji" aria-hidden="true">${word.emoji}</span>` : ""}
        <span class="answer-choice__copy"><strong ${exercise.type === "meaning" ? "" : 'lang="ko"'}>${h(primary)}</strong>${secondary && secondary !== primary ? `<small>${h(secondary)}</small>` : ""}${progress.settings.romanization && choice.romanization && exercise.type !== "meaning" ? `<em>${h(choice.romanization)}</em>` : ""}</span>
        <i aria-hidden="true"></i>
      </button>`;
    }).join("")}
  </div>`;
}

function renderTokenBuilder(exercise, answer, disabled, context) {
  const selected = Array.isArray(answer) ? answer : [];
  return `<div class="token-builder">
    <div class="token-answer ${selected.length ? "has-answer" : ""}" aria-live="polite">
      ${selected.length ? selected.map((token, index) => `<button type="button" data-action="remove-token" data-context="${context}" data-index="${index}" ${disabled ? "disabled" : ""}>${h(token)}<span aria-hidden="true">×</span></button>`).join("") : `<span>${h(text("tapTokens"))}</span>`}
      ${exercise.type === "build" && selected.length ? `<strong class="block-preview" lang="ko">${h(selected.join(""))}</strong>` : ""}
    </div>
    <div class="token-bank" role="group" aria-label="${attr(text("tapTokens"))}">
      ${(exercise.tokens ?? []).map((token, index) => {
        const used = selected.filter((entry) => entry === token).length >= (exercise.tokens ?? []).slice(0, index + 1).filter((entry) => entry === token).length;
        return `<button type="button" data-action="add-token" data-context="${context}" data-value="${attr(token)}" ${disabled || used ? "disabled" : ""}>${h(token)}</button>`;
      }).join("")}
    </div>
  </div>`;
}

function renderTypeAnswer(exercise, answer, disabled, context) {
  return `<label class="type-answer"><span>${h(text("yourAnswer"))}</span><input type="text" lang="ko" data-action="text-answer" data-context="${context}" value="${attr(Array.isArray(answer) ? answer.join(" ") : answer)}" placeholder="${attr(text("typePlaceholder"))}" autocomplete="off" autocapitalize="none" ${disabled ? "disabled" : ""} /></label>`;
}

function speechRecognitionAvailable() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function renderSpeakAnswer(exercise, answer, disabled, context) {
  const hasAnswer = Boolean(String(answer ?? "").trim());
  return `<div class="speak-panel">
    <div class="speak-target"><strong lang="ko">${h(exercise.target)}</strong>${showRomanization(exercise)}<small>${h(loc(exercise.meaning))}</small></div>
    <p class="privacy-line">◇ ${h(text("speakingPrivacy"))}</p>
    <div class="speak-actions">
      <button class="mic-button ${speakingListening ? "is-listening" : ""}" type="button" data-action="start-speech" data-context="${context}" ${disabled || !speechRecognitionAvailable() ? "disabled" : ""}><span aria-hidden="true">${speakingListening ? "◉" : "●"}</span>${h(speakingListening ? text("listeningNow") : text("speak"))}</button>
      <button class="button button--secondary" type="button" data-action="self-check-speech" data-context="${context}" data-value="${attr(exercise.answer)}" ${disabled ? "disabled" : ""}>${h(text("selfCheck"))}</button>
    </div>
    ${!speechRecognitionAvailable() ? `<p class="microcopy">${h(text("microphoneUnavailable"))}</p>` : ""}
    ${speakingResult ? `<div class="speech-result"><small>${h(text("heard"))}</small><strong>${h(speakingResult)}</strong></div>` : ""}
    <label class="type-answer type-answer--fallback"><span>${h(text("yourAnswer"))}</span><input type="text" lang="ko" data-action="text-answer" data-context="${context}" value="${attr(hasAnswer ? answer : speakingResult)}" placeholder="${attr(text("typePlaceholder"))}" ${disabled ? "disabled" : ""} /></label>
  </div>`;
}

function renderTraceAnswer(exercise, answer, disabled, context) {
  return `<div class="trace-panel ${answer ? "is-done" : ""}">
    <div class="trace-surface"><span aria-hidden="true">${h(exercise.target)}</span><canvas data-trace-canvas aria-label="${attr(text("traceInstruction"))}"></canvas>${answer ? `<i aria-hidden="true">✓</i>` : ""}</div>
    <p>${h(text("traceInstruction"))}</p>
    <div><button class="button button--quiet" type="button" data-action="clear-trace" ${disabled ? "disabled" : ""}>${h(text("clearDrawing"))}</button><button class="button button--secondary" type="button" data-action="complete-trace" data-context="${context}" data-value="${attr(exercise.answer)}" ${disabled ? "disabled" : ""}>${h(text("traceDone"))}</button></div>
  </div>`;
}

function renderHint(exercise, open) {
  return `<div class="hint-wrap"><button class="hint-button" type="button" data-action="toggle-hint" aria-expanded="${open}"><span aria-hidden="true">◇</span>${h(text("hint"))}</button>${open ? `<p class="hint-panel">${h(loc(exercise.hint))}</p>` : ""}</div>`;
}

function renderFeedbackDock(exercise, feedback, ready, context, retry = false) {
  if (!feedback) {
    return `<footer class="feedback-dock"><span>${h(ready ? text("goodStart") : text("selectAnswer"))}</span><button class="button button--primary button--large" type="button" data-action="check-answer" data-context="${context}" ${ready ? "" : "disabled"}>${h(text("check"))}</button></footer>`;
  }
  return `<footer class="feedback-dock feedback-dock--${feedback.correct ? "correct" : "wrong"}">
    <div class="feedback-copy" role="status" aria-live="polite"><span class="feedback-icon" aria-hidden="true">${feedback.correct ? "✓" : "↻"}</span><div><strong>${h(feedback.correct ? text("correctTitle") : text("wrongTitle"))}</strong><p>${h(loc(exercise.explanation))}</p>${!feedback.correct ? `<small><b>${h(text("answerWas"))}:</b> ${h(Array.isArray(exercise.answer) ? exercise.answer.join(" ") : exercise.answer)}</small>` : ""}${exercise.grammar ? `<details><summary>${h(text("grammarNote"))}</summary><p>${h(loc(exercise.grammar))}</p></details>` : ""}${exercise.culture ? `<details><summary>${h(text("cultureNote"))}</summary><p>${h(loc(exercise.culture))}</p></details>` : ""}</div></div>
    <button class="button button--primary button--large" type="button" data-action="continue-answer" data-context="${context}">${h(!feedback.correct && retry ? text("retry") : text("continue"))}</button>
  </footer>`;
}
