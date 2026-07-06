(function () {
  var WORDS_PER_MINUTE = 200;
  var DEFAULT_THUMBNAIL = "/images/og-image.jpg";
  var TYPE_LABELS = {
    "everyday-faith": "Everyday Faith",
    "back-to-bible": "Back to the Bible",
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function computeReadTime(text) {
    var words = String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (err) {
      return iso;
    }
  }

  function inlineMarkdown(text) {
    return escapeHtml(String(text || ""))
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  function youtubeEmbedId(url) {
    var value = String(url || "").trim();
    if (!value) return null;
    var patterns = [
      /youtube\.com\/watch\?v=([\w-]{11})/,
      /youtu\.be\/([\w-]{11})/,
      /youtube\.com\/embed\/([\w-]{11})/,
      /youtube\.com\/shorts\/([\w-]{11})/,
    ];
    for (var i = 0; i < patterns.length; i++) {
      var match = value.match(patterns[i]);
      if (match) return match[1];
    }
    return null;
  }

  function safeHref(url) {
    var value = String(url || "").trim();
    if (!value) return null;
    if (value.indexOf("/") === 0) return value;
    if (value.indexOf("https://") === 0 || value.indexOf("http://") === 0) return value;
    return null;
  }

  function normalizeBlock(block) {
    if (!block || typeof block !== "object") return null;
    if (block.type) return block;
    var keys = Object.keys(block).filter(function (k) {
      return k.indexOf("_") !== 0;
    });
    if (keys.length === 1 && typeof block[keys[0]] === "object") {
      var normalized = { type: keys[0] };
      var inner = block[keys[0]];
      Object.keys(inner).forEach(function (key) {
        normalized[key] = inner[key];
      });
      return normalized;
    }
    return block;
  }

  function normalizeStringList(items) {
    return (items || [])
      .map(function (item) {
        return typeof item === "string" ? item : item.item || item.text || "";
      })
      .filter(Boolean);
  }

  function blockType(block) {
    if (!block || !block.type) return "";
    if (block.type === "list") return "bulletList";
    if (block.type === "scripture" && (block.reference || block.text)) return "scriptureCallout";
    return block.type;
  }

  function collectBlockText(blocks) {
    var parts = [];
    (blocks || []).forEach(function (raw) {
      var block = normalizeBlock(raw);
      if (!block) return;
      var type = blockType(block);
      switch (type) {
        case "paragraph":
        case "quote":
          parts.push(block.text);
          break;
        case "heading":
          parts.push(block.text);
          break;
        case "bulletList":
          parts.push.apply(parts, normalizeStringList(block.items));
          break;
        case "faq":
          (block.items || []).forEach(function (item) {
            parts.push(item.question, item.answer);
          });
          if (block.question) parts.push(block.question, block.answer);
          break;
        case "image":
          parts.push(block.alt, block.caption);
          break;
        case "scriptureCallout":
          parts.push(block.reference, block.text);
          break;
        case "cta":
          parts.push(block.label, block.text);
          break;
        case "video":
          parts.push(block.title, block.caption);
          break;
        default:
          break;
      }
    });
    return parts.filter(Boolean).join(" ");
  }

  function renderBlocks(blocks) {
    var out = [];
    (blocks || []).forEach(function (raw) {
      var block = normalizeBlock(raw);
      if (!block || !block.type) return;
      var type = blockType(block);

      switch (type) {
        case "paragraph":
          out.push("<p>" + inlineMarkdown(block.text) + "</p>");
          break;
        case "heading": {
          var level = block.level === "3" || block.level === 3 ? 3 : 2;
          out.push("<h" + level + ">" + escapeHtml(block.text) + "</h" + level + ">");
          break;
        }
        case "quote":
          out.push(
            '<blockquote class="article-prose__quote"><p>' +
              inlineMarkdown(block.text) +
              "</p>" +
              (block.attribution
                ? '<cite class="article-prose__quote-cite">' + escapeHtml(block.attribution) + "</cite>"
                : "") +
              "</blockquote>"
          );
          break;
        case "image":
          out.push(
            '<figure class="article-figure"><img class="article-figure__img" src="' +
              escapeHtml(block.src || "") +
              '" alt="' +
              escapeHtml(block.alt || "") +
              '" loading="lazy" width="960" height="540" />' +
              (block.caption
                ? '<figcaption class="article-figure__caption">' + escapeHtml(block.caption) + "</figcaption>"
                : "") +
              "</figure>"
          );
          break;
        case "bulletList":
          out.push(
            '<ul class="article-prose__list">' +
              normalizeStringList(block.items)
                .map(function (item) {
                  return "<li>" + inlineMarkdown(item) + "</li>";
                })
                .join("") +
              "</ul>"
          );
          break;
        case "faq": {
          var items = block.items && block.items.length
            ? block.items
            : block.question
              ? [{ question: block.question, answer: block.answer }]
              : [];
          if (!items.length) break;
          out.push(
            '<div class="article-faq">' +
              items
                .map(function (item) {
                  return (
                    '<div class="article-faq__item"><h3 class="article-faq__question">' +
                    escapeHtml(item.question) +
                    '</h3><p class="article-faq__answer">' +
                    inlineMarkdown(item.answer) +
                    "</p></div>"
                  );
                })
                .join("") +
              "</div>"
          );
          break;
        }
        case "scriptureCallout":
          out.push(
            '<aside class="article-scripture" aria-label="Scripture">' +
              (block.reference
                ? '<p class="article-scripture__ref">' + escapeHtml(block.reference) + "</p>"
                : "") +
              '<p class="article-scripture__text">' +
              inlineMarkdown(block.text) +
              "</p></aside>"
          );
          break;
        case "cta": {
          var href = safeHref(block.url);
          if (!href) break;
          var style = block.style === "secondary" ? "article-cta--secondary" : "";
          out.push(
            '<div class="article-cta ' +
              style +
              '">' +
              (block.text ? '<p class="article-cta__text">' + inlineMarkdown(block.text) + "</p>" : "") +
              '<a class="article-cta__btn" href="' +
              escapeHtml(href) +
              '">' +
              escapeHtml(block.label || "Learn more") +
              "</a></div>"
          );
          break;
        }
        case "video": {
          var videoId = youtubeEmbedId(block.url);
          if (!videoId) break;
          var title = escapeHtml(block.title || "Video");
          out.push(
            '<figure class="article-video"><div class="article-video__frame"><iframe src="https://www.youtube-nocookie.com/embed/' +
              videoId +
              '" title="' +
              title +
              '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>' +
              (block.caption
                ? '<figcaption class="article-video__caption">' + escapeHtml(block.caption) + "</figcaption>"
                : "") +
              "</figure>"
          );
          break;
        }
        default:
          break;
      }
    });
    return out.join("\n");
  }

  function renderArticleMetaBar(article) {
    var tags = [];
    if (article.tags && article.tags.length) {
      tags = article.tags;
    } else if (article.category) {
      tags = [article.category];
    }
    var tagHtml = tags.length
      ? tags
          .map(function (tag) {
            return '<span class="article-tag">' + escapeHtml(tag) + "</span>";
          })
          .join("")
      : '<span class="article-tag">' + escapeHtml(article.category || "General") + "</span>";
    return (
      '<div class="article-meta">' +
      '<div class="article-meta__tags">' +
      tagHtml +
      "</div>" +
      (article.author
        ? '<p class="article-meta__author">' + escapeHtml(article.author) + "</p>"
        : "") +
      '<div class="article-meta__details">' +
      '<span class="article-meta__item">' +
      escapeHtml(article.dateFormatted || "") +
      '</span><span class="article-meta__item">' +
      article.readTime +
      " min read</span>" +
      (article.scripture
        ? '<span class="article-meta__item article-meta__scripture">' + escapeHtml(article.scripture) + "</span>"
        : "") +
      "</div></div>"
    );
  }

  function renderSummaryBox(summary) {
    if (!summary) return "";
    return (
      '<div class="article-summary"><p class="article-summary__label">Summary</p><p class="article-summary__text">' +
      inlineMarkdown(summary) +
      "</p></div>"
    );
  }

  function renderKeyTakeaways(items) {
    var list = normalizeStringList(items);
    if (!list.length) return "";
    return (
      '<aside class="article-takeaways" aria-label="Key takeaways"><p class="article-takeaways__label">Key takeaways</p><ul class="article-takeaways__list">' +
      list
        .map(function (item) {
          return "<li>" + inlineMarkdown(item) + "</li>";
        })
        .join("") +
      "</ul></aside>"
    );
  }

  function normalizeQuiz(quiz) {
    return (quiz || []).map(function (item) {
      var seen = new Set();
      var options = (item.options || [])
        .map(function (o) {
          return String(typeof o === "string" ? o : o.option || "").trim();
        })
        .filter(function (text) {
          if (!text) return false;
          var key = text.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      var correctIndex = Number(item.correctIndex) || 0;
      if (options.length && correctIndex >= options.length) correctIndex = 0;
      return {
        question: item.question,
        options: options,
        correctIndex: correctIndex,
        explanation: item.explanation || "",
      };
    });
  }

  function renderQuizSection(article) {
    if (!article.includeQuiz || !article.quiz || !article.quiz.length) return "";
    return (
      '<section class="article-section" id="article-quiz" aria-label="Study quiz"><h2 class="text-lg font-semibold text-slate-900">Quick quiz</h2>' +
      '<p class="mt-2 text-sm text-slate-600">Test your understanding. Answers stay on this device only.</p>' +
      '<div class="article-quiz mt-4" data-article-quiz><p class="text-xs text-slate-500" data-quiz-progress></p>' +
      '<p class="article-quiz__question mt-2" data-quiz-question></p><div class="article-quiz__options" data-quiz-options></div>' +
      '<div class="article-quiz__results" data-quiz-results hidden></div>' +
      '<p class="article-quiz__feedback" data-quiz-feedback></p><div class="article-quiz__actions">' +
      '<button type="button" class="article-quiz__btn" data-quiz-next hidden>Next question</button>' +
      '<button type="button" class="article-quiz__btn article-quiz__btn--ghost" data-quiz-reset hidden>Retake quiz</button>' +
      "</div></div></section>"
    );
  }

  function renderQuizScripts(article) {
    if (!article.includeQuiz || !article.quiz || !article.quiz.length) return "";
    return (
      '<script id="article-quiz-data" type="application/json">' +
      JSON.stringify(article.quiz).replace(/</g, "\\u003c") +
      '</script><script src="/js/articles/quiz.js"><\/script>'
    );
  }

  function buildPreviewShell(bodyMain, scripts, title) {
    return (
      "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\" />" +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
      "<title>" +
      escapeHtml(title || "Article preview") +
      "</title>" +
      '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' +
      '<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap" rel="stylesheet" />' +
      '<script src="https://cdn.tailwindcss.com"><\/script>' +
      "<script>tailwind.config = { theme: { extend: { colors: { primary: \"#ffffff\", primaryDark: \"#f6f9fc\", accent: \"#635bff\", accentSoft: \"#818cf8\" } } } };<\/script>" +
      '<link rel="stylesheet" href="/css/styles.css" />' +
      '<link rel="stylesheet" href="/css/articles.css" />' +
      "</head><body class=\"bg-slate-50 text-slate-900\">" +
      '<main class="main-no-top-gap relative z-10">' +
      bodyMain +
      "</main>" +
      (scripts || "") +
      "</body></html>"
    );
  }

  function buildEverydayFaithPreview(data) {
    var blocks = data.blocks || [];
    var keyTakeaways = data.keyTakeaways || [];
    var date = data.date || new Date().toISOString().slice(0, 10);
    var textForReadTime = [data.title, data.description, data.summary]
      .concat(keyTakeaways)
      .concat([collectBlockText(blocks)])
      .join(" ");
    var article = {
      type: "everyday-faith",
      typeLabel: TYPE_LABELS["everyday-faith"],
      title: data.title || "Untitled article",
      description: data.description || "",
      summary: data.summary || data.description || "",
      author: data.author || "ROLCC Pastoral Team",
      category: data.category || "General",
      date: date,
      dateFormatted: formatDate(date),
      thumbnail: data.thumbnail || DEFAULT_THUMBNAIL,
      scripture: data.scripture || "",
      sermonSeries: data.sermonSeries || "",
      keyTakeaways: keyTakeaways,
      includeQuiz: data.includeQuiz === true,
      quiz: data.includeQuiz === true ? normalizeQuiz(data.quiz) : [],
      readTime: computeReadTime(textForReadTime),
      bodyHtml: renderBlocks(blocks),
    };

    var bodyMain =
      '<article class="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">' +
      '<p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">' +
      escapeHtml(article.typeLabel) +
      "</p>" +
      '<h1 class="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">' +
      escapeHtml(article.title) +
      "</h1>" +
      renderArticleMetaBar(article) +
      '<img class="mt-8 w-full rounded-2xl border border-slate-200" src="' +
      escapeHtml(article.thumbnail) +
      '" alt="" width="960" height="540" loading="lazy" />' +
      renderSummaryBox(article.summary) +
      '<div class="article-prose mt-8">' +
      article.bodyHtml +
      "</div>" +
      renderKeyTakeaways(article.keyTakeaways) +
      renderQuizSection(article) +
      "</article>";

    var title = article.title + " | Everyday Faith | River of Life Christian Church";
    return buildPreviewShell(bodyMain, renderQuizScripts(article), title);
  }

  function buildBibleStudyPreview(data) {
    var date = data.date || new Date().toISOString().slice(0, 10);
    var sections = data.sections || [];
    var discussionQuestions = (data.discussionQuestions || [])
      .map(function (q) {
        return typeof q === "string" ? q : q.question || "";
      })
      .filter(Boolean);
    var textParts = [data.passage]
      .concat(
        sections.map(function (s) {
          return (s.heading || "") + " " + (s.body || "");
        })
      )
      .concat(discussionQuestions);
    var article = {
      type: "back-to-bible",
      typeLabel: TYPE_LABELS["back-to-bible"],
      title: data.title || "Untitled study",
      description: data.description || "",
      author: data.author || "ROLCC",
      date: date,
      dateFormatted: formatDate(date),
      thumbnail: data.thumbnail || DEFAULT_THUMBNAIL,
      passage: data.passage || "",
      sections: sections,
      discussionQuestions: discussionQuestions,
      activities: data.activities || [],
      includeQuiz: data.includeQuiz === true,
      quiz: data.includeQuiz === true ? normalizeQuiz(data.quiz) : [],
      readTime: computeReadTime(textParts.join(" ")),
    };

    var sectionsHtml = sections
      .map(function (s) {
        return (
          '<section class="article-section"><h2 class="text-lg font-semibold text-slate-900">' +
          escapeHtml(s.heading || "") +
          '</h2><p class="mt-3 text-slate-700 leading-relaxed">' +
          escapeHtml(s.body || "") +
          "</p></section>"
        );
      })
      .join("");

    var questionsHtml = discussionQuestions.length
      ? '<section class="article-section"><h2 class="text-lg font-semibold text-slate-900">Discussion questions</h2><ul class="mt-3 list-disc pl-5 space-y-2 text-slate-700">' +
        discussionQuestions
          .map(function (q) {
            return "<li>" + escapeHtml(q) + "</li>";
          })
          .join("") +
        "</ul></section>"
      : "";

    var activitiesHtml = article.activities.length
      ? '<section class="article-section"><h2 class="text-lg font-semibold text-slate-900">Activities</h2>' +
        article.activities
          .map(function (a) {
            return (
              '<div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 class="font-medium text-slate-900">' +
              escapeHtml(a.title || "") +
              '</h3><p class="mt-2 text-sm text-slate-600">' +
              escapeHtml(a.body || "") +
              "</p></div>"
            );
          })
          .join("") +
        "</section>"
      : "";

    var bodyMain =
      '<article class="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">' +
      '<p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">' +
      escapeHtml(article.typeLabel) +
      "</p>" +
      '<h1 class="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">' +
      escapeHtml(article.title) +
      "</h1>" +
      '<p class="mt-4 text-sm text-slate-500">' +
      escapeHtml(article.dateFormatted) +
      " · " +
      article.readTime +
      " min read</p>" +
      (article.passage
        ? '<p class="mt-2 text-sm font-medium text-slate-700">Passage: ' + escapeHtml(article.passage) + "</p>"
        : "") +
      '<img class="mt-8 w-full rounded-2xl border border-slate-200" src="' +
      escapeHtml(article.thumbnail) +
      '" alt="" width="960" height="540" loading="lazy" />' +
      sectionsHtml +
      questionsHtml +
      activitiesHtml +
      renderQuizSection(article) +
      "</article>";

    var title = article.title + " | Back to the Bible | River of Life Christian Church";
    return buildPreviewShell(bodyMain, renderQuizScripts(article), title);
  }

  function buildArticlePreview(data, collectionId) {
    if (collectionId === "bible-study" || collectionId === "back-to-bible") {
      return buildBibleStudyPreview(data);
    }
    return buildEverydayFaithPreview(data);
  }

  window.ArticleRender = {
    buildArticlePreview: buildArticlePreview,
    renderBlocks: renderBlocks,
  };
})();
