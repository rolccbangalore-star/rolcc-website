# Step 1 — Write the Bible study (paste into ChatGPT)

Use this prompt with your study notes, PDF text, or Word document. ChatGPT will return **plain structured text** (not JSON yet).

---

You are writing a Back to the Bible cell fellowship study for River of Life Christian Church (ROLCC), Bangalore. Audience: cell group members and first-time visitors exploring Scripture. Tone: warm, clear, human, confident — not preachy or insider-heavy.

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
What happens in the passage — scenes, characters, facts. Write 2–4 short paragraphs. Include key scripture references inline.

**INTERPRET**  
What it means — teaching points, themes, cross-references. Write 2–4 short paragraphs. Pull from "Main Point", "Teaching", or "Significance" blocks in the source.

**APPLY**  
How it changes everyday life — practical lessons and one clear closing thought. Write 1–3 short paragraphs.

**DISCUSSION QUESTIONS**  
Write **3–5** open-ended questions for cell fellowship. Use icebreaker or group questions from the source when present. Do **not** include answer keys here.

**ACTIVITIES** (optional)  
One short activity or closing prayer if the source includes one. Format: `Title: …` then body text.

**QUIZ** (always required)  
Write **3–5** multiple-choice questions based on the study content (passage, sections, and themes). Use existing review Q&A from the source when present; otherwise create questions from what you wrote in Observe, Interpret, and Apply. For each:
- `Q:` question line
- `A:` `B:` `C:` `D:` options — mark correct with `(correct)`
- `Explanation:` one line

Never skip the quiz. Wrong options must be plausible but clearly incorrect based on the study — not silly or random.

## Rules
- Always use exactly three study headings: Observe, Interpret, Apply
- Never publish answer keys as discussion questions — fixed answers go in QUIZ only
- Strip emojis, PDF page numbers, and repeated headers from the source
- Keep paragraphs short for mobile readers
- Condense lists longer than 6 items
- Do not include date, hero image, featured, or published status

**Tags (for Step 2):** You do not pick tags in Step 1. In Step 2, choose 1–2 tags from `_allowedTags` in the import template. Always include `Bible Study` when appropriate.

---

**Study material to convert:**

[PASTE YOUR PDF TEXT, WORD DOCUMENT, OR STUDY NOTES HERE]

---

# Step 2 — Convert to JSON (second ChatGPT step)

After Step 1, open `admin/templates/back-to-bible-content-import.json` in this repo and paste **both**:
1. That JSON template (including `_instructions`)
2. The study text from Step 1

Then say:

> Convert the study below into valid JSON matching this template exactly. Map Observe, Interpret, and Apply into `sections[]` with those headings. Put discussion questions in `discussionQuestions[]`. Always set `includeQuiz` to true and include **3–5** quiz questions from the study content. For quiz: exactly 4 options per question, one correct, `correctIndex` is 0-based. **Read the full study and fill the `tags` array with 1–2 best-matching tags from `_allowedTags` only** (see `_tagInstructions`). Do not include date, hero image, featured, or published.
