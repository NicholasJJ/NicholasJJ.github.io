# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal academic website for Nicholas Jennings, hosted on GitHub Pages. The site showcases research publications, projects, and professional information. It's a static site built with vanilla HTML, CSS, and JavaScript. The pages are hand-written with no client-side dependencies; the blog adds a Jekyll build step that GitHub Pages runs automatically on push.

## Architecture

### Single-Page App

The site is effectively a **single-page app driven entirely by `index.html`**. Home, research, projects and blog teasers are all sections of that one page, navigated by scrolling. Full blog posts are separate Jekyll-generated pages (see The Blog):

- `index.html` - The entire site: a self-contained single-page app with an inline `<style>` block and an inline `<script>` (the fractal-scroll engine). All content is here.
- `research.html` / `projects.html` - **Redirect stubs only**. Each is a meta-refresh + `location.replace()` to `index.html#research` / `index.html#projects`. They exist so old/bookmarked URLs and the section nav still resolve. They contain no real content — do not add content to them.
- `styles.css` - Shared/legacy stylesheet (header, faces, flowers, color palette, and the old `.project` / `.pproject-card` layouts). `index.html` overrides much of this inline. The standalone `.project`/`.pproject` styles are largely vestigial now that content lives in the `CONTENT` array.
- `script.js` - The face switcher (see Interactive Elements).

### The Fractal-Scroll Engine (`index.html` inline script)

The home page renders all content as a series of cards that the user spirals through via a self-similar fractal animation. Key concepts:

