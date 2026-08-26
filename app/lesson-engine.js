function currentPlayerSession(context) {
  return context === "review" ? activeReviewSession : activeLessonSession;
}

function setPlayerAnswer(context, value) {
  const session = currentPlayerSession(context);
  if (!session || session.feedback) return;
  session.answer = value;
  render();
}

function answerReady(exercise, answer) {
  if (Array.isArray(exercise.answer)) return Array.isArray(answer) && answer.length > 0;
  return String(answer ?? "").trim().length > 0;
}

function normalizeValue(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s.,!?！？。，'"“”‘’·…~～]/gu, "");
}

function isCorrect(exercise, answer) {
  if (Array.isArray(exercise.answer)) {
    if (!Array.isArray(answer) || answer.length !== exercise.answer.length) return false;
    return exercise.answer.every((value, index) => normalizeValue(value) === normalizeValue(answer[index]));
  }
  return normalizeValue(exercise.answer) === normalizeValue(answer);
}

function checkLessonAnswer() {
  const session = activeLessonSession;
  if (!session || session.feedback) return;
  const item = session.queue[session.index];
  if (!item || !answerReady(item.exercise, session.answer)) return;
  const exercise = item.exercise;
  const correct = isCorrect(exercise, session.answer);
  const attempts = session.attempts[exercise.id] ?? 0;
  session.attempts[exercise.id] = attempts + 1;
  if (!item.retry && attempts === 0) session.firstTryCorrect[exercise.id] = correct;
  session.outcomes[exercise.id] = {
    correct,
    firstTryCorrect: session.firstTryCorrect[exercise.id] ?? false,
    attempts: session.attempts[exercise.id],
  };
  if (correct) {
    session.combo += 1;
    session.bestCombo = Math.max(session.bestCombo, session.combo);
    session.earnedXp += item.retry ? Math.ceil(exercise.xp / 2) : exercise.xp;
  } else {
    session.combo = 0;
    session.hearts = Math.max(1, session.hearts - 1);
    if (!item.retry && !session.retryScheduled.has(exercise.id)) {
      session.retryScheduled.add(exercise.id);
      session.queue.push({ exercise, retry: true });
    }
  }
  session.feedback = { correct };
  render();
}

function continueLessonAnswer() {
  const session = activeLessonSession;
  if (!session?.feedback) return;
  const item = session.queue[session.index];
  if (!session.feedback.correct && item?.retry) {
    session.answer = defaultAnswer(item.exercise);
    session.feedback = null;
    session.showHint = true;
    speakingResult = "";
    render();
    return;
  }
  session.index += 1;
  const next = session.queue[session.index];
  session.answer = next ? defaultAnswer(next.exercise) : "";
  session.feedback = null;
  session.showHint = false;
  speakingResult = "";
  if (!next) {
    const lesson = LESSON_BY_ID.get(session.lessonId);
    if (lesson) completeLesson(lesson, session);
  }
  render();
}

function defaultAnswer(exercise) {
  return ["order", "build"].includes(exercise?.type) ? [] : "";
}

