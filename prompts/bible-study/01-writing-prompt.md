# Step 1 — Write the Bible study (paste into ChatGPT)

Use this prompt with your study notes, PDF text, or Word document. ChatGPT will return **plain structured text** (not JSON yet).

---

You are preparing a Back to the Bible cell fellowship study for River of Life Christian Church (ROLCC), Bangalore. Audience: cell group members and first-time visitors exploring Scripture. Tone: warm, clear, human, confident — not preachy or insider-heavy.

## Output delivery (critical — read first)

Return **one single continuous Markdown document** that the user can copy or download as **one `.md` file**.

- Put the **entire** study (all sections below) in **one** Markdown code block, or as one unbroken message
- **Do not** create multiple files, canvases, artifacts, zips, or separate downloads
- **Do not** split TITLE / SECTIONS / QUIZ / DISCUSSION into different documents
- **Do not** invent filenames like `title.md`, `section-1.md`, or `quiz.md`
- If the platform offers “create a file,” create **exactly one** file that contains everything

## Headings vs body (important)

| Part | Rule |
|------|------|
| **Section headings** | Keep **largely as-is** from the source — same titles, numbering, and scene labels |
| **Section body** | **Smartly recompose** for reading on the web — fix PDF mess, merge fragments, keep the essence |

## Smart cleanup for body copy

PDF and Word imports often produce broken formatting. **Fix these intelligently:**

- Emoji bullets that became `??` — remove; use plain text or real bullets
- Scripture quotes split mid-sentence across lines (`man…` / `And I was afraid…` / `yours.'"`) — **merge into one complete quote**
- One thought split across many short lines — merge into **1–2 readable sentences or a short paragraph**
- Parallel notes (`The servant acted out of fear` / `The servant blamed the master`) — merge: *"The servant acted out of fear, blamed the master, and wasted his opportunity."*
- Orphan word fragments on their own line — join to the previous or next sentence
- Duplicate headers and page numbers (`-- 1 of 5 --`) — remove

**Do not lose the teaching.** Keep scripture references, key points, lists, memory verses, icebreakers, and application. You may add a few connecting words for clarity.

**Do not** flatten the whole study into one generic Observe / Interpret / Apply workflow unless the source uses only those headings.

## Output format (use these exact section headings)

**TITLE**  
Include the passage, e.g. `Matthew 17:1-9 — The Mount of Transfiguration`

**SEARCH PREVIEW**  
1–2 sentences for Google and social link previews.

**PASSAGE**  
e.g. Matthew 17:1-9

**SCRIPTURE READING (NKJV)**  
5–7 verses from the passage above — the core text visitors read before the study. One verse per line, each line starting with its verse number. Use NKJV wording.

**AUTHOR**  
ROLCC Fellowship Team

**SECTIONS**  
Use the **source document's own section headings** — numbered scenes, passage blocks, teaching titles, memory verses, icebreakers, summaries, and conclusions.

Each section becomes one entry in `sections[]`:
- `heading`: the source section title, kept largely unchanged (e.g. `SERVANT 3: ONE TALENT`, `1. MOUNT ARARAT`)
- `body`: recomposed for readability — full quotes intact, teaching points clear, short paragraphs where helpful

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
- Preserve the source's section structure — one section per source heading
- Deliver the full study as **one single Markdown document** — never multiple files
- Never leave citation leftovers like `[cite: 4]` or `[cite: 3]` in any text — strip them entirely
- Never publish answer keys as discussion questions — fixed answers go in QUIZ only
- Do not include date, hero image, featured, or published status

**Tags (for Step 2):** Choose 1–2 tags from `_allowedTags` in the import template. Always include `Bible Study` when appropriate.

---

**Study material to convert:**

[PASTE YOUR PDF TEXT, WORD DOCUMENT, OR STUDY NOTES HERE]

---

# Step 2 — Convert to JSON (second ChatGPT step)

After Step 1, open `prompts/bible-study/02-import-template.json` and paste **both**:
1. That JSON template (including `_instructions`)
2. The study text from Step 1

Then say:

> Convert the study below into valid JSON matching this template exactly. **Keep section headings largely as-is from the source.** **Recompose each section `body` for readable web copy** — merge broken PDF lines and quotes, fix `??` artifacts, combine parallel bullet-thoughts into short paragraphs, but keep all scripture references and teaching essence. Map discussion questions to `discussionQuestions[]`. Always set `includeQuiz` to true with **3–5** quiz questions. For quiz: exactly 4 options per question, **vary `correctIndex`** (not always 0). Fill `tags` from `_allowedTags` only. Do not include date, hero image, featured, or published.
