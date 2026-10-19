---
name: study-html-publish
description: 将课堂照片、阅读题或讲义整理为可复习的中外文对照 HTML，并默认发布至 Zoe 的 GitHub 学习资料库及更新首页目录。
---

# Study HTML & GitHub Publishing

Use this workflow for Zoe's study material tasks in `starseaship/all_learn_html`. The default action when the user requests a new study HTML or updates a study HTML is **create/edit, then publish to GitHub**, unless the user explicitly asks to keep it local, use another repository, or not publish.

## 1. Source and accuracy
- Use the provided images, PDFs, handouts, and existing context as primary sources. Preserve all question and answer numbering, exact names, figures, and chapter numbers.
- Fill missing/incomplete answers using the answer key or earlier provided material when available. If uncertainty affects correctness, flag it instead of inventing source content. Do not silently present a newly composed answer as a verbatim quotation.
- Maintain the user's intended study level; translate the actual question and **each answer**, separately. Don't omit non-focus questions.

## 2. HTML layout
- Produce a standalone, mobile-friendly UTF-8 HTML matching the existing bilingual reading pages.
- Show one card per question with English (or Japanese as appropriate), followed immediately by **small gray Chinese translations** for the question and its answer.
- Highlight **question keywords** in soft yellow and **answer keywords** in light green; use an additional restrained color, such as pink, for a few essential memorization anchors when helpful. Highlight short meaningful phrases rather than entire paragraphs.
- Make exactly the question numbers the user specifies as priorities visually prominent (purple accent/border). Priority numbers change by assignment; never carry old numbers into a new chapter by default.
- Add working toggles for “只看重点题” and “隐藏/显示中文翻译,” plus quick-jump links to focus questions, when appropriate. Check interaction, readability and responsive behavior.
- Put requested notices inside the document near its heading. Homepage cards do not use description text.
- Prefer concise numbered chapter titles: “阅读2.10｜First People of the New World”. Use the user-specified chapter number, not guessed numbering.
- Add head metadata (`description`, `subject`, `type`, `course`, `date`; `lesson-number` where appropriate).

## 3. Publish and register (default)
1. Use the connected GitHub tools and target `starseaship/all_learn_html` on its default branch. Place new English reading HTML under the current semester, e.g. `26aut/ENGLISH/<descriptive_ascii_name>.html`; adapt the directory for the course and semester. Never overwrite an unrelated file.
2. Register the item in `materials.json` with its correct `path`, concise `title`, empty `description`, `subject`, `type`, `course`, `date`, unit-only `badges`, and stable `addedOrder` = the next unused order. Maintain the newest-added-first behavior.
3. Add/adjust the corresponding entry in `catalog-overrides.json` so a future `python3 scripts/build_catalog.py` rebuild preserves the short title and unit/chapter badges.
4. Preserve the repository's existing subject/course display conventions and home UI. Never reset the order of existing items just because a page was edited.
5. Verify the new HTML exists on GitHub, the catalog points to it, and the metadata/priority questions are correct. GitHub Pages can lag a few minutes; don't claim live publication is confirmed without verifying it.
6. Return the live GitHub Pages URL when available and optionally a verified sandbox download. Report actual failures and stop short of claiming success.

## 4. Naming and presentation conventions
- Home page subjects: “英语”, “日语”; courses “日语”, “语法”, “阅读” according to the established site conventions.
- Homepage cards use short titles, no description text, and badges only for unit/chapter identifiers (for example `Unit 14`, `2.10`, `第4回`). Do not show subject/type/course as repeated visual tags on cards; those fields remain available for filtering.
- For reading materials, choose type `reference` unless the user explicitly requests another category. “期末复习” is a useful badge when applicable.
- Distinguish **newly added** from **last updated**; do not replace newest-added-first ordering with sorting by edit date.

## 5. Scope and limitations
- This repository-hosted `SKILL.md` is a reusable instruction document, not by itself an installed ChatGPT skill. When working from this repository, read this file or direct relevant agents to it.
- The user may override any format, content, or publishing preference in a particular request. Do not turn specific exam dates or focus question numbers into permanent defaults.