function completeLesson(lesson, session) {
  if (session.committed) {
    session.completed = true;
    return;
  }
  const firstCorrect = lesson.exercises.filter((exercise) => session.firstTryCorrect[exercise.id]).length;
  const accuracy = Math.round((firstCorrect / lesson.exercises.length) * 100);
  const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
  const bonus = 20 + stars * 5;
  const earnedXp = session.earnedXp + bonus;
  const now = new Date();
  const nextLesson = ALL_LESSONS[ALL_LESSONS.findIndex((item) => item.id === lesson.id) + 1] ?? null;

  updateProgress((current) => {
    let next = markStudyDay(current);
    const completedLessons = {
      ...next.completedLessons,
      [lesson.id]: { completedAt: now.toISOString(), accuracy, stars },
    };
    const lessonResults = {
      ...next.lessonResults,
      [lesson.id]: { accuracy, stars, earnedXp, bestCombo: session.bestCombo, completedAt: now.toISOString() },
    };
    const wordStats = { ...next.wordStats };
    const vocabularyIds = new Set(lesson.vocabularyIds);
    for (const exercise of lesson.exercises) exercise.vocabularyIds?.forEach((id) => vocabularyIds.add(id));
    for (const id of vocabularyIds) {
      const existing = wordStats[id] ?? { seen: 0, correct: 0, wrong: 0, lastSeenAt: now.toISOString() };
      const linkedExercises = lesson.exercises.filter((exercise) => exercise.vocabularyIds?.includes(id));
      const correctCount = linkedExercises.filter((exercise) => session.outcomes[exercise.id]?.correct).length;
      const wrongCount = linkedExercises.filter((exercise) => (session.attempts[exercise.id] ?? 0) > 1 || session.firstTryCorrect[exercise.id] === false).length;
      wordStats[id] = {
        seen: existing.seen + Math.max(1, linkedExercises.length),
        correct: existing.correct + correctCount,
        wrong: existing.wrong + wrongCount,
        lastSeenAt: now.toISOString(),
      };
    }
    const reviewItems = { ...next.reviewItems };
    for (const exercise of lesson.exercises) {
      const existing = reviewItems[exercise.id];
      const mastered = session.firstTryCorrect[exercise.id] === true;
      const intervalIndex = mastered ? Math.min(4, (existing?.intervalIndex ?? -1) + 1) : 0;
      reviewItems[exercise.id] = {
        exerciseId: exercise.id,
        lessonId: lesson.id,
        intervalIndex,
        dueAt: mastered ? addDays(now, REVIEW_INTERVALS[intervalIndex]) : now.toISOString(),
        strength: mastered ? Math.min(5, (existing?.strength ?? 0) + 1) : Math.max(0, (existing?.strength ?? 1) - 1),
        lastCorrect: mastered,
      };
    }
    next = {
      ...next,
      xp: next.xp + earnedXp,
      hearts: session.hearts,
      totalMinutes: next.totalMinutes + lesson.duration,
      completedLessons,
      lessonResults,
      wordStats,
      reviewItems,
      currentLessonId: nextLesson?.id ?? lesson.id,
      daily: {
        ...next.daily,
        xp: next.daily.xp + earnedXp,
        minutes: next.daily.minutes + lesson.duration,
        lessons: next.daily.lessons + 1,
      },
    };
    return awardAchievements(next);
  }, { renderNow: false });

  session.result = { accuracy, stars, earnedXp, firstCorrect, nextLesson };
  session.committed = true;
  session.completed = true;
}

function awardAchievements(value) {
  const earned = new Set(value.achievements);
  if (completedCountFrom(value) >= 1) earned.add("first");
  const foundationIds = COURSE.units[0]?.lessons.map((lesson) => lesson.id) ?? [];
  if (foundationIds.every((id) => value.completedLessons[id])) earned.add("hangul");
  if (value.streak >= 3) earned.add("streak");
  if (Object.keys(value.wordStats).filter((id) => (value.wordStats[id]?.seen ?? 0) > 0).length >= 25) earned.add("words");
  if (value.completedLessons["topik-mini"]) earned.add("topik");
  return { ...value, achievements: [...earned] };
}

function completedCountFrom(value) {
  return ALL_LESSONS.filter((lesson) => value.completedLessons[lesson.id]).length;
}

function renderLessonCompletion(lesson, session) {
  const result = session.result ?? progress.lessonResults[lesson.id] ?? { accuracy: 100, stars: 3, earnedXp: 0, bestCombo: 0 };
  const newWords = lesson.vocabularyIds.map((id) => VOCAB_BY_ID.get(id)).filter(Boolean).slice(0, 4);
  return `
    <main class="completion-page" id="main-content">
      <div class="completion-sparkles" aria-hidden="true"><span>✦</span><span>가</span><span>✦</span></div>
      <div class="completion-moru" aria-hidden="true"><span>✓</span><i></i></div>
      <p class="eyebrow">${h(text("lessonComplete"))}</p>
      <h1 data-auto-focus tabindex="-1">${h(loc(lesson.title))}</h1>
      <div class="completion-stars" role="img" aria-label="${result.stars} / 3">${[1, 2, 3].map((star) => `<span class="${star <= result.stars ? "is-earned" : ""}">★</span>`).join("")}</div>
      <section class="completion-metrics">
        <article><strong>${result.accuracy}%</strong><small>${h(text("accuracy"))}</small></article>
        <article><strong>+${result.earnedXp}</strong><small>${h(text("xpEarned"))}</small></article>
        <article><strong>${session.bestCombo ?? result.bestCombo ?? 0}</strong><small>${h(text("bestCombo"))}</small></article>
      </section>
      ${newWords.length ? `<section class="new-word-strip"><div><p class="eyebrow">${h(text("wordsLearned"))}</p><h2>${newWords.length} ${h(text("wordsTitle"))}</h2></div><div>${newWords.map((word) => `<span><b lang="ko">${h(word.ko)}</b><small>${h(loc(word.meaning))}</small></span>`).join("")}</div></section>` : ""}
      <div class="completion-actions"><a class="button button--primary button--large" href="#/learn">${h(text("continueTrail"))} →</a>${dueReviewItems().length ? `<a class="button button--secondary" href="#/practice">${h(text("startReview"))}</a>` : ""}</div>
    </main>`;
}
