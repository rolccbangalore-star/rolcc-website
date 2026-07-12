(function () {
  const root = document.querySelector("[data-article-quiz]");
  if (!root) return;

  let questions;
  const dataEl = document.getElementById("article-quiz-data");
  if (dataEl) {
    try {
      questions = JSON.parse(dataEl.textContent);
    } catch {
      return;
    }
  } else {
    try {
      questions = JSON.parse(root.getAttribute("data-quiz") || "[]");
    } catch {
      return;
    }
  }
  if (!questions.length) return;

  questions = questions.map(function (q) {
    const seen = new Set();
    const options = (q.options || [])
      .map(function (opt) {
        return String(opt || "").trim();
      })
      .filter(function (text) {
        if (!text) return false;
        const key = text.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    let correctIndex = Number(q.correctIndex) || 0;
    if (options.length && correctIndex >= options.length) correctIndex = 0;
    const correctAnswer = options[correctIndex];
    const shuffled = options.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
    let nextCorrectIndex = shuffled.indexOf(correctAnswer);
    if (nextCorrectIndex < 0) nextCorrectIndex = 0;
    return {
      question: q.question,
      options: shuffled,
      correctIndex: nextCorrectIndex,
      explanation: q.explanation,
    };
  });

  const quizSection =
    document.getElementById("article-quiz") ||
    root.closest('section[aria-label="Study quiz"]') ||
    root;
  if (quizSection && !quizSection.id) quizSection.id = "article-quiz";

  initQuizFab(quizSection);

  let index = 0;
  let score = 0;
  let answered = false;
  const answers = [];

  const questionEl = root.querySelector("[data-quiz-question]");
  const optionsEl = root.querySelector("[data-quiz-options]");
  const feedbackEl = root.querySelector("[data-quiz-feedback]");
  const nextBtn = root.querySelector("[data-quiz-next]");
  const retakeBtn = root.querySelector("[data-quiz-reset]");
  const progressEl = root.querySelector("[data-quiz-progress]");

  let resultsEl = root.querySelector("[data-quiz-results]");
  if (!resultsEl) {
    resultsEl = document.createElement("div");
    resultsEl.className = "article-quiz__results";
    resultsEl.setAttribute("data-quiz-results", "");
    resultsEl.hidden = true;
    if (feedbackEl && feedbackEl.parentNode) {
      feedbackEl.parentNode.insertBefore(resultsEl, feedbackEl.nextSibling);
    } else {
      root.appendChild(resultsEl);
    }
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getScoreCopy(correct, total) {
    const ratio = total ? correct / total : 0;
    if (ratio === 1) {
      return {
        headline: "Perfect score!",
        message:
          "You answered every question correctly — well done! Your careful reading really shows. Celebrate this moment and keep sharing what you've learned.",
      };
    }
    if (ratio >= 0.8) {
      return {
        headline: "Excellent work!",
        message:
          "You did really well. You clearly grasped the heart of this study. Keep reflecting on God's Word and encouraging others along the way.",
      };
    }
    if (ratio >= 0.6) {
      return {
        headline: "Good effort!",
        message:
          "You're on the right track. Review the answers below, revisit the key passages, and you'll grow even stronger in understanding.",
      };
    }
    if (ratio >= 0.4) {
      return {
        headline: "Keep going!",
        message:
          "Learning takes time, and every attempt matters. Read through the review below, take your time with the Scripture, and try again when you're ready.",
      };
    }
    return {
      headline: "Don't give up!",
      message:
        "This quiz is here to help you learn, not to judge you. God's Word meets us where we are. Review the answers below and retake the quiz — growth is always worth it.",
    };
  }

  function setQuestionMode(active) {
    root.classList.toggle("article-quiz--complete", !active);
    if (progressEl) progressEl.hidden = !active;
    if (questionEl) questionEl.hidden = !active;
    if (optionsEl) optionsEl.hidden = !active;
    if (feedbackEl) feedbackEl.hidden = !active;
    if (nextBtn) nextBtn.hidden = !active || !answered;
    if (resultsEl) resultsEl.hidden = active;
    if (retakeBtn) retakeBtn.hidden = active;
  }

  function renderQuestion() {
    answered = false;
    setQuestionMode(true);
    if (resultsEl) resultsEl.innerHTML = "";

    const q = questions[index];
    if (!q) return;

    if (progressEl) progressEl.textContent = "Question " + (index + 1) + " of " + questions.length;
    if (questionEl) questionEl.textContent = q.question;
    if (feedbackEl) feedbackEl.textContent = "";
    if (nextBtn) {
      nextBtn.hidden = true;
      nextBtn.textContent = index === questions.length - 1 ? "See results" : "Next question";
    }

    if (optionsEl) {
      optionsEl.innerHTML = (q.options || [])
        .map(function (opt, i) {
          return (
            '<button type="button" class="article-quiz__option" data-quiz-option="' +
            i +
            '">' +
            escapeHtml(opt) +
            "</button>"
          );
        })
        .join("");
    }
  }

  function showResults() {
    setQuestionMode(false);

    const copy = getScoreCopy(score, questions.length);
    const reviewHtml = questions
      .map(function (q, i) {
        const entry = answers[i] || {};
        const chosenText = q.options && q.options[entry.chosen] != null ? q.options[entry.chosen] : "—";
        const correctText =
          q.options && q.options[q.correctIndex] != null ? q.options[q.correctIndex] : "—";
        const statusClass = entry.correct ? "article-quiz__review-item--correct" : "article-quiz__review-item--wrong";
        const statusLabel = entry.correct ? "Correct" : "Not quite";
        const explanation = q.explanation
          ? '<p class="article-quiz__review-explanation">' + escapeHtml(q.explanation) + "</p>"
          : "";

        return (
          '<li class="article-quiz__review-item ' +
          statusClass +
          '">' +
          '<p class="article-quiz__review-q"><span class="article-quiz__review-num">' +
          (i + 1) +
          ".</span> " +
          escapeHtml(q.question) +
          "</p>" +
          '<p class="article-quiz__review-answer">Your answer: <strong>' +
          escapeHtml(chosenText) +
          "</strong></p>" +
          (entry.correct
            ? ""
            : '<p class="article-quiz__review-correct">Correct answer: <strong>' +
              escapeHtml(correctText) +
              "</strong></p>") +
          '<p class="article-quiz__review-status">' +
          statusLabel +
          "</p>" +
          explanation +
          "</li>"
        );
      })
      .join("");

    if (resultsEl) {
      resultsEl.innerHTML =
        '<p class="article-quiz__headline">' +
        escapeHtml(copy.headline) +
        "</p>" +
        '<p class="article-quiz__score" aria-live="polite">' +
        '<span class="article-quiz__score-value">' +
        score +
        "</span>" +
        '<span class="article-quiz__score-total"> / ' +
        questions.length +
        " correct</span>" +
        "</p>" +
        '<p class="article-quiz__message">' +
        escapeHtml(copy.message) +
        "</p>" +
        '<h3 class="article-quiz__review-title">Your answers</h3>' +
        '<ul class="article-quiz__review">' +
        reviewHtml +
        "</ul>";
    }

    if (retakeBtn) {
      retakeBtn.hidden = false;
      retakeBtn.textContent = "Retake quiz";
    }
  }

  optionsEl.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-quiz-option]");
    if (!btn || answered) return;
    answered = true;

    const q = questions[index];
    const chosen = Number(btn.getAttribute("data-quiz-option"));
    const correct = q.correctIndex;
    const isCorrect = chosen === correct;

    answers[index] = { chosen: chosen, correct: isCorrect };

    optionsEl.querySelectorAll("[data-quiz-option]").forEach(function (opt, i) {
      opt.disabled = true;
      if (i === correct) opt.classList.add("is-correct");
      else if (i === chosen) opt.classList.add("is-wrong");
    });

    if (isCorrect) score += 1;
    if (feedbackEl) {
      feedbackEl.textContent =
        q.explanation || (isCorrect ? "That's right — great job!" : "Not quite. You'll see the full review at the end.");
    }
    if (nextBtn) nextBtn.hidden = false;
  });

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      if (index < questions.length - 1) {
        index += 1;
        renderQuestion();
      } else {
        showResults();
      }
    });
  }

    if (retakeBtn) {
    retakeBtn.hidden = true;
    retakeBtn.textContent = "Retake quiz";
    retakeBtn.addEventListener("click", function () {
      index = 0;
      score = 0;
      answers.length = 0;
      questions = reshuffleQuestions(questions);
      renderQuestion();
    });
  }

  function reshuffleQuestions(list) {
    return list.map(function (q) {
      const options = (q.options || []).slice();
      let correctIndex = Number(q.correctIndex) || 0;
      if (options.length && correctIndex >= options.length) correctIndex = 0;
      const correctAnswer = options[correctIndex];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = options[i];
        options[i] = options[j];
        options[j] = tmp;
      }
      let nextCorrectIndex = options.indexOf(correctAnswer);
      if (nextCorrectIndex < 0) nextCorrectIndex = 0;
      return {
        question: q.question,
        options: options,
        correctIndex: nextCorrectIndex,
        explanation: q.explanation,
      };
    });
  }

  renderQuestion();
})();

