# Putting the daily puzzle on the website

This repo makes the puzzles; the website only shows them. The contract between the two is small on
purpose, and it never changes when the mechanics do.

## What this repo hands over

```
dailygen publish W21 --start 2026-09-21 --out ~/code/mysite/sokobondl
```

writes into that folder:

```
sokobondl/
  index.json                 the manifest — every published day, oldest first
  levels/2026-09-21.html     one sealed page per calendar day
  levels/2026-09-22.html
  …
```

`--start` is the calendar date of the week's day 1 (Monday). It is remembered in the manifest, so
re-publishing a week later (a fixed level, a re-densified board) is just `dailygen publish W21 --out …`.
Publishing the next week adds seven entries and leaves the earlier ones alone. Commit the folder and
push; that is the whole deploy. **Build the player first when the engine changed**
(`cd Web/frontend && npm run build:player`, node 20) — the pages are built from that template.

Each page is self-contained: the engine, the renderer, the pack's rules and the day's level are all
inside it. A day published under one version of the mechanics keeps playing exactly as it was verified,
whatever the rules do later. The site never carries a copy of the engine or the rules.

A page holds the day's **tutorial level(s) first, then the day** (the first day a week uses a mechanic).
Tutorial levels are marked `tutorial: true` in the embedded set, and the page reports them as such.

### The manifest

```json
{ "schemaVersion": 1, "name": "sokobondl", "generatedAt": "2026-09-20T…",
  "days": [
    { "date": "2026-09-21", "file": "levels/2026-09-21.html", "weekId": "W21", "day": 0,
      "title": "Day 1 Mon", "w": 5, "h": 5, "boxes": 2, "levels": 1,
      "mechanics": [], "tutorials": [], "publishedAt": "2026-09-20T…" },
    { "date": "2026-09-24", "file": "levels/2026-09-24.html", "weekId": "W21", "day": 3,
      "title": "Day 4 Thu", "w": 5, "h": 5, "boxes": 2, "levels": 2,
      "mechanics": ["slide"], "tutorials": ["slide"], "publishedAt": "…" }
  ] }
```

`mechanics` = the pack tags the day's contract asks for (what to show as the day's blurb);
`tutorials` = the tags taught on the page before the day; `levels` = tutorials + 1.

## What the website does

1. **Fetch `index.json`** and keep the days whose `date` is on or before **today's local date**
   (compare the `YYYY-MM-DD` strings). That is the gating: the whole week is committed ahead, and the
   shell simply does not list or link a day until its date. Someone who guesses tomorrow's filename can
   play early; for a puzzle that is fine. (If you ever want it strict, a scheduled GitHub Actions
   workflow can copy the day's file from a queue folder and redeploy Pages on its own, even though you
   push from the laptop. Not needed to start.)
2. **Routes.** `/sokobondl/` shows the latest published day, `/sokobondl/?d=2026-09-21` a specific day
   (this is the share link), `/sokobondl/?archive` the list. Query strings need no configuration on
   GitHub Pages; a path per day would need a generated page per date.
3. **Embed the page** in an iframe: `levels/<date>.html?embed=1`. Embed mode drops the page's own
   title, key hints and pack blurb and uses a transparent background, so centering is the iframe's CSS.
   `&bar=0` also hides the level bar (keep it on tutorial days: it is how the player sees "1. tutorial,
   2. the puzzle"). The page posts its size; set the iframe height from that.
4. **Listen** to the page (below) for the timer and the result.

### The messages the page posts

Every message is `window.parent.postMessage({ source: 'sokoban-player', type, … }, '*')`. Check
`e.data.source === 'sokoban-player'` and `e.source === iframe.contentWindow`.

| type | fields | when |
|---|---|---|
| `ready` | `name`, `current`, `levels: [{index, name, tutorial}]` | the page has loaded and shows level `current` |
| `level` | `index`, `name`, `tutorial`, `count`, `moves: 0` | a level was (re)loaded: first show, next/prev, reset |
| `move` | `index`, `moves` | an input was accepted; `moves` = path length so far |
| `undo` | `index`, `moves` | an undo |
| `reset` | `index` | R was pressed (a `level` follows) |
| `dead` | `index`, `moves`, … | the player fell in (undo or reset to continue) |
| `win` | `index`, `name`, `tutorial`, `moves`, `undos`, `allDone` | the level was solved |
| `size` | `width`, `height` | the page's size changed (size the iframe) |
| `error` | `message` | the page could not load its set |

The site can also drive the page: post `{ source: 'sokoban-player-host', type: 'load', index }`,
or `type: 'next' | 'prev' | 'reset' | 'undo'`, or `{ type: 'move', dir }` (0 up, 1 down, 2 left, 3 right,
4 action).

### Timer rules

- The clock starts **the moment the day's board is on screen** (crossword rules: solving it in your
  head before the first move still counts). Concretely: on `ready` when the current level is not a
  tutorial, else on the first `level` message with `tutorial: false`. Tutorials are untimed.
- Store `startedAt` per date in `localStorage` as soon as it starts, so a reload does not reset it.
- It keeps running through undos and resets and stops on `win` with `tutorial: false`. Store
  `finishedAt`, `elapsedMs`, `moves` (and `undos`) per date; on a later visit show the result instead of
  restarting the clock, and let them replay.
- The share text: `I beat the 2026-09-21 sokobondl in 1:23 (34 moves)!` plus the day's link. Moves are
  worth including: time alone rewards fast fingers over thinking.

## A reference implementation

`Web/site-shell/index.html` in this repo is a complete static shell that does all of the above in
about a hundred lines with no build step: copy it next to `index.json` (it uses relative paths), open
it, done. It is the thing to adapt to the site's look rather than a component to import; the protocol
above is the only part that has to stay as it is.

## Day to day

1. Build the week here (generate or hand-build, verify, export locally to play it).
2. `dailygen publish W<n> --start <Monday> --out <site>/sokobondl`.
3. In the website repo: commit `sokobondl/`, push. The days appear one by one as their dates arrive.

If a level has to be fixed after it is out, fix it here, re-publish (no `--start` needed), commit,
push. Only that day's file and manifest entry change.