- **`CONTENT` array**: A single array of card objects near the top of the inline `<script>`. **This is where all site content lives** — bio, research entries, project entries, and the publication list. Each object has a `section` (`'home'` | `'research'` | `'projects'`) plus fields like `eyebrow`, `title`, `image`, `body`, `links`, and (for the publication list) `citations`. Cards are rendered in array order; `SECTIONS` is derived from the first index of each section.
- **Two layouts**, chosen by `shouldUseSimpleLayout()` (mobile width OR the user's "Fractal mode" toggle being off), toggled via the `simple-layout` class on `<body>`:
  - **Fractal mode** (desktop default): Cards live in a fixed `.card-layer`. The page body holds a tall, empty `.scroll-track` (height ≈ `(CONTENT.length + 1) * viewportHeight`). Window scroll position maps to a continuous step value `t = scrollY / stepHeight`; the script animates a zoom/rotate "spiral" between cards on a `<canvas>` fractal background and recolors the background per section. All cards are present from the start (nested into the fractal at decreasing scale); a card only fades **out** once you scroll past it (`cardOpacity` / `getNestedAnchor` in the inline script).
  - **Simple mode** (mobile / toggle off): Cards become a normal vertically-stacked (or 2-col grid) document flow with visible `.section-header`s and native scrolling. No canvas, no spiral.
- **Spiral geometry** (the tricky part): The fractal is a plus/H-tree. Each step zooms `STEP_ZOOM` (= `4/RATIO`) into the top/bottom branch of one of the *side* vertical bisectors (`getChildAnchor` → `(±SIDE_OFFSET, ±CHILD_OFFSET)`), cycling through four targets to spread cards out. `getStepTransform` lerps the focus point **straight** from the current card to the next and derives the translation from it (so the camera dollies directly between cards instead of swinging wide); rotation and zoom interpolate smoothly, and the `progress` 0/1 endpoints are exact self-similar matches so steps chain seamlessly. `getNestedAnchor` composes these per-step transforms to place every upcoming card. These functions are heavily commented — read them before touching the math.
- **Scroll snapping & box locking** (fractal mode): `.fractal-card`s are `overflow: hidden` so the wheel always drives the page, never an inner scrollbar — *except* the box you've settled on, which gets the `.is-active` class (`overflow-y: auto`) so long cards stay readable and chain back out to the page at their ends. When scrolling stops, `scheduleSnap()`/`snapToNearest()` smooth-scroll the page to the nearest step so a card always comes to rest centered and upright. (Native CSS scroll-snap was tried and removed — unreliable because the scrolled element is the empty track while cards are `position: fixed`.)
- **Progress dots** (`.progress-dots`): A clickable mini table-of-contents on the right (desktop only), generated from `CONTENT`, that jumps to a card via `scrollToStep()`.
- **Section nav**: The header nav links (`data-section`) scroll to the first card of each section and update the `.current` highlight as `t` crosses section boundaries. `#research` / `#projects` hashes are honored on load.
  **Blog is deliberately not in the nav** — it should be something you come across by scrolling, not a headline destination. It still has a progress-dots entry, still lives at the end of the spiral, and `/#blog` still deep-links to it via `handleInitialHash()`. Nothing is highlighted in the nav while you are in the blog section, which is expected.
- **Fractal mode toggle**: A header checkbox (`#fractalModeToggle`) lets the user switch between fractal and simple layouts; the preference is persisted in `localStorage` under `fractalMode`.

### The Blog (Jekyll)

The blog is a **Jekyll** site layered onto the existing static files. GitHub Pages
runs Jekyll server-side, so pushing markdown is all that's needed — nothing
generated is committed (`_site/` is gitignored).

- **Posts** live in `_posts/YYYY-MM-DD-slug.md`. Front matter:
  ```yaml
  ---
  title: "Post title"
  date: 2026-08-24
  categories: [graphics, shaders]   # the topic hierarchy
  image: /images/teaser.png         # optional, used as teaser + hero
  excerpt: "Optional override; otherwise the first paragraph."
  ---
  ```
- **Topic hierarchy = `categories`**, which also builds the URL via
  `permalink: /blog/:categories/:title/` in `_config.yml`. So
  `categories: [graphics, shaders]` publishes to
  `/blog/graphics/shaders/post-title/` — that's the permalink for direct links.
- **Reading time** is automatic: `_includes/reading-time.html` divides the
  stripped word count by `site.reading_speed` (200 wpm), ceiling-rounded.
- **Layouts**: `_layouts/base.html` (shell + header) and `_layouts/post.html`
  (breadcrumb, meta, hero, body, prev/next). `blog/index.html` is the topic
  browser. All blog presentation lives in `assets/blog.css` — markdown stays
  pure content, so the fractal can be abandoned without touching any post.
- **Clearing the fixed header**: the site header is `position: fixed` with a
  wrapping nav, so its height changes with width (measured: 160px wide, 229px
  once the nav wraps, 272px below ~368px). `styles.css`'s single
  `padding-top: 80px` is not enough, and the wavy clip-path edge overlaps the
  content. `assets/header-offset.js` measures the header and publishes
  `--header-offset`; `assets/blog.css` applies
  `padding-top: max(var(--header-offset, 0px), <floor>)` per breakpoint. The
  `max()` matters: the measurement can only ever *raise* the padding, so a stale
  or missing value can never pull content back under the header. Scoped to
  `body#blog`, so the fractal page is untouched.
- **Popup footnotes**: posts use ordinary markdown `[^name]` footnotes. kramdown
  emits a normal endnote list; `assets/footnotes.js` lifts each note into a
  popup anchored at its reference and hides the bottom list (only *after* it
  successfully lifts them, so no-JS readers still get working footnotes).

### Blog ↔ fractal contract

`blog/posts.json` is a Liquid template that renders a manifest of every post
(title, url, topicPath, excerpt, image, readingTime). **This is the only
coupling between the writing and the aesthetic.** `index.html` fetches it,
appends a `blog` section to `CONTENT`, and rebuilds. If the fetch fails (e.g.
the site is served without Jekyll) the page silently keeps its original cards.

Posts in the same topic share a fractal branch: `branchForTopic()` hashes the
topic path to one of the four dive targets, and `assignBlogBranches()` writes it
into `stepBranches[]`, which `getStepParams()` honours in place of its usual
parity cycle. Because `childSide` is set to `-v * rotationDir`, the resulting
child anchor is exactly `(h * SIDE_OFFSET, v * CHILD_OFFSET)` **regardless of
step parity** — which is what makes a topic occupy one limb no matter where it
lands in scroll order.

### Design System

- **Color-coded sections**: Each section (home / research / projects) has its own background + flower + fractal-stroke colors. In fractal mode these are defined in `SECTION_COLORS` in the inline script and interpolated as you scroll between sections. `styles.css` also defines per-page body-ID colors (`#index`, `#research`, `#projects`) used by the legacy/simple styling.
- **Flower decorations**: Background `.flower-mask` divs using CSS masks pointing to `images/fb.png`.
- **Wavy header**: The header uses complex `clip-path` polygons for its distinctive wavy bottom edge (in `styles.css`).
- **Face switcher**: Clickable avatar in the header that randomly cycles through 4 face images on click (`script.js`).

### Interactive Elements

`script.js` provides the face switcher: it randomly switches between 4 face images (faceClean, faceBeard, faceVR, faceWiz) on click, using the `.active` class to control visibility via CSS opacity transitions. All other interactivity (scrolling, cards, nav, snapping, mode toggle) lives in the inline `<script>` in `index.html`.

## Development Workflow

### No Build System

This is a pure static site with no build process. Changes to HTML/CSS/JS files are immediately reflected when the page is refreshed.

### Testing Changes Locally

Two modes, because the blog needs Jekyll to render:

**Without Jekyll** (fine for the fractal, research, projects — the blog section
just won't appear):
```bash
python3 -m http.server 8000
```

**With Jekyll** (required to see blog posts):
```bash
bundle exec jekyll serve
```
Then open <http://127.0.0.1:4000/>. Auto-regeneration is on, so saving a file in
`_posts/` rebuilds the site within a couple of seconds — no restart needed.

First-time setup (once):
```bash
export PATH="/opt/homebrew/opt/ruby/bin:$HOME/.gem/ruby/3.4.0/bin:$PATH"
bundle install
```

Gotchas, all hit and resolved while setting this up:
- The macOS **system Ruby (2.6) cannot run Jekyll** — its native gems are built
  for x86_64 and it predates the `json` gem's Ruby >= 2.7 floor. The `PATH`
  export above puts Homebrew Ruby 3.4 first; add it to `~/.zshrc` to make it
  stick. Verify with `ruby -v` (expect 3.4.x, not 2.6).
- **Do not** run `bundle config set --local path vendor/bundle`. That installs
  ~88 MB of gems *inside* the repo, and Jekyll then tries to compile the bundled
  themes' SCSS and fails. Let gems install globally.
- `theme: null` and `encoding: utf-8` in `_config.yml` are load-bearing: the
  `github-pages` gem otherwise defaults to `jekyll-theme-primer`, whose SCSS
  fails to compile when the shell locale is not UTF-8.

`.claude/launch.json` has `site` (repo root, port 8000) and `site-built`
(`_site/`, port 8001) for the preview tooling.

### Deployment

The site is hosted on GitHub Pages. Changes are deployed by:
1. Committing changes to the `main` branch
2. Pushing to GitHub - GitHub Pages automatically serves from the repository root

## File Organization

- `index.html` - the whole single-page app (inline `<style>` + inline fractal-scroll `<script>`)
- `_config.yml`, `Gemfile` - Jekyll configuration
- `_posts/*.md` - blog posts (the only place blog content lives)
- `_layouts/`, `_includes/` - blog page templates and the reading-time helper
- `blog/index.html` - topic-grouped blog index; `blog/posts.json` - manifest the fractal consumes
- `assets/blog.css` - all blog styling; `assets/footnotes.js` - popup footnotes
- `_site/` - Jekyll build output, gitignored, never committed
- `research.html`, `projects.html` - redirect stubs to `index.html#research` / `#projects`
- `styles.css` - shared/legacy styles (header, faces, flowers, palette, old project layouts)
- `script.js` - face switcher
- Images in `images/`, with `images/faces/` for avatar variants
- PDFs in root: `CV.pdf`, `Resume.pdf`

## Content Update Patterns

**Almost all content edits happen in the `CONTENT` array in `index.html`'s inline script — not in `research.html`/`projects.html`.**

### Adding a Research or Project Entry

Add a new object to the `CONTENT` array in the appropriate position (entries are grouped by `section`, in array order):
```js
{
    section: 'research', // or 'projects' / 'home'
    eyebrow: 'VENUE \'YY · Award',   // small label above the title (optional)
    title: 'Title',
    image: 'images/teaser.png',       // optional
    body: 'Description text...',       // optional
    links: [{ href: 'https://...', label: 'Paper' }]  // optional; https links open in a new tab
}
```
The publication-list card is a special entry using a `citations` array instead of `body`/`links`. Cards render in array order and appear in both the spiral and the progress-dots TOC automatically.

### Adding a Blog Post

Create `_posts/YYYY-MM-DD-slug.md` with the front matter shown above. Nothing
else needs editing: the post appears on its own page, in `blog/`, in the RSS
feed, and as a teaser card on the fractal's blog branch automatically. Use
`categories` to place it in the topic hierarchy — posts sharing a topic
automatically share a fractal branch.

### Updating Colors

- Fractal-mode section colors: edit `SECTION_COLORS` in the inline script (`bg`, `flower`, `stroke` per section).
- Legacy/simple + header palette: edit the CSS custom properties in `:root` and the per-body-ID rules in `styles.css`.

## Key Design Decisions

- **No JavaScript frameworks**: Vanilla JS, no client-side dependencies. The
  only build step is Jekyll, and it runs on GitHub Pages rather than locally.
- **Content/presentation separation**: posts are plain markdown; `assets/blog.css`
  and the layouts are the only things that style them; `blog/posts.json` is the
  single narrow interface to the fractal. Dropping the fractal aesthetic later
  means deleting a fetch, not rewriting content.
- **Content as data**: All cards are driven by the single `CONTENT` array, so adding content never touches layout/animation code.
- **Two layouts, one source of truth**: The fractal spiral (desktop) and the simple stacked layout (mobile / opt-out) render from the same `CONTENT`; `simple-layout` on `<body>` switches between them.
- **Progressive enhancement / accessibility**: Mobile and the fractal-mode-off path get a plain, scrollable document; decorative flourishes (canvas, flowers) are background-only and don't block content.
- **Academic focus**: Content structure emphasizes research publications and academic achievements.
