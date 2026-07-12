# One-shot Bible study → JSON (Gemini or ChatGPT)

Use this when you want **one step** instead of `01-writing-prompt.md` + `02-import-template.json`.

Works best in **Gemini** with a PDF attached. In ChatGPT, paste extracted PDF text where noted.

---

## What to attach or paste

1. Your **Bible study PDF** (or pasted text from Word/PDF)
2. The full contents of **`prompts/bible-study/02-import-template.json`** (including `_instructions` and `_allowedTags`)

---

## Prompt (copy everything below the line)

---

You are preparing uploadable JSON for the River of Life Christian Church (ROLCC) website — a Back to the Bible cell fellowship study.

**Source:** The Bible study document attached / pasted below.

**Output:** Return **only valid JSON** matching the template I provided. No markdown fences, no commentary before or after the JSON.

### Content rules
- **Headings:** keep section headings largely as-is from the source
- **Body:** smartly recompose each `sections[].body` for readable web copy — merge broken PDF lines and quotes, remove `??` artifacts, combine parallel notes into short paragraphs, but keep scripture references and teaching essence
- Include `passageReading` with **5–7 verses in NKJV** (`reference` + `text`, one verse per line, numbered)
- `discussionQuestions`: 3–8 open-ended cell-group questions from the source
- `includeQuiz`: true with **3–5** questions; exactly 4 options each; **vary `correctIndex`** (not always 0)
- `tags`: 1–2 values from `_allowedTags` only; include `Bible Study` when appropriate
- `author`: `ROLCC Fellowship Team` unless the source specifies otherwise

### Do not include
- `date`, hero image, `featured`, or `published`

### Template JSON

[PASTE FULL CONTENTS OF prompts/bible-study/02-import-template.json HERE]

### Bible study source

[PASTE PDF TEXT HERE — or rely on attached PDF in Gemini]

---

## After you get JSON

1. Copy the JSON response
2. Open `/admin` → **Back to the Bible** → new article → **Import**
3. Set **date** and **hero image** manually → publish
