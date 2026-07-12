# Step 1 — Write the Bible study (paste into ChatGPT)

Use this prompt with your study notes, PDF text, or Word document. ChatGPT will return **plain structured text** (not JSON yet).

---

You are preparing a Back to the Bible cell fellowship study for River of Life Christian Church (ROLCC), Bangalore. Audience: cell group members and first-time visitors exploring Scripture. Tone: warm, clear, human, confident — not preachy or insider-heavy.

## Critical rule: do NOT over-summarise

This is a **Bible study**, not a blog summary. **Retain 80–90% of the original source material** — section headings, scripture quotes, teaching points, lists, tables, and discussion prompts. It is fine if the study is long and the read time is higher.

- Keep the author's structure wherever possible (numbered sections, sub-points, memory verses, icebreakers).
- Do **not** merge many sections into one short paragraph.
- Do **not** condense lists longer than 6 items — keep full lists.
- Remove only: emojis, PDF page numbers (`-- 1 of 5 --`), and exact duplicate headers.
- Shorten only when the source repeats the same sentence twice.

## Output format (use these exact section headings)

**TITLE**  
Include the passage, e.g. `Matthew 17:1-9 — The Mount of Transfiguration`

**SEARCH PREVIEW**  
1–2 sentences for Google and social link previews.

**PASSAGE**  
e.g. Matthew 17:1-9

**AUTHOR**  
ROLCC Fellowship Team

**OBSERVE**  
What happens in the passage — scenes, characters, facts, scripture quotes, and the source's section-by-section walkthrough. **Keep most of the source text here.** Use the source's sub-headings as plain lines if helpful.

**INTERPRET**  
What it means — teaching points, themes, cross-references, "Main Point", "Teaching", and "Significance" blocks from the source. **Keep the source's teaching content; do not replace it with a short summary.**

**APPLY**  
How it changes everyday life — practical lessons, application blocks, summary, and closing thought from the source.

**DISCUSSION QUESTIONS**  
Write **3–8** open-ended questions for cell fellowship from the source. Do **not** include answer keys here.

**ACTIVITIES** (optional)  
One short activity or closing prayer if the source includes one.

**QUIZ** (always required)  
Write **3–5** multiple-choice questions from the study content. For each:
- `Q:` question line
- `A:` `B:` `C:` `D:` options — mark correct with `(correct)`
- **Vary which option is correct** — do not put every correct answer as option A
- `Explanation:` one line

## Rules
- Always use exactly three study headings in JSON: Observe, Interpret, Apply — but each may contain multiple paragraphs and lists from the source
- Never publish answer keys as discussion questions — fixed answers go in QUIZ only
- Do not include date, hero image, featured, or published status

**Tags (for Step 2):** Choose 1–2 tags from `_allowedTags` in the import template. Always include `Bible Study` when appropriate.

---

**Study material to convert:**

[PASTE YOUR PDF TEXT, WORD DOCUMENT, OR STUDY NOTES HERE]

---

# Step 2 — Convert to JSON (second ChatGPT step)

After Step 1, open `admin/templates/back-to-bible-content-import.json` and paste **both**:
1. That JSON template (including `_instructions`)
2. The study text from Step 1

Then say:

> Convert the study below into valid JSON matching this template exactly. **Retain 80–90% of the source wording in sections[]** — Observe, Interpret, and Apply should be substantial, not short summaries. Map discussion questions to `discussionQuestions[]`. Always set `includeQuiz` to true with **3–5** quiz questions. For quiz: exactly 4 options per question, **vary `correctIndex`** (not always 0). Fill `tags` from `_allowedTags` only. Do not include date, hero image, featured, or published.
