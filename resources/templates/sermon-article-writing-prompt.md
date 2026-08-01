# Step 1 — Write the article (paste into ChatGPT)

Use this prompt with your sermon notes, transcript, or outline. ChatGPT will return **plain structured text** (not JSON yet).

---

You are writing a Sermon Summary blog article for River of Life Christian Church (ROLCC), Bangalore. Audience: first-time visitors and everyday believers. Tone: warm, clear, human, confident — not preachy or insider-heavy.

## Output format (use these exact section headings)

**TITLE**  
One clear, visitor-friendly title.

**SUMMARY**  
2–3 sentences for the top of the article page.

**SEARCH PREVIEW**  
1–2 sentences for Google and social link previews.

**AUTHOR**  
ROLCC Pastoral Team

**MAIN SCRIPTURE**  
e.g. John 8:12 (use a placeholder like `[Review: add scripture]` only if truly unknown)

**SERMON SERIES**  
e.g. Everyday Faith (or `[Review: series name]` if unknown)

**ARTICLE CONTENT**  
Write the body using short sections. For each section use:
- `## Heading` for section titles (level 2)
- Normal paragraphs under headings
- `> Quote text` with attribution on the next line as `— Reference` when quoting Scripture or the message
- Optional bullet lists with `- item` lines when helpful

Do **not** include image, video, or FAQ blocks unless you have real content.

**KEY TAKEAWAYS**  
Write **exactly 3** short one-line takeaways. Every takeaway must be a complete sentence. Never leave this section empty. If the sermon is thin on application, infer sensible, faithful takeaways from the message.

**QUIZ**  
Write **3–4** multiple-choice questions based only on the article you wrote.

For **each question**:
- Write the question on its own line starting with `Q:`
- Provide **exactly 4 options** labelled `A:` `B:` `C:` `D:`
- Mark the **one correct answer** with `(correct)` after that option
- The other **3 options must be plausible but wrong** — based on the sermon theme, not silly or random
- Add a one-line `Explanation:` after the options

Example:
```
Q: What does Jesus call Himself in John 8:12?
A: The light of the world (correct)
B: The bread of life
C: The good shepherd
D: The door of the sheep
Explanation: John 8:12 — Jesus says, "I am the light of the world."
```

## Rules
- Never leave a section empty — use `[Review: …]` placeholders only when information is genuinely missing
- Do not include date, hero image, featured, or published status
- Avoid church jargon unless you explain it simply
- Keep paragraphs short for mobile readers

**Tags (for Step 2):** You do not pick tags in Step 1. In Step 2, ChatGPT will read your article and choose 1–2 tags from the church tag list based on what the content is actually about.

---

**Sermon material to convert:**

[PASTE YOUR SERMON NOTES, TRANSCRIPT, OR OUTLINE HERE]

---

# Step 2 — Convert to JSON (second ChatGPT step)

After Step 1, open `admin/templates/blog-content-import.json` in this repo and paste **both**:
1. That JSON template (including `_instructions`)
2. The article text from Step 1

Then say:

> Convert the article below into valid JSON matching this template exactly. Keep all keys. For quiz: exactly 4 options per question, one correct, `correctIndex` is 0-based. Include 3 key takeaways. **Read the full article and fill the `tags` array with the 1–2 best-matching tags from `_allowedTags` only** — pick based on the content's main themes and application areas, using exact spelling (see `_tagInstructions`). Omit image, video, and FAQ blocks unless present in the article. Do not include date, hero image, featured, or published.
