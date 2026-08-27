# Preview Run Doc

## Reproduce uncommitted artifacts

This is the main checkout (no worktree copy needed). No special artifact reproduction required — `node_modules` is already installed.

If starting fresh:
1. `npm install` (or `npm ci` if lockfile exists)
2. Copy `.env.local` from main checkout (already present — same directory)
3. `npm run build` to populate `.next/` (optional for dev mode)

## How to run the server

```bash
# Dev mode (Turbopack, hot reload):
npx next dev --turbopack -p 4567

# Production mode (fast responses, requires build first):
npx next build
npx next start -p 4567
```

The static preview at `.freebuff/preview.html` is a self-contained HTML file with inlined CSS and Google Fonts — no server needed. Register it with `register_preview { htmlPath: ".freebuff/preview.html" }`.

### Notes

- Port 3000 is often occupied by zombie processes on this machine. Use port 4567 or another free port.
- Turbopack dev server has a slow first compile (~20-30s). The `register_preview` tool has a short timeout that may fail until the cache is warm. Use `next start` for faster startup.
- The `register_preview` URL+PID mode has connectivity issues on this Windows/Git Bash setup. The `htmlPath` mode works reliably.
