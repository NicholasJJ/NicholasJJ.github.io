# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal academic website for Nicholas Jennings, hosted on GitHub Pages. The site showcases research publications, projects, and professional information. It's a static site built with vanilla HTML, CSS, and JavaScript with no build system or dependencies.

## Architecture

### Single-Page App

The site is effectively a **single-page app driven entirely by `index.html`**. Home, research, and projects are all sections of that one page, navigated by scrolling:

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
- **Fractal mode toggle**: A header checkbox (`#fractalModeToggle`) lets the user switch between fractal and simple layouts; the preference is persisted in `localStorage` under `fractalMode`.

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

Serve over HTTP (don't just open the file — the redirect stubs and relative assets behave best over a server):
```bash
python3 -m http.server 8000
# Then visit http://localhost:8000
```
There is a `.claude/launch.json` configured to run exactly this for the preview tooling.

### Deployment

The site is hosted on GitHub Pages. Changes are deployed by:
1. Committing changes to the `main` branch
2. Pushing to GitHub - GitHub Pages automatically serves from the repository root

## File Organization

- `index.html` - the whole single-page app (inline `<style>` + inline fractal-scroll `<script>`)
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

### Updating Colors

- Fractal-mode section colors: edit `SECTION_COLORS` in the inline script (`bg`, `flower`, `stroke` per section).
- Legacy/simple + header palette: edit the CSS custom properties in `:root` and the per-body-ID rules in `styles.css`.

## Key Design Decisions

- **No JavaScript frameworks**: Vanilla JS, no dependencies or build step.
- **Content as data**: All cards are driven by the single `CONTENT` array, so adding content never touches layout/animation code.
- **Two layouts, one source of truth**: The fractal spiral (desktop) and the simple stacked layout (mobile / opt-out) render from the same `CONTENT`; `simple-layout` on `<body>` switches between them.
- **Progressive enhancement / accessibility**: Mobile and the fractal-mode-off path get a plain, scrollable document; decorative flourishes (canvas, flowers) are background-only and don't block content.
- **Academic focus**: Content structure emphasizes research publications and academic achievements.
