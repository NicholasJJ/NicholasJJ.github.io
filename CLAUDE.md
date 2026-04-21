# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal academic website for Nicholas Jennings, hosted on GitHub Pages. The site showcases research publications, projects, and professional information. It's a static site built with vanilla HTML, CSS, and JavaScript with no build system or dependencies.

## Architecture

### Site Structure

The site consists of three main pages with a shared header navigation:
- `index.html` - Home page with biography and professional background
- `research.html` - Research projects and publications list
- `projects.html` - Personal projects showcase in a grid layout

### Design System

The site uses a distinctive visual design with:
- **Color-coded pages**: Each page has its own background color scheme defined in CSS via body IDs (`#index`, `#research`, `#projects`)
- **Flower decorations**: Background decorative elements using `.flower-mask` divs with CSS masks pointing to `images/fb.png`
- **Wavy header**: The header uses complex `clip-path` polygons to create a distinctive wavy bottom edge
- **Face switcher**: Clickable avatar in header that randomly cycles through 4 different face images on click (handled by `script.js`)

### Styling Architecture

All styles are in `styles.css` with:
- CSS custom properties in `:root` for the color palette (blue, red, green, purple variants)
- Responsive breakpoints at 1100px, 768px, and 600px
- Grid-based layouts for research projects (`.project`) and project cards (`.pproject-grid`)
- Fixed header with `position: fixed` and page content padded by `padding-top: 80px`

### Interactive Elements

`script.js` provides the only interactivity:
- Randomly switches between 4 face images (faceClean, faceBeard, faceVR, faceWiz) on click
- Uses `.active` class to control visibility with CSS opacity transitions

## Development Workflow

### No Build System

This is a pure static site with no build process. Changes to HTML/CSS/JS files are immediately reflected when the page is refreshed.

### Testing Changes Locally

Open the HTML files directly in a browser or use a simple HTTP server:
```bash
python3 -m http.server 8000
# Then visit http://localhost:8000
```

### Deployment

The site is hosted on GitHub Pages. Changes are deployed by:
1. Committing changes to the `main` branch
2. Pushing to GitHub - GitHub Pages automatically serves from the repository root

## File Organization

- HTML files in root: `index.html`, `research.html`, `projects.html`
- Single CSS file: `styles.css`
- Single JS file: `script.js`
- Images in `images/` directory with subdirectory `images/faces/` for avatar variants
- PDFs in root: `CV.pdf`, `Resume.pdf`

## Content Update Patterns

### Adding Research Projects

In `research.html`, add a new `.project` div following the existing pattern:
- Use `.project-photo-container` with `.project-photo` for images
- Include `.project-content` with `.project-title`, `.project-description`, and `.paper-link` for metadata
- Research projects display in a two-column grid (image on left, text on right) that stacks vertically on narrow screens

### Adding Personal Projects

In `projects.html`, add a new `.pproject-card` div to `.pproject-grid`:
- Use `.pproject-imageWrapper` with `.pproject-image` for the thumbnail
- Include `.pproject-title`, `.pproject-description`, and `.pproject-link` elements
- The grid displays 2 columns on wide screens, stacking to 1 column on mobile

### Updating Colors

Modify CSS custom properties in `:root` in `styles.css`. Each page body ID (`#index`, `#research`, `#projects`) defines its background color and corresponding `.flower-mask` color.

## Key Design Decisions

- **No JavaScript frameworks**: Keeping the site simple and fast with vanilla JS
- **Mobile-first responsive**: Uses CSS Grid and media queries for responsive layouts
- **Decorative but accessible**: Visual flourishes (flowers, wavy header) are implemented as background elements that don't interfere with content
- **Academic focus**: Content structure emphasizes research publications and academic achievements