function initQuizFab(quizSection) {
  if (!quizSection || document.querySelector("[data-quiz-fab]")) return;

  const fab = document.createElement("a");
  fab.href = "#article-quiz";
  fab.className = "article-quiz-fab";
  fab.setAttribute("data-quiz-fab", "");
  fab.setAttribute("aria-label", "Jump to Quick Quiz");

  fab.innerHTML =
    '<span class="article-quiz-fab__ring" aria-hidden="true"></span>' +
    '<svg class="article-quiz-fab__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M9 11h6"/><path d="M9 15h6"/><path d="M9 7h6"/>' +
    '<path d="M6 3h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>' +
    "</svg>" +
    '<span class="article-quiz-fab__label">Quick Quiz</span>';

  fab.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.getElementById("article-quiz") || quizSection;
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.classList.add("article-quiz-section--highlight");
    window.setTimeout(function () {
      target.classList.remove("article-quiz-section--highlight");
    }, 1400);
  });

  const dock =
    document.getElementById("article-action-dock") ||
    (window.ArticleClap && window.ArticleClap.getActionDock ? window.ArticleClap.getActionDock() : null) ||
    (function () {
      const el = document.createElement("div");
      el.id = "article-action-dock";
      el.className = "article-action-dock";
      document.body.appendChild(el);
      return el;
    })();

  dock.insertBefore(fab, dock.firstChild);

  if (window.ArticleClap && window.ArticleClap.observeDockHideTarget) {
    window.ArticleClap.observeDockHideTarget(quizSection);
  }
}
