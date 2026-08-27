# serahbobin — drawing portfolio

One page. Sketchbook feed, selected work with captions, a practice log, and contact.

## Add a new drawing in two steps

1. **Drop the image** into `src/assets/` (longest edge 1600px, JPEG or WebP), then add one line to `src/data/images.ts`:

   ```ts
   import newDrawing from "@/assets/new-drawing.jpg";
   // inside `images`:
   "new-drawing": { src: newDrawing, width: 1200, height: 1600 },
   ```

2. **Add one entry** to `src/data/works.json` (newest entries can go anywhere — the page sorts by date):

   ```json
   {
     "id": "2026-09-new-drawing",
     "file": "new-drawing",
     "alt": "Describe the drawing itself, not the filename",
     "title": "Short title",
     "date": "2026-09-02",
     "medium": "Graphite on cartridge, A4",
     "time": "40 min",
     "section": "sketchbook",
     "note": "What you were solving and what you would redo."
   }
   ```

`section` is `sketchbook` (the dense feed) or `selected` (large, with a caption block).

To add a log line, append an entry to `src/data/log.json`:

```json
{ "date": "2026-09-02", "kind": "STUDY", "text": "hands, 40 min" }
```

`kind` is free text; `FAILED` renders in the accent colour.
