# Drawing portfolio — one page, panel-ready

A single-page portfolio for serahbobin, built to be read in four minutes on a phone by an NID/NIFT/UCEED interview panelist. Built with this project's React stack (your choice), while keeping the brief's spirit: one page, no nav, drawings visible immediately, data-driven content, fast and light.

## Page structure (one route, `/`)

1. **Header** — name, one line on what you draw, one line on where you're applying. Two lines max, display face, no hero image. A drawing is visible within the first scroll on a 390px viewport.
2. **Sketchbook feed** — the main event. Reverse chronological, two columns on mobile, four on desktop, masonry so drawings keep their true proportions. Every item shows its date in mono. Built to make 60+ items feel abundant, not exhausting.
3. **Selected work** — few items, large, single column. Caption block beside the image (not over it) in the mono/utility face: medium, time taken, what you were solving, what you'd redo.
4. **Log** — dated one-line entries from `log.json`, monospace, panel background, terminal-readout feel. Static text, no typing effect.
5. **About and contact** — short first-person paragraph, email, Instagram. No form.

## Content model

`src/data/works.json` and `src/data/log.json`, imported directly — you add a drawing by dropping the image in and adding one JSON object. Exactly the shape you specified (`id, file, alt, title, date, medium, time, section, note`); `section` is `sketchbook` or `selected`. Five placeholder entries in each file.

## Visual direction

- Palette wired as design tokens: ink `#0F0F0E`, paper `#EFEBE1`, accent `#FF3B1F` (used once or twice only), muted `#8A857A`, panel `#E3DED2`.
- Three faces: a characterful display face for name and section headings, a clean grotesque for prose, and a monospace for dates, captions and the log. Mono appears wherever there is data, never for prose.
- No cream-and-serif-and-terracotta default look. No preloader, cursor, page transitions, scroll progress, process section, dark-mode toggle, square crops, or text over artwork.

## Behaviour

- Lightbox on click, keyboard-accessible (Escape, focus trap, visible focus rings), disabled under `prefers-reduced-motion` for any transition.
- First three images eager, everything else `loading="lazy"`, with real width/height so nothing shifts.
- No animation libraries.

## Images

Five placeholder drawings generated in a graphite/sketch style at varied real proportions so the layout can be judged now; swapped out when your scans go in.

## Technical notes

- Single route in `src/routes/index.tsx` replacing the template placeholder, with its own `head()` (title, description, og/twitter tags).
- Tokens added to `src/styles.css` under `@theme inline`; fonts loaded via `<link>` in `__root.tsx`.
- Components split into `Header`, `SketchbookFeed`, `SelectedWork`, `Log`, `About`, `Lightbox` under `src/components/portfolio/`.
- No backend, no database — everything is static JSON and local images.
- `README.md` gets a two-step "how to add a drawing" section.

## Deviation from the brief

You chose the React build, so this is not a hand-written static folder: there is a build step and a small JS bundle, and the page needs JS to render. Everything else in your constraints — weight, lazy loading, no motion libraries, no nav, real proportions, reduced-motion, keyboard focus, alt text — still holds.
