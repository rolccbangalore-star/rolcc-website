/**
 * Article import parsers — browser-safe (also usable in Node via require).
 * Converts JSON or markdown/plain text into article entry objects for the CMS.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ArticleImportParse = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  var SCRIPTURE_RE =
    /^(?:[1-3]\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)?\s+\d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?$/;

  function trim(value) {
    return String(value || "").trim();
  }

  function parseFrontmatter(raw) {
    var match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
    if (!match) return { meta: {}, body: trim(raw) };

    var meta = {};
    match[1].split(/\r?\n/).forEach(function (line) {
      var idx = line.indexOf(":");
      if (idx === -1) return;
      var key = line.slice(0, idx).trim();
      var val = line.slice(idx + 1).trim();
      if (
        (val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') ||
        (val.charAt(0) === "'" && val.charAt(val.length - 1) === "'")
      ) {
        val = val.slice(1, -1);
      }
      if (val === "true") meta[key] = true;
      else if (val === "false") meta[key] = false;
      else meta[key] = val;
    });
    return { meta: meta, body: trim(match[2]) };
  }

  function isScriptureReference(text) {
    return SCRIPTURE_RE.test(trim(text));
  }

  function parseQuoteLine(line) {
    var text = line.replace(/^>\s?/, "").trim();
    var dash = text.match(/\s[—–-]\s+(.+)$/);
    if (dash) {
      return { text: text.replace(/\s[—–-]\s+.+$/, "").trim(), attribution: dash[1].trim() };
    }
    return { text: text, attribution: "" };
  }

  function flushList(items) {
    if (!items.length) return null;
    return { type: "bulletList", items: items.slice() };
  }

  function parseMarkdownBlocks(body) {
    var lines = String(body || "").split(/\r?\n/);
    var blocks = [];
    var listItems = [];
    var paragraph = [];
    var title = "";

    function flushParagraph() {
      var text = paragraph.join(" ").trim();
      paragraph = [];
      if (text) blocks.push({ type: "paragraph", text: text });
    }

    function flushListItems() {
      var block = flushList(listItems);
      listItems = [];
      if (block) blocks.push(block);
    }

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      var line = raw.trim();

      if (!line) {
        flushParagraph();
        flushListItems();
        continue;
      }

      if (line.indexOf("# ") === 0) {
        flushParagraph();
        flushListItems();
        if (!title) title = line.slice(2).trim();
        continue;
      }

      if (line.indexOf("## ") === 0) {
        flushParagraph();
        flushListItems();
        blocks.push({ type: "heading", level: "2", text: line.slice(3).trim() });
        continue;
      }

      if (line.indexOf("### ") === 0) {
        flushParagraph();
        flushListItems();
        blocks.push({ type: "heading", level: "3", text: line.slice(4).trim() });
        continue;
      }

      if (line.indexOf("> ") === 0 || line.indexOf(">") === 0) {
        flushParagraph();
        flushListItems();
        var quote = parseQuoteLine(line);
        blocks.push({
          type: "quote",
          text: quote.text,
          attribution: quote.attribution || "",
        });
        continue;
      }

      if (line.indexOf("- ") === 0 || line.indexOf("* ") === 0) {
        flushParagraph();
        listItems.push(line.slice(2).trim());
        continue;
      }

      if (isScriptureReference(line) && line.length < 80) {
        flushParagraph();
        flushListItems();
        blocks.push({ type: "scriptureCallout", reference: line, text: "" });
        continue;
      }

      paragraph.push(line);
    }

    flushParagraph();
    flushListItems();
    return { title: title, blocks: blocks };
  }

  function parseMarkdownSections(body) {
    var lines = String(body || "").split(/\r?\n/);
    var sections = [];
    var questions = [];
    var title = "";
    var current = null;
    var bodyLines = [];

    function flushSection() {
      if (!current) return;
      current.body = bodyLines.join("\n").trim();
      sections.push(current);
      current = null;
      bodyLines = [];
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) {
        if (current) bodyLines.push("");
        continue;
      }
      if (line.indexOf("# ") === 0) {
        flushSection();
        title = line.slice(2).trim();
        continue;
      }
      if (line.indexOf("## ") === 0) {
        flushSection();
        current = { heading: line.slice(3).trim(), body: "" };
        continue;
      }
      if (line.indexOf("- ") === 0 || line.indexOf("* ") === 0 || /^\d+\.\s/.test(line)) {
        questions.push(line.replace(/^(\d+\.\s|[-*]\s)/, "").trim());
        continue;
      }
      if (current) bodyLines.push(lines[i]);
    }
    flushSection();
    return { title: title, sections: sections, discussionQuestions: questions };
  }

  function normalizeQuizItem(item) {
    if (!item || typeof item !== "object") return null;
    return {
      question: trim(item.question),
      options: (item.options || []).map(function (o) {
        return typeof o === "string" ? o : trim(o.option || o.text || "");
      }),
      correctIndex: typeof item.correctIndex === "number" ? item.correctIndex : 0,
      explanation: trim(item.explanation),
    };
  }

  function normalizeBlocks(blocks) {
    return (blocks || [])
      .map(function (block) {
        if (!block || typeof block !== "object") return null;
        if (block.type === "list" && block.items) {
          return { type: "bulletList", items: block.items };
        }
        return block;
      })
      .filter(Boolean);
  }

  function parseArticleJson(text, collection) {
    var data = JSON.parse(text);
    if (!data || typeof data !== "object") throw new Error("Invalid JSON object");

    var entry = Object.assign({}, data);
    if (collection === "everyday-faith") {
      entry.blocks = normalizeBlocks(entry.blocks || []);
      entry.keyTakeaways = (entry.keyTakeaways || []).map(function (k) {
        return typeof k === "string" ? k : trim(k.item || k.text || "");
      }).filter(Boolean);
      if (entry.includeQuiz && entry.quiz) {
        entry.quiz = entry.quiz.map(normalizeQuizItem).filter(Boolean);
      }
    } else if (collection === "back-to-bible") {
      entry.sections = entry.sections || [];
      entry.discussionQuestions = (entry.discussionQuestions || []).map(function (q) {
        return typeof q === "string" ? q : trim(q.question || "");
      }).filter(Boolean);
      if (entry.includeQuiz && entry.quiz) {
        entry.quiz = entry.quiz.map(normalizeQuizItem).filter(Boolean);
      }
    }
    return entry;
  }

  function parseMarkdownToEntry(md, collection) {
    var parsed = parseFrontmatter(md);
    var entry = Object.assign({}, parsed.meta);

    if (collection === "back-to-bible") {
      var btb = parseMarkdownSections(parsed.body);
      if (btb.title) entry.title = btb.title;
      entry.sections = btb.sections;
      entry.discussionQuestions = btb.discussionQuestions;
    } else {
      var ef = parseMarkdownBlocks(parsed.body);
      if (ef.title) entry.title = ef.title;
      entry.blocks = ef.blocks;
    }

    if (!entry.author) {
      entry.author = collection === "back-to-bible" ? "ROLCC Fellowship Team" : "ROLCC Pastoral Team";
    }
    return entry;
  }

  function detectFormat(text, filename) {
    var name = (filename || "").toLowerCase();
    if (name.endsWith(".json")) return "json";
    var trimmed = trim(text);
    if (trimmed.charAt(0) === "{") return "json";
    return "markdown";
  }

  function parseImportFile(text, collection, filename) {
    var format = detectFormat(text, filename);
    if (format === "json") return parseArticleJson(text, collection);
    return parseMarkdownToEntry(text, collection);
  }

  function summarizeEntry(entry, collection) {
    var summary = {
      title: entry.title || "Untitled",
      blockCount: 0,
      sectionCount: 0,
      takeawayCount: 0,
      questionCount: 0,
      hasQuiz: entry.includeQuiz === true && (entry.quiz || []).length > 0,
    };
    if (collection === "everyday-faith") {
      summary.blockCount = (entry.blocks || []).length;
      summary.takeawayCount = (entry.keyTakeaways || []).length;
    } else {
      summary.sectionCount = (entry.sections || []).length;
      summary.questionCount = (entry.discussionQuestions || []).length;
    }
    return summary;
  }

  var JSON_EXAMPLE = {
    title: "Article title here",
    summary: "Short intro shown on the article page.",
    description: "One or two sentences for Google and social previews.",
    author: "ROLCC Pastoral Team",
    category: "Faith & Peace",
    date: "2026-07-06",
    scripture: "Matthew 11:28-30",
    sermonSeries: "Everyday Faith",
    publish: false,
    blocks: [
      { type: "paragraph", text: "Opening paragraph." },
      { type: "heading", level: "2", text: "Section heading" },
      { type: "quote", text: "Verse or quote text.", attribution: "Matthew 11:28" },
    ],
    keyTakeaways: ["First takeaway", "Second takeaway"],
    includeQuiz: false,
  };

  return {
    parseFrontmatter: parseFrontmatter,
    parseArticleJson: parseArticleJson,
    parseMarkdownToEntry: parseMarkdownToEntry,
    parseImportFile: parseImportFile,
    summarizeEntry: summarizeEntry,
    JSON_EXAMPLE: JSON_EXAMPLE,
  };
});
