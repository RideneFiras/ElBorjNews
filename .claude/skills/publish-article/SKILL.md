---
name: publish-article
description: Publish an article to the El Borj newspaper website from a text (pasted, or a posts/<n>/ folder with post.txt + pictures). Keeps the author's text exactly as written, word for word, and only adds structure (paragraphs, headings, tables, images) and the missing metadata (section, genre, tags, cover, alt text). Use when Firas asks to publish, post, upload or put an article/text/news on the site.
---

# Publish an article on El Borj

You turn a text the owner gives you into an article on the live site, **without changing a
single word of it** except obvious typing slips (see "Typo fixes" below). You decide the *format* (paragraphs, headings, lists, tables, where images go)
and fill the *metadata* the text doesn't give (section, genre, tags, cover, alt text). The
content itself is the journalist's and is never rewritten.

Tool: `scripts/publish-article.ts` (`pnpm -s publish:article …`). It stores the article exactly
like the admin editor does (same editor JSON, same HTML renderer and sanitizer, same WebP image
sizes), so the result can be edited in the admin afterwards.

## The non-negotiable rule: the text stays as written

- Copy every word **exactly**: same wording, same digits (don't convert ٣ ↔ 3), same Latin words
  and odd spellings (e.g. `Avant _Gout` stays `Avant _Gout`), same quotes and dashes, except the
  typo fixes allowed below.
- **Never** rephrase, shorten, translate, summarise, reorder or add sentences inside the body or
  the title. If you notice a probable error of *fact* (a wrong year, a wrong name, a date that
  doesn't match its weekday), **point it out to Firas and ask**; change it only if he says so.

### Typo fixes (allowed since 2026-10-03, only when you are very sure)

Firas allowed fixing minor typing mistakes **when you are very sure** they are slips, not choices:
- spacing around punctuation: `كلمة ،` → `كلمة،`, `2023.وتولى` → `2023. وتولى`, `" نادي"` → `"نادي"`;
  missing space between a number and a word (`11أوت` → `11 أوت`);
- a letter clearly dropped or doubled (`عل الألوان` → `على الألوان`);
- standard hamza spelling: `الى` → `إلى`, hamzat wasl written as qat' (`الإحتفال` → `الاحتفال`,
  `الإنضمام` → `الانضمام`), especially when the text itself spells the word correctly elsewhere;
- a stray character from copy-paste (a lone `-` at a line start), an unclosed bracket whose end
  is obvious.

Never "fix": dialect or spoken forms (`اللي`, `ياهوى`, `راجعين`), names of people/places/events,
style, word choice, grammar you'd merely write differently, missing final full stops, numbers or
dates (those are *facts*: ask). If in doubt, leave it and mention it to Firas.

Every fix goes in the spec's `corrections` list (`{ "from": exact text in source.txt, "to": fixed
text, "why": "…" }`); the body then contains the fixed text. `fidelity` applies the corrections to
the source before comparing, fails if a `from` isn't found, and lists every fix. Show the list to
Firas in the summary (step 7): he approves the fixes together with the rest.
- You may only change *layout*: join lines that are clearly one sentence broken by copy-paste
  (e.g. a line break around a Latin word), split paragraphs where the source has blank lines,
  keep meaningful line breaks inside a paragraph (`\n` in a string becomes a line break), make a
  line a heading when the source clearly uses it as one, bold a label that is clearly a label
  (a date line in a programme), turn clearly tabular data into a table **with the same cells in
  the same order**, place pictures. Collapsing repeated spaces and trimming line ends is fine.
- Every visible field you write yourself (subtitle/dek, kicker, captions, calendar titles) goes
  in `generated` (calendar titles are in `events`) and is listed for Firas in the summary (he
  can change it after it goes live). Alt text is written by you (it describes the picture for blind readers and isn't shown
  on the page). **Captions** (since 2026-10-03): you may write a short factual caption from the
  text (who/what/where, e.g. «جود حمام يتسلّم شهادته بألمانيا») and list `"captions"` in
  `generated`. **Photo credits** only from Firas or the source (never guess a photographer).
- The `fidelity` command proves it: it must say **"word for word"** (after the listed typo fixes,
  if any) before you publish.

## Input formats

0. **A Word file** (`.docx`) in the folder (since 2026-10-19): when there is one, **it is the
   text** (it beats `post`/`post.txt`, which may then be missing or just hold the section).
   Read it with `python3 -I scripts/docx-to-text.py posts/<n>/<file>.docx --marks` (shows bold
   runs as `**…**` and Word heading styles), and write the plain version to `source.txt`:
   `python3 -I scripts/docx-to-text.py posts/<n>/<file>.docx > posts/<n>/source.txt`.
   Paragraphs = Word paragraphs. Keep bold that exists in the docx (as bold runs); a bold first
   paragraph(s) before the body is usually the title (often split over 2 lines: join them).
   The section is then given by Firas in the chat («it's علوم») or in `post`. If he names a
   section that doesn't exist, ask: create it, or use the closest existing one.
1. **A folder** `posts/<n>/` (git-ignored) with `post.txt` and pictures. Convention used so far:
   - line 1: the section (e.g. `ثقافة`),
   - next line(s) until the first blank line: the title (it can span 2 lines; join them with a space),
     a lone genre word on line 2 (`بورتريه`, `حوار`, `خبر`…) is the genre (`format`), not the title;
     leave it out of `source.txt` too,
   - the last line may be a signature («إعداد مراد ريدان»), or the first line a byline
     («كتبت لمياء قربوج», then the section on the next line): see Byline below,
   - then the body.
   Anything missing (genre, tags, subtitle, cover choice…) you fill in.
2. **Text pasted in the chat** plus picture paths (drag a file into the terminal to get its
   path). Pictures pasted directly into the chat have no file path: ask for the file or a folder.
3. Picture URLs: download them first into the post folder (`curl -L -o posts/<n>/img1.jpg <url>`).

If there is no title, ask for one. Don't invent it.

## Steps

1. **Read everything**: `post.txt` (also with `cat -A` to see the real line breaks) and look at
   every picture (Read tool) to understand them.
2. **Live options**: `pnpm -s publish:article options` lists sections (with sub-sections),
   genres, tags and authors from the database. Use only these slugs.
3. **Decide the metadata**:
   - `category`: the section the text names (map the Arabic/French name to its slug). If it names
     a parent and a sub-section clearly fits (e.g. ثقافة + a theatre story → `culture` + extra
     `theatre`), keep the named one as `category` and add the sub-section in `extra_categories`.
     If no section is given, choose the best one.
   - `format` (genre): خبر `news` for announcements and short news, تقرير `report`, حوار
     `interview`, رأي `opinion`, نتائج `results` for scores… pick from the list.
   - `tags`: existing place/club/event tags clearly mentioned (e.g. `nabeul`). Propose new tags
     (`new_tags`) only for clearly important names, and only with Firas's OK.
   - Byline (since 2026-10-14): **if the text ends with a signature line** («إعداد مراد ريدان»,
     «بقلم …») **or starts with one** («كتبت …», «كتب …»), that person is the author. Put the
     exact line in `"signature"` (it is left out of the body; `fidelity` strips it from the start
     or end of the source) and set the byline:
     - an existing profile (see AUTHORS in `options`) whose name matches → `"authors": ["<slug>"]`;
     - none → `"byline_override": "<the name only>"` (the page prints «بقلم <name>»), and tell
       Firas no profile exists yet: he can create one in the admin (Utilisateurs → inviter) so the
       article gets an author box and page, then you switch the spec to `authors` and run `update`.
     **No signature line → `"unsigned": true`** (no «بقلم» line, no author box), unless Firas
     asks for a signature (`authors`, or `byline_override` e.g. «مراسلنا بنابل»).
     Copy the name as written in the text (don't "correct" its spelling).
   - `location` (dateline, printed as «قليبية — » before the first paragraph): only if the text
     *starts* with one ("X — …"); then remove it from the first paragraph and set `location`.
     Otherwise leave it empty (the site would print words that aren't in the text).
   - `language`: `ar` or `fr`, by the language of most of the text.
   - `cover`: the most representative picture (main event poster, main photo). Other pictures go
     in the body next to the passage they illustrate (`image`), or together as a `gallery`.
   - `subtitle` (the summary sent with a shared link and shown on the homepage lead; not printed on the article page): if the source has none, write one short factual
     line using only facts from the text, list `"subtitle"` in `generated`, and get approval.
     Firas can also say "no subtitle".
   - `excerpt`, SEO description, slug, reading time: leave empty, the database derives them
     from the text.
   - `events` (calendar, الأجندة; since 2026-10-03): when the text **announces** something on a
     date (a festival night, a show, a protest, a match, a deadline, a club restarting), add one
     entry per dated item, linked to the article automatically:
     `{ "title_ar", "starts_on": "YYYY-MM-DD", "ends_on"?, "start_time"?: "HH:MM", "end_time"?, "place"?, "town"?: place-tag slug }`.
     Dates, times and places come **only from the text or the poster**; the short title is
     yours (a few words: «عرض مسرحي "X" بدار الثقافة نابل»). A programme with several dates →
     one entry per date/item. A multi-day festival → `starts_on` + `ends_on`. Use `town` only
     with an existing place tag. No entries for things already over (a report on last week's
     event), and none for vague dates («قريبا»). A date without a year → the next occurrence;
     say so in the summary. If unsure, leave it out and mention it. Draft articles' entries stay
     hidden until the article is published. For an article saved earlier: add `events` to its
     spec and run `pnpm -s publish:article events posts/<n>/spec.json`. Firas can add/edit any
     entry himself in the admin (الأجندة), including the public holidays.
   - `status`: **`published` in the spec** (Firas, 2026-10-19: "always directly publish, don't
     draft unless I ask"). Use `draft` only when he asks for a draft, `scheduled` (+
     `scheduled_for`) when he gives a time. `is_breaking`/`is_featured` only if asked.
4. **Write the spec** to `posts/<n>/spec.json` (or the scratchpad for pasted text), see the
   format below. Write the original text, without the section line, to `posts/<n>/source.txt`
   (byte-for-byte copy of the rest of `post.txt`, e.g. `tail -n +2 post.txt > source.txt`).
5. **Check**: `pnpm -s publish:article check posts/<n>/spec.json` (validates slugs and images,
   renders the HTML to a preview file, writes nothing).
6. **Fidelity**: `pnpm -s publish:article fidelity posts/<n>/spec.json posts/<n>/source.txt`.
   It must end with "✓ … word for word". If it lists missing or added words, fix the spec (never
   the source) and run it again.
7. **Publish it directly, without asking** (once check and fidelity pass): `pnpm -s
   publish:article publish posts/<n>/spec.json` (status `published` in the spec). It uploads the
   pictures (WebP 480/960/1600 + original ≤ 2400 px, EXIF removed), inserts the article and its
   links, writes `posts/<n>/article.json` (so the same post can never be inserted twice),
   refreshes the site's cached pages (`PROD_REVALIDATE_SECRET` in `.env.local`; without it, up
   to 5 minutes) and prints the admin link and the short public link `/{lang}/article/{id}`.
   Check the public link answers 200 (`curl -s -o /dev/null -w "%{http_code}" <link>`).
   If Firas asked for a draft: status `draft`, and later `pnpm -s publish:article status
   posts/<n>/spec.json published` (or `scheduled 2026-10-05T08:00`, Tunis time).
8. **Always write the Facebook post** to `posts/<n>/facebook.txt` and show it in the reply.
   Every article is shared on the El Borj Facebook page. Length (Firas, 2026-10-19, after a
   too-short and a too-long try): **one sentence of about 15–20 words** with the core fact
   (who/what, where; when if it's an announcement), so the post makes sense on its own but
   doesn't tell the story; then a short hook line ending in «👇» («التفاصيل والصور 👇»,
   «البرنامج كاملا 👇»…); then the public link on its own line. Facts only from the article;
   no hashtags, no names of every participant, no commentary. Example (article 88):
   «بدار الثقافة منزل تميم، ناشئة نادي الإبداع الرقمي ينجحون في تحلية مياه البحر بالطاقة
   الشمسية والفخار.» / «التفاصيل والصور 👇» / link.
   Too short (rejected): «جرّة فخار وأشعة الشمس لتحلية مياه البحر؟ ناشئة … جرّبوها 👇».
   Too long (rejected): a first line with the full project title, the club and the supervisor,
   plus a second line of commentary.
   Then **show Firas a summary**: public + admin links, title, subtitle (marked "written by
   Claude"), section(s), genre, tags, byline, cover + where each picture goes, the layout
   choices (joined lines, headings, bold, tables), the calendar entries, the typo fixes
   (`corrections`, from → to), any other probable error you noticed and left unchanged, and the
   fidelity result. Everything Claude wrote is already live, so say he can change it in the
   admin or ask you to (`update`). **Ask where the pictures come from** (a club's Facebook page,
   the organiser, our own photo…) so a credit can be added (`credit`, e.g. «صورة: جمعية …» or
   «المصدر: فيسبوك»): readers trust a paper that credits its pictures.
9. If the text, metadata or pictures must change after saving (Firas asks for it): edit the
   spec, run `check` and `fidelity` again, then `pnpm -s publish:article update posts/<n>/spec.json`.
   It rewrites the saved article (text, metadata, tags, sections, pictures re-uploaded) and keeps
   its status and calendar entries. Firas can also edit in the admin (link printed). Never run
   `publish` again for a saved post (it refuses when `article.json` exists).
   Text taken from someone else's page ends with «نقلا عن صفحة …» linked to the source (a
   correction listed in `corrections`), not with their bare name as if they wrote it for us.

## Spec format (`spec.json`)

```json
{
  "language": "ar",
  "status": "published",
  "title": "…exactly as written…",
  "subtitle": "…",
  "generated": ["subtitle", "captions"],
  "events": [{ "title_ar": "افتتاح مهرجان بعيونهن", "starts_on": "2026-10-03", "start_time": "18:30", "place": "فضاء الحمامات فن وثقافة", "town": "hammamet" }],
  "corrections": [{ "from": "2023.وتولى", "to": "2023. وتولى", "why": "space after full stop" }],
  "category": "culture",
  "extra_categories": ["theatre"],
  "format": "news",
  "tags": ["nabeul"],
  "new_tags": [],
  "unsigned": true,
  "authors": [],
  "location": null,
  "cover": { "file": "posts/1/poster.jpeg", "alt": "…", "caption": "", "credit": "" },
  "body": [
    { "type": "paragraph", "text": "…" },
    { "type": "paragraph", "text": [{ "text": "label", "bold": true }, { "text": "\nline 2\nline 3" }] },
    { "type": "heading", "text": "…", "level": 2 },
    { "type": "quote", "paragraphs": ["…"] },
    { "type": "pullquote", "text": "…" },
    { "type": "list", "ordered": false, "items": ["…", "…"] },
    { "type": "table", "header": true, "rows": [["…", "…"], ["…", "…"]] },
    { "type": "image", "file": "posts/1/photo.jpeg", "alt": "…", "caption": "", "credit": "" },
    { "type": "gallery", "images": [{ "file": "…", "alt": "…" }, { "file": "…", "alt": "…" }] },
    { "type": "embed", "url": "https://www.youtube.com/watch?v=…" },
    { "type": "hr" },
    { "type": "read_also", "href": "/ar/article/12", "title": "…" }
  ]
}
```

Inline text is a string, or a list of runs `{ "text", "bold"?, "italic"?, "link"? }` for bold,
italic and links that exist in the source. `\n` inside a string = line break in the same paragraph.
Embeds: YouTube, Facebook, Instagram, X only.

## Never

- Change or add words in the title or body, beyond the typo fixes listed in `corrections`
  (fidelity must pass).
- Publish when check or fidelity fails, or when Firas asked for a draft. (Asking for an article
  with this skill counts as his "publish", since 2026-10-19.)
- Use demo authors (`demo-*`) or demo tags for real articles.
- Write statistics tables, or touch other articles.
