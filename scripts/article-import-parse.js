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

  function normalizeCollectionId(id) {
    var aliases = {
      "everyday-faith": "articles",
      "back-to-bible": "bible-study",
    };
    return aliases[id] || id || "";
  }

  function isArticlesCollection(collection) {
    return normalizeCollectionId(collection) === "articles";
  }

  function isBibleStudyCollection(collection) {
    return normalizeCollectionId(collection) === "bible-study";
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

  function stripInternalKeys(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return data;
    var entry = {};
    Object.keys(data).forEach(function (key) {
      if (key.charAt(0) === "_") return;
      entry[key] = data[key];
    });
    return entry;
  }

  var allowedTags = [];

  function setAllowedTags(tags) {
    allowedTags = (tags || [])
      .map(function (tag) {
        return String(tag || "").trim();
      })
      .filter(Boolean);
  }

  function getAllowedTags() {
    return allowedTags.slice();
  }

  function canonicalTagName(name) {
    var key = String(name || "").trim().toLowerCase();
    if (!key) return "";
    for (var i = 0; i < allowedTags.length; i++) {
      if (allowedTags[i].toLowerCase() === key) return allowedTags[i];
    }
    return String(name || "").trim();
  }

  function collectEntryText(entry, collection) {
    var parts = [entry.title, entry.summary, entry.description, entry.scripture, entry.sermonSeries, entry.passage, entry.author];
    if (isArticlesCollection(collection)) {
      (entry.blocks || []).forEach(function (block) {
        if (!block || typeof block !== "object") return;
        parts.push(block.text, block.attribution, block.reference, block.label);
        if (Array.isArray(block.items)) parts = parts.concat(block.items);
      });
      parts = parts.concat(entry.keyTakeaways || []);
    } else {
      (entry.sections || []).forEach(function (section) {
        if (!section) return;
        parts.push(section.heading, section.body);
      });
      parts = parts.concat(entry.discussionQuestions || []);
    }
    return parts
      .map(function (part) {
        return trim(part);
      })
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function scoreTagAgainstText(tag, text) {
    var score = 0;
    var normalizedTag = String(tag || "").toLowerCase();
    if (!normalizedTag || !text) return 0;
    if (text.indexOf(normalizedTag) !== -1) score += normalizedTag.length + 8;
    normalizedTag.split(/\s+|&/).forEach(function (word) {
      word = word.replace(/[^a-z0-9]/g, "");
      if (word.length < 3) return;
      if (text.indexOf(word) !== -1) score += word.length;
    });
    return score;
  }

  function suggestTagsFromContent(entry, collection) {
    var text = collectEntryText(entry, collection);
    var ranked = allowedTags
      .map(function (tag) {
        return { tag: tag, score: scoreTagAgainstText(tag, text) };
      })
      .filter(function (row) {
        return row.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score || a.tag.localeCompare(b.tag);
      });

    var picks = ranked.map(function (row) {
      return row.tag;
    });

    if (isBibleStudyCollection(collection) && picks.indexOf("Bible Study") === -1 && allowedTags.indexOf("Bible Study") !== -1) {
      picks.unshift("Bible Study");
    }

    if (!picks.length) {
      if (isBibleStudyCollection(collection) && allowedTags.indexOf("Bible Study") !== -1) {
        picks.push("Bible Study");
      } else if (allowedTags.indexOf("Faith & Peace") !== -1) {
        picks.push("Faith & Peace");
      } else if (allowedTags.length) {
        picks.push(allowedTags[0]);
      }
    }

    var seen = Object.create(null);
    return picks
      .filter(function (tag) {
        if (!tag || seen[tag]) return false;
        seen[tag] = true;
        return true;
      })
      .slice(0, 2);
  }

  function normalizeImportTags(entry, collection) {
    var tags = [];
    if (Array.isArray(entry.tags)) {
      entry.tags.forEach(function (item) {
        if (typeof item === "string" && item.trim()) tags.push(canonicalTagName(item.trim()));
        else if (item && item.tag && String(item.tag).trim()) tags.push(canonicalTagName(item.tag));
      });
    }
    if (!tags.length && entry.category) tags.push(canonicalTagName(entry.category));

    var seen = Object.create(null);
    tags = tags
      .map(function (tag) {
        return trim(tag);
      })
      .filter(function (tag) {
        if (!tag || seen[tag]) return false;
        seen[tag] = true;
        return true;
      });

    if (!tags.length) tags = suggestTagsFromContent(entry, collection);
    return tags.slice(0, 2);
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

  function prepareQuizEntry(entry) {
    if ((entry.quiz || []).length && entry.includeQuiz !== true) {
      entry.includeQuiz = true;
    }
    if (entry.quiz && entry.quiz.length) {
      entry.quiz = entry.quiz.map(normalizeQuizItem).filter(Boolean);
    }
    return entry;
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

  function normalizeBlockForDisk(block) {
    if (!block || typeof block !== "object") return null;
    var out = Object.assign({}, block);
    if (out.type === "bulletList") out.type = "list";
    if (out.type === "scriptureCallout") out.type = "scripture";
    if (out.type === "list" && Array.isArray(out.items)) {
      out.items = out.items
        .map(function (item) {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") return trim(item.item || item.text || "");
          return "";
        })
        .filter(Boolean);
    }
    return out;
  }

  function slugifyTitle(title) {
    return trim(title || "untitled")
      .toLowerCase()
      .replace(/['']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled";
  }

  function normalizeEntryForDisk(entry, collection) {
    collection = normalizeCollectionId(collection);
    var out = stripInternalKeys(Object.assign({}, entry || {}));
    prepareQuizEntry(out);

    if (isArticlesCollection(collection)) {
      out.blocks = normalizeBlocks(out.blocks || []).map(normalizeBlockForDisk).filter(Boolean);
      out.keyTakeaways = (out.keyTakeaways || [])
        .map(function (k) {
          return typeof k === "string" ? k : trim(k.item || k.text || "");
        })
        .filter(Boolean);
    } else if (isBibleStudyCollection(collection)) {
      out.sections = out.sections || [];
      out.discussionQuestions = (out.discussionQuestions || [])
        .map(function (q) {
          return typeof q === "string" ? q : trim(q.question || "");
        })
        .filter(Boolean);
    }

    if (!out.thumbnail) out.thumbnail = "/images/og-image.jpg";
    if (out.publish === undefined) out.publish = false;
    if (out.featured === undefined) out.featured = false;

    var tags = normalizeImportTags(out, collection);
    if (tags.length) {
      out.tags = tags;
      out.category = tags[0];
    }

    return out;
  }

  function normalizeBlockForCms(block) {
    if (!block || typeof block !== "object") return null;
    var out = Object.assign({}, block);
    if (out.type === "list") out.type = "bulletList";
    if (out.type === "scripture") out.type = "scriptureCallout";
    if (out.type === "bulletList" && Array.isArray(out.items)) {
      out.items = out.items.map(function (item) {
        if (typeof item === "string") return { item: item };
        if (item && typeof item === "object") return { item: trim(item.item || item.text || "") };
        return { item: "" };
      }).filter(function (row) {
        return row.item;
      });
    }
    return out;
  }

  function normalizeQuizForCms(quiz) {
    return (quiz || []).map(function (item) {
      var row = normalizeQuizItem(item);
      if (!row) return null;
      row.options = (row.options || []).map(function (opt) {
        return typeof opt === "string" ? { option: opt } : { option: trim(opt.option || opt.text || "") };
      }).filter(function (opt) {
        return opt.option;
      });
      return row;
    }).filter(Boolean);
  }

  function normalizeEntryForCms(entry, collection) {
    collection = normalizeCollectionId(collection);
    var out = stripInternalKeys(Object.assign({}, entry || {}));
    prepareQuizEntry(out);

    if (isArticlesCollection(collection)) {
      out.blocks = normalizeBlocks(out.blocks || []).map(normalizeBlockForCms).filter(Boolean);
      out.keyTakeaways = (out.keyTakeaways || []).map(function (k) {
        var text = typeof k === "string" ? k : trim(k.item || k.text || "");
        return text ? { item: text } : null;
      }).filter(Boolean);
    } else if (isBibleStudyCollection(collection)) {
      out.sections = out.sections || [];
      out.discussionQuestions = (out.discussionQuestions || []).map(function (q) {
        return typeof q === "string" ? { question: q } : { question: trim(q.question || "") };
      }).filter(function (q) {
        return q.question;
      });
    }

    if (out.quiz && out.quiz.length) {
      out.quiz = normalizeQuizForCms(out.quiz);
    }

    return out;
  }

  function pickImportFields(entry, collection) {
    collection = normalizeCollectionId(collection);
    var keys = isArticlesCollection(collection)
      ? ["title", "summary", "description", "author", "scripture", "sermonSeries", "blocks", "keyTakeaways", "includeQuiz", "quiz"]
      : ["title", "description", "passage", "author", "sections", "discussionQuestions", "includeQuiz", "quiz"];
    var picked = {};
    keys.forEach(function (key) {
      if (entry[key] !== undefined && entry[key] !== null && entry[key] !== "") {
        picked[key] = entry[key];
      }
    });
    if (Array.isArray(picked.blocks) && !picked.blocks.length) delete picked.blocks;
    if (Array.isArray(picked.keyTakeaways) && !picked.keyTakeaways.length) delete picked.keyTakeaways;
    if (Array.isArray(picked.quiz) && !picked.quiz.length) delete picked.quiz;

    var tags = normalizeImportTags(entry, collection);
    if (tags.length) {
      picked.tags = tags;
      picked.category = tags[0];
    }

    return picked;
  }

  function parseArticleJson(text, collection) {
    var data = JSON.parse(text);
    if (!data || typeof data !== "object") throw new Error("Invalid JSON object");

    collection = normalizeCollectionId(collection);
    var entry = stripInternalKeys(Object.assign({}, data));
    if (isArticlesCollection(collection)) {
      entry.blocks = normalizeBlocks(entry.blocks || []);
      entry.keyTakeaways = (entry.keyTakeaways || []).map(function (k) {
        return typeof k === "string" ? k : trim(k.item || k.text || "");
      }).filter(Boolean);
      prepareQuizEntry(entry);
    } else if (isBibleStudyCollection(collection)) {
      entry.sections = entry.sections || [];
      entry.discussionQuestions = (entry.discussionQuestions || []).map(function (q) {
        return typeof q === "string" ? q : trim(q.question || "");
      }).filter(Boolean);
      prepareQuizEntry(entry);
    }
    return entry;
  }

  function parseMarkdownToEntry(md, collection) {
    var parsed = parseFrontmatter(md);
    var entry = Object.assign({}, parsed.meta);
    collection = normalizeCollectionId(collection);

    if (isBibleStudyCollection(collection)) {
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
      entry.author = isBibleStudyCollection(collection) ? "ROLCC Fellowship Team" : "ROLCC Pastoral Team";
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
    collection = normalizeCollectionId(collection);
    var summary = {
      title: entry.title || "Untitled",
      blockCount: 0,
      sectionCount: 0,
      takeawayCount: 0,
      questionCount: 0,
      hasQuiz: entry.includeQuiz === true && (entry.quiz || []).length > 0,
    };
    if (isArticlesCollection(collection)) {
      summary.blockCount = (entry.blocks || []).length;
      summary.takeawayCount = (entry.keyTakeaways || []).length;
    } else {
      summary.sectionCount = (entry.sections || []).length;
      summary.questionCount = (entry.discussionQuestions || []).length;
    }
    return summary;
  }

  function summarizeContentEntry(entry, collection) {
    collection = normalizeCollectionId(collection);
    var summary = {
      title: entry.title || "",
      blockCount: 0,
      sectionCount: 0,
      takeawayCount: 0,
      questionCount: 0,
      quizCount: (entry.quiz || []).length,
      hasQuiz: entry.includeQuiz === true && (entry.quiz || []).length > 0,
    };
    if (isArticlesCollection(collection)) {
      summary.blockCount = (entry.blocks || []).length;
      summary.takeawayCount = (entry.keyTakeaways || []).length;
    } else {
      summary.sectionCount = (entry.sections || []).length;
      summary.questionCount = (entry.discussionQuestions || []).length;
    }
    return summary;
  }

  var CONTENT_JSON_EXAMPLE = {
    articles: {
      _tagInstructions:
        "Read the full article. Pick 1–2 tags from _allowedTags that best match the content's themes and application. Use exact spelling only.",
      tags: [],
      title: "Article title here",
      summary: "Short intro shown on the article page.",
      description: "One or two sentences for Google and social previews.",
      author: "ROLCC Pastoral Team",
      scripture: "Matthew 11:28-30",
      sermonSeries: "Everyday Faith",
      blocks: [
        { type: "paragraph", text: "Opening paragraph." },
        { type: "heading", level: "2", text: "Section heading" },
        { type: "quote", text: "Verse or quote text.", attribution: "Matthew 11:28" },
      ],
      keyTakeaways: ["First takeaway", "Second takeaway"],
      includeQuiz: true,
      quiz: [
        {
          question: "Sample question?",
          options: ["Correct answer", "Plausible wrong 1", "Plausible wrong 2", "Plausible wrong 3"],
          correctIndex: 0,
          explanation: "Brief explanation.",
        },
      ],
    },
    "bible-study": {
      _tagInstructions:
        "Read the full study. Pick 1–2 tags from _allowedTags that best match the passage and application. Include Bible Study when appropriate.",
      tags: [],
      title: "Study title",
      description: "Short description for search previews.",
      passage: "John 3:1-21",
      author: "ROLCC Fellowship Team",
      sections: [
        { heading: "Read the passage", body: "Notes for this section." },
        { heading: "Discuss together", body: "Group discussion prompts." },
      ],
      discussionQuestions: ["What stands out to you?", "How does this apply today?"],
      includeQuiz: true,
      quiz: [
        {
          question: "Sample review question?",
          options: ["Correct answer", "Plausible wrong 1", "Plausible wrong 2", "Plausible wrong 3"],
          correctIndex: 0,
          explanation: "Brief explanation.",
        },
      ],
    },
    "everyday-faith": null,
    "back-to-bible": null,
  };
  CONTENT_JSON_EXAMPLE["everyday-faith"] = CONTENT_JSON_EXAMPLE.articles;
  CONTENT_JSON_EXAMPLE["back-to-bible"] = CONTENT_JSON_EXAMPLE["bible-study"];

  var JSON_EXAMPLE = {
    title: "Article title here",
    summary: "Short intro shown on the article page.",
    description: "One or two sentences for Google and social previews.",
    author: "ROLCC Pastoral Team",
    tags: ["Faith & Peace"],
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
    stripInternalKeys: stripInternalKeys,
    setAllowedTags: setAllowedTags,
    getAllowedTags: getAllowedTags,
    normalizeImportTags: normalizeImportTags,
    suggestTagsFromContent: suggestTagsFromContent,
    normalizeEntryForCms: normalizeEntryForCms,
    normalizeEntryForDisk: normalizeEntryForDisk,
    slugifyTitle: slugifyTitle,
    pickImportFields: pickImportFields,
    normalizeCollectionId: normalizeCollectionId,
    parseFrontmatter: parseFrontmatter,
    parseArticleJson: parseArticleJson,
    parseMarkdownToEntry: parseMarkdownToEntry,
    parseImportFile: parseImportFile,
    summarizeEntry: summarizeEntry,
    summarizeContentEntry: summarizeContentEntry,
    JSON_EXAMPLE: JSON_EXAMPLE,
    CONTENT_JSON_EXAMPLE: CONTENT_JSON_EXAMPLE,
  };
});
