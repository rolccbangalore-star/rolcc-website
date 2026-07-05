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

  let index = 0;
  let score = 0;
  let answered = false;

  const questionEl = root.querySelector("[data-quiz-question]");
  const optionsEl = root.querySelector("[data-quiz-options]");
  const feedbackEl = root.querySelector("[data-quiz-feedback]");
  const nextBtn = root.querySelector("[data-quiz-next]");
  const resetBtn = root.querySelector("[data-quiz-reset]");
  const progressEl = root.querySelector("[data-quiz-progress]");

  function renderQuestion() {
    answered = false;
    const q = questions[index];
    if (!q) return;

    if (progressEl) progressEl.textContent = `Question ${index + 1} of ${questions.length}`;
    if (questionEl) questionEl.textContent = q.question;
    if (feedbackEl) feedbackEl.textContent = "";
    if (nextBtn) {
      nextBtn.hidden = true;
      nextBtn.textContent = index === questions.length - 1 ? "See results" : "Next question";
    }

    if (optionsEl) {
      optionsEl.innerHTML = (q.options || [])
        .map(
          (opt, i) =>
            `<button type="button" class="article-quiz__option" data-quiz-option="${i}">${opt}</button>`
        )
        .join("");
    }
  }

  function showResults() {
    if (questionEl) questionEl.textContent = "Quiz complete";
    if (optionsEl) optionsEl.innerHTML = "";
    if (feedbackEl) {
      feedbackEl.textContent = `You answered ${score} of ${questions.length} correctly. Nothing is saved — feel free to try again.`;
    }
    if (nextBtn) nextBtn.hidden = true;
    if (progressEl) progressEl.textContent = "";
  }

  optionsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-quiz-option]");
    if (!btn || answered) return;
    answered = true;

    const q = questions[index];
    const chosen = Number(btn.getAttribute("data-quiz-option"));
    const correct = q.correctIndex;

    optionsEl.querySelectorAll("[data-quiz-option]").forEach((opt, i) => {
      opt.disabled = true;
      if (i === correct) opt.classList.add("is-correct");
      else if (i === chosen) opt.classList.add("is-wrong");
    });

    if (chosen === correct) score += 1;
    if (feedbackEl) feedbackEl.textContent = q.explanation || (chosen === correct ? "Correct." : "Not quite.");
    if (nextBtn) nextBtn.hidden = false;
  });

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (index < questions.length - 1) {
        index += 1;
        renderQuestion();
      } else {
        showResults();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      index = 0;
      score = 0;
      renderQuestion();
    });
  }

  renderQuestion();
})();
