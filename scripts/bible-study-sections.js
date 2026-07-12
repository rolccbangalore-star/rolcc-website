const { escapeHtml } = require("./article-config");
const fs = require("fs");

function cleanBibleStudySource(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/--\s*\d+\s+of\s+\d+\s*--/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\u20E3]/gu, "")
    .replace(/\uFFFD/g, "")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const REPEAT_TITLE_PATTERNS = [
  /^THE WIDOW[\u2019']S OIL & GOD[\u2019']S PROVISION/i,
  /^MARK 6:35-44$/i,
  /^PARABLE OF THE TALENTS$/i,
  /^MOUNTAINS IN THE BIBLE/i,
  /^\(2 Kings 4:1/i,
];

function isRepeatTitle(line) {
  const t = normalizeStudyLine(line);
  return REPEAT_TITLE_PATTERNS.some((pattern) => pattern.test(t));
}

function readStudySourceFile(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return cleanBibleStudySource(buf.toString("utf16le"));
  }
  return cleanBibleStudySource(buf.toString("utf8"));
}

function normalizeStudyLine(line) {
  return String(line || "")
    .replace(/\t+/g, " ")
    .replace(/^[?]+\s*/g, "")
    .replace(/^\d+[\uFE0F\u20E3\u200D]+\s+/u, "")
    .replace(/^\d+\??\s*(?=MOUNT\s)/i, "")
    .replace(/^\d+\s+(?=(?:THE|JESUS|EVERYONE|THERE|BONUS)\b)/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSentenceLike(line) {
  const t = normalizeStudyLine(line);
  if (!t) return true;
  if (/^\d+\??\s*MOUNT\s/i.test(t)) return false;
  if (/^\d+\.\s+[A-Z]/.test(t)) {
    const titlePart = t.replace(/^\d+\.\s+/, "");
    if (/^(Who|What|Why|When|How|Have|Which|Can|Am|Is)\b/i.test(titlePart)) return true;
    return false;
  }
  if (/^(Main Scripture|Theme Verse|Icebreaker|Memory Verse|Key Verse|Purpose|Keyword|Mark \d)/i.test(t)) {
    return true;
  }
  if (/^\d+\.\s+[A-Za-z][a-z]/.test(t)) return true;
  if (/^\.\s+/.test(t)) return true;
  if (/[a-z]/.test(t) && !/^[A-Z0-9\s'\-—:();,.!?]+$/.test(t)) return true;
  return false;
}

function formatSectionHeading(rawLine) {
  const t = normalizeStudyLine(rawLine);
  const mountMatch = t.match(/^(\d+)\??\s*(MOUNT\b.+?)(?:\s*\(.+\))?$/i);
  if (mountMatch) {
    return `${mountMatch[1]}. ${mountMatch[2].trim()}`;
  }
  return t.replace(/^\?+\s*/, "");
}

function isHeadingLine(line) {
  const t = normalizeStudyLine(line);
  const isMountHeading = /^\d+\??\s*MOUNT\s/i.test(t);
  if (!t || (t.length > 140 && !isMountHeading)) return false;
  if (/^\d+$/.test(t)) return false;
  if (isRepeatTitle(t)) return false;
  if (/^Reference[s]?:$/i.test(t)) return false;
  if (isSentenceLike(line)) return false;
  if (/^\d+\.\s+(Who|What|Why|When|How|Have)\b/i.test(t)) return false;

  if (/^\d+\.\s+[A-Z]/.test(t)) return true;
  if (/^\d+\??\s*MOUNT\s/i.test(t)) return true;
  if (/^\d+\s+THE\s+[A-Z]/.test(t)) return true;
  if (/^(THE|JESUS|EVERYONE|THERE|BONUS)\s+[A-Z]/.test(t) && !/[a-z]/.test(t)) return true;

  const explicitHeadings = [
    /^ICE\s*BREAKER/i,
    /^MEMORY\s*VERSE/i,
    /^KEY\s*VERSE/i,
    /^KEY\s*SCRIPTURES/i,
    /^MAIN\s*IDEA$/i,
    /^MAIN\s*SCRIPTURE/i,
    /^THEME\s*VERSE/i,
    /^MAIN\s*THEMES/i,
    /^MAIN\s*EVENTS?$/i,
    /^MAIN\s*EVENT$/i,
    /^MAIN\s*TEACHING/i,
    /^FINAL\s*CONCLUSION/i,
    /^SPIRITUAL\s*LESSON/i,
    /^WHAT\s+DO\s+MOUNTAINS/i,
    /^SUMMARY$/i,
    /^CONCLUSION$/i,
    /^APPLICATION$/i,
    /^PROBLEM$/i,
    /^BONUS\s*INSIGHT/i,
    /^QUICK\s*CLOSING/i,
    /^REFLECTION\s*QUESTIONS/i,
    /^CLOSING\s*THOUGHT/i,
    /^THE\s+ARMOR\s+OF\s+GOD/i,
    /^THE\s+FRUIT\s+OF\s+THE\s+SPIRIT/i,
    /^THE\s+GIFTS\s+OF\s+THE\s+SPIRIT/i,
    /^FUNCTIONAL\s*ASPECTS/i,
    /^A\s+PRACTICAL\s+COMPARISON/i,
    /^JESUS\s+AND\s+THE\s+MOUNTAINS/i,
    /^TEN\s+IMPORTANT\s+MOUNTAINS/i,
    /^SERVANT\s+\d/i,
    /^REWARD\s+FOR\s+FAITHFULNESS/i,
    /^THE\s+UNFAITHFUL\s+SERVANT/i,
    /^THE\s+MASTER'?S?\s+RESPONSE/i,
    /^THE\s+MASTER\s+RETURNS/i,
    /^TALENT\s+TAKEN\s+AWAY/i,
    /^THE\s+PARABLE\s+OF\s+THE\s+TALENTS/i,
    /^PARABLE\s+OF\s+THE\s+TALENTS/i,
    /^THE\s+MOUNT\s+OF\s+TRANSFIGURATION/i,
    /^WHAT\s+IS\s+THE\s+TRANSFIGURATION/i,
    /^THE\s+PEOPLE\s+ON\s+THE\s+MOUNTAIN/i,
    /^THREE\s+GREAT\s+REVELATIONS/i,
    /^THE\s+MOUNTAIN\s+EXPERIENCE/i,
    /^THE\s+VALLEY\s+EXPERIENCE/i,
    /^PETER'?S?\s+RESPONSE/i,
    /^THE\s+MOST\s+BEAUTIFUL\s+MOMENT/i,
    /^PRACTICAL\s+LIFE\s+LESSONS/i,
    /^JESUS\s+WALKS\s+ON\s+THE\s+SEA/i,
    /^WHY\s+WERE\s+THE\s+DISCIPLES/i,
  ];

  if (explicitHeadings.some((pattern) => pattern.test(t))) return true;

  if (
    t.length >= 10 &&
    t.length <= 90 &&
    /^[A-Z0-9\s'\-—:();,.!?]+$/.test(t) &&
    /[A-Z]{4,}/.test(t) &&
    !/^\d+\s*(Kings|Matthew|Mark|Luke|John|Corinthians|Ephesians|Galatians|Samuel|Chronicles|Peter|James|Philippians|Zechariah|Exodus|Leviticus|Deuteronomy|Hebrews|Isaiah)/i.test(
      t
    )
  ) {
    return true;
  }

  return false;
}

function splitSourceIntoSections(text, options = {}) {
  const cleaned = cleanBibleStudySource(text);
  if (!cleaned) return [];

  const lines = cleaned.split("\n");
  const sections = [];
  let currentHeading = options.introHeading || "";
  let currentBody = [];

  function pushSection() {
    const body = currentBody.join("\n").trim();
    if (!currentHeading && !body) return;
    sections.push({
      heading: currentHeading || options.fallbackHeading || "Overview",
      body,
    });
  }

  for (const rawLine of lines) {
    const line = normalizeStudyLine(rawLine);
    if (!line) {
      currentBody.push("");
      continue;
    }

    if (isHeadingLine(rawLine)) {
      pushSection();
      const heading = formatSectionHeading(rawLine);
      const t = normalizeStudyLine(rawLine);
      const mountSubtitleMatch = t.match(/^\d+\??\s*MOUNT\b[^(]*(\(.+\))\s*$/i);
      currentHeading = heading;
      currentBody = mountSubtitleMatch ? [mountSubtitleMatch[1].trim()] : [];
      continue;
    }

    currentBody.push(line);
  }

  pushSection();
  const cleanedSections = sections
    .filter((section) => section.heading || section.body)
    .filter((section) => !isRepeatTitle(section.heading))
    .map((section) => ({
      heading: section.heading || options.fallbackHeading || "Overview",
      body: section.body.trim(),
    }));

  return cleanedSections;
}

function splitStructuredBody(text) {
  return splitSourceIntoSections(text, { fallbackHeading: "Overview" });
}

const STUDY_LABELS =
  /^(What's happening|What is|Important(?:\s+Background|\s+Lesson|\s+Insight)?|Main (?:Point|Idea|Event|Teaching|Scripture)|Reference[s]?|Spiritual (?:Meaning|Lesson)|Possible Reasons?|Teaching|Significance|Keyword|Icebreaker|Memory Verse|Key Verse|Theme Verse|Purpose|Then|He tells her to|God provided|This miracle shows that God cares about|This required|The story of the widow's oil teaches us)(?::)?$/i;

const BULLET_SPLIT = /\s*[\uF0B7\u2022\u25CF\u25AA\u2023●•▪\-–—]\s+/;

function scrubBodyLine(line) {
  const t = String(line || "").trim();
  if (!t) return "";
  if (isRepeatTitle(t)) return "";
  if (/^\(?2 Kings 4:1/i.test(t)) return "";
  if (/^THE WIDOW[\u2019']S OIL & GOD[\u2019']S PROVISION/i.test(t)) return "";
  if (/^\d+$/.test(t)) return "";
  return t;
}

function preprocessBodyLines(body) {
  return String(body || "")
    .split("\n")
    .map(scrubBodyLine)
    .filter(Boolean);
}

function isQuoteLine(line) {
  const t = line.trim();
  return /^["\u201c]/.test(t) && /["\u201d]?\s*$/.test(t);
}

function isLabelLine(line) {
  const t = line.trim();
  if (STUDY_LABELS.test(t)) return true;
  return /^[A-Za-z][^:]{0,56}:$/.test(t);
}

function labelText(line) {
  return line.trim().replace(/:$/, "");
}

function hasInlineBullets(line) {
  return BULLET_SPLIT.test(line) && line.split(BULLET_SPLIT).filter(Boolean).length > 1;
}

function expandToListItems(lines) {
  const items = [];
  lines.forEach((line) => {
    if (hasInlineBullets(line)) {
      line
        .split(BULLET_SPLIT)
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => items.push(part));
      return;
    }
    const bulletMatch = line.match(/^[\uF0B7\u2022\u25CF\u25AA\u2023●•▪\-–—]\s*(.+)$/);
    if (bulletMatch) {
      items.push(bulletMatch[1].trim());
      return;
    }
    items.push(line.trim());
  });
  return items;
}

function shouldUseList(label, lines) {
  if (!lines.length) return false;
  if (
    /main point|main lesson|spiritual meaning|important lesson|important insight|important background/i.test(
      label
    ) &&
    lines.length <= 2
  ) {
    return false;
  }
  if (/reference|reason|provided|required|teaching|happening|tells her|cares about|teaches us/i.test(label)) {
    return true;
  }
  if (lines.some((line) => hasInlineBullets(line) || /^[\uF0B7\u2022●•▪\-–—]/.test(line))) return true;
  if (lines.length > 1) return true;
  return false;
}

function isSubheadingLine(line) {
  const t = line.trim();
  if (!t || t.length > 90) return false;
  if (isLabelLine(t) || isQuoteLine(t)) return false;
  if (/^\d+\.\s+/.test(t)) return false;
  return (
    /^[A-Z0-9\s'\-—:();,.!?&]+$/.test(t) &&
    /[A-Z]{4,}/.test(t) &&
    !/^(Exodus|Matthew|Mark|Luke|John|James|Peter|Hebrews|Philippians|Zechariah|Leviticus)/i.test(t)
  );
}

function parseQaLine(line) {
  const inline = line.match(/^(\d+)\.\s+(.+?)\s+Answer:\s*(.+)$/i);
  if (inline) {
    return { num: inline[1], question: inline[2].trim(), answer: inline[3].trim() };
  }
  const questionOnly = line.match(/^(\d+)\.\s+(.+\?)\s*$/);
  if (questionOnly) {
    return { num: questionOnly[1], question: questionOnly[2].trim(), answer: "" };
  }
  const answerOnly = line.match(/^Answer:\s*(.+)$/i);
  if (answerOnly) {
    return { answer: answerOnly[1].trim() };
  }
  return null;
}

function renderLabelBlock(label, contentLines) {
  let html = `<h4 class="study-subheading">${escapeHtml(label)}</h4>`;
  if (!contentLines.length) return html;

  if (shouldUseList(label, contentLines)) {
    let listOpen = false;
    const closeList = () => {
      if (listOpen) {
        html += "</ul>";
        listOpen = false;
      }
    };
    const openList = () => {
      if (!listOpen) {
        html += '<ul class="study-list">';
        listOpen = true;
      }
    };

    contentLines.forEach((line) => {
      if (isSubheadingLine(line)) {
        closeList();
        html += `<h3 class="study-subheading study-subheading--major">${escapeHtml(line)}</h3>`;
        return;
      }
      const items = expandToListItems([line]);
      openList();
      items.forEach((item) => {
        html += `<li>${escapeHtml(item)}</li>`;
      });
    });
    closeList();
    return html;
  }

  contentLines.forEach((line) => {
    if (isSubheadingLine(line)) {
      html += `<h3 class="study-subheading study-subheading--major">${escapeHtml(line)}</h3>`;
    } else if (isQuoteLine(line)) {
      html += `<blockquote class="study-quote">${escapeHtml(line)}</blockquote>`;
    } else {
      html += `<p>${escapeHtml(line)}</p>`;
    }
  });
  return html;
}

function renderQaBlock(entries) {
  return `<div class="study-qa">${entries
    .map((entry) => {
      let block = "";
      if (entry.question) {
        block += `<p class="study-qa__question"><span class="study-qa__num">${escapeHtml(entry.num || "")}</span>${escapeHtml(entry.question)}</p>`;
      }
      if (entry.answer) {
        block += `<p class="study-qa__answer"><strong>Answer:</strong> ${escapeHtml(entry.answer)}</p>`;
      }
      return block;
    })
    .join("")}</div>`;
}

function renderBibleStudyBodyHtml(body) {
  const lines = preprocessBodyLines(body);
  if (!lines.length) return "";

  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (parseQaLine(line) || /^\d+\.\s+.+\?\s*Answer:/i.test(line)) {
      const entries = [];
      let pending = null;
      while (i < lines.length) {
        const qa = parseQaLine(lines[i]);
        if (!qa && !/^\d+\.\s+/.test(lines[i])) break;
        if (qa && qa.question && !qa.answer) {
          pending = qa;
        } else if (qa && qa.answer && !qa.question && pending) {
          entries.push({ ...pending, answer: qa.answer });
          pending = null;
        } else if (qa) {
          entries.push(qa);
        } else {
          break;
        }
        i++;
      }
      if (pending) entries.push(pending);
      html += renderQaBlock(entries);
      continue;
    }

    if (isQuoteLine(line)) {
      html += `<blockquote class="study-quote">${escapeHtml(line)}</blockquote>`;
      i++;
      continue;
    }

    if (isSubheadingLine(line)) {
      html += `<h3 class="study-subheading study-subheading--major">${escapeHtml(line)}</h3>`;
      i++;
      continue;
    }

    if (isLabelLine(line)) {
      const label = labelText(line);
      i++;
      const contentLines = [];
      while (i < lines.length && !isLabelLine(lines[i]) && !isQuoteLine(lines[i]) && !isSubheadingLine(lines[i]) && !parseQaLine(lines[i])) {
        contentLines.push(lines[i]);
        i++;
      }
      html += renderLabelBlock(label, contentLines);
      continue;
    }

    if (hasInlineBullets(line) || /^[\uF0B7\u2022●•▪\-–—]/.test(line)) {
      const bulletLines = [];
      while (
        i < lines.length &&
        (hasInlineBullets(lines[i]) || /^[\uF0B7\u2022●•▪\-–—]/.test(lines[i])) &&
        !isLabelLine(lines[i])
      ) {
        bulletLines.push(lines[i]);
        i++;
      }
      const items = expandToListItems(bulletLines);
      html += `<ul class="study-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
      continue;
    }

    const paragraphLines = [line];
    i++;
    while (
      i < lines.length &&
      !isLabelLine(lines[i]) &&
      !isQuoteLine(lines[i]) &&
      !isSubheadingLine(lines[i]) &&
      !hasInlineBullets(lines[i]) &&
      !/^[\uF0B7\u2022●•▪\-–—]/.test(lines[i]) &&
      !parseQaLine(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    if (paragraphLines.length > 1 && paragraphLines.every((part) => part.length < 140)) {
      html += `<ul class="study-list">${paragraphLines.map((part) => `<li>${escapeHtml(part)}</li>`).join("")}</ul>`;
    } else {
      html += `<p>${escapeHtml(paragraphLines.join(" "))}</p>`;
    }
  }

  return html;
}

function normalizePassageReading(data) {
  const raw = data?.passageReading;
  if (!raw || typeof raw !== "object") {
    return { reference: String(data?.passage || "").trim(), text: "" };
  }
  const reference = String(raw.reference || data?.passage || "").trim();
  const text = String(raw.text || "").trim();
  return { reference, text };
}

function formatPassageReadingHtml(text) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "";
  return lines
    .map((line) => {
      const match = line.match(/^(\d{1,3})\s+(.+)$/);
      if (match) {
        return `<p class="passage-reading__verse"><sup class="passage-reading__verse-num">${escapeHtml(match[1])}</sup> ${escapeHtml(match[2])}</p>`;
      }
      return `<p class="passage-reading__verse">${escapeHtml(line)}</p>`;
    })
    .join("");
}

function renderPassageReadingAccordion(passageReading) {
  const reading = normalizePassageReading({ passageReading, passage: passageReading?.reference });
  if (!reading.text) return "";
  const ref = reading.reference || "Scripture";
  const versesHtml = formatPassageReadingHtml(reading.text);
  return `<section class="article-section passage-reading-section" aria-label="Scripture reading">
    <details class="passage-reading">
      <summary class="passage-reading__summary">
        <span class="passage-reading__summary-main">
          <span class="passage-reading__title">Scripture Reading</span>
          <span class="passage-reading__ref">${escapeHtml(ref)}</span>
        </span>
        <span class="passage-reading__meta">NKJV · Tap to read</span>
      </summary>
      <div class="passage-reading__panel">
        <p class="passage-reading__label">New King James Version</p>
        <div class="passage-reading__text">${versesHtml}</div>
      </div>
    </details>
  </section>`;
}

module.exports = {
  cleanBibleStudySource,
  readStudySourceFile,
  splitSourceIntoSections,
  splitStructuredBody,
  renderBibleStudyBodyHtml,
  normalizePassageReading,
  renderPassageReadingAccordion,
};
