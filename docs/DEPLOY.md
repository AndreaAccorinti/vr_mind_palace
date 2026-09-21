# Deploying Loci

Purpose: get an **HTTPS** origin so the Quest 3 will offer WebXR. Meta Quest
Browser only exposes `navigator.xr` in a secure context, so a `npm run dev` LAN
address cannot be used for the device test — the app will correctly report "no
WebXR", which is not a bug.

Target: **Cloudflare Workers Static Assets, Free plan, no Worker script.** The
`dist/` output stays portable; §6 lists the alternatives.

> Publishing puts the app on the public internet. Nothing in this document runs
> itself — every step below is yours to run, and `npm run deploy` is the only
> command that publishes anything.

---

## 1. Before the first deploy

You need a Cloudflare account (free, no card). Wrangler is already a pinned
devDependency, so there is nothing to install globally.

```bash
npm ci
npm run typecheck && npm run lint && npm test && npm run build
```

All four must pass. `npm run build` also runs `npm run assets`, which copies the
bundled WebXR controller profiles into `public/webxr-profiles/` — that directory
is generated and git-ignored, so a fresh clone gets it from this step and not
from the repository.

## 2. Inspect what will be published

AGENTS.md requires this: a deployment is public application delivery, so look at
what goes out before it goes out.

```bash
npx wrangler deploy --dry-run      # validates config, publishes nothing
find dist -type f | sort
du -sh dist
```

Expected, as of the current build: **22 files on disk, about 4.8 MB**, largest
asset about 1.39 MB (a Japanese font). Cloudflare's Free limits are 20,000 files
and 25 MiB per asset, so there is a lot of headroom.

Wrangler's own output says `Read 26 files` — it counts the four directories as
well. Both numbers are correct; neither is a problem.

Most of that total never loads. The two Japanese fonts are 2.8 MB of it and are
fetched only when a string needs them; the initial load is about 1.4 MB of
JavaScript and CSS (roughly 390 KB gzipped) plus 62 KB of Latin fonts.

Check, every time:

- [ ] No personal learning material. The only content in the bundle is the
      synthetic M0 demo fixture, compiled into the JavaScript.
- [ ] No exports, backups or `*.palace.json` files.
- [ ] No `.env`, no keys, no tokens. The app has no environment variables and
      makes no authenticated request to anything.
- [ ] `dist/webxr-profiles/` is present (controller models served from our own
      origin rather than a CDN).

## 3. Authenticate

```bash
npx wrangler login
```

This opens a browser for Cloudflare's OAuth flow and stores a local token. It
does not create a paid plan or add a billing method.

## 4. Deploy

```bash
npm run build
npm run deploy          # = wrangler deploy
```

Wrangler prints the URL, of the form:

```
https://loci-memory-palace.<your-subdomain>.workers.dev
```

The configuration it uses is `wrangler.jsonc`: `assets.directory` is `./dist`,
`not_found_handling` is `single-page-application`, and there is deliberately **no
`main` entry** — this is a static asset deployment with no server code, which is
what keeps it inside the free tier with no Worker invocations to account for.

If the account has never used `workers.dev`, Cloudflare asks you to pick a
subdomain on first deploy. Choose one and keep it: see §5.

## 5. Keep one origin

Browser storage is per origin. A palace saved on
`loci-memory-palace.abc.workers.dev` is invisible from a preview URL or a
different subdomain, and the same is true of the recorded device-test run.

So: pick one production origin and stay on it. If you ever change hostname,
export first. This matters more than it sounds — it is the difference between
"my palace vanished" and "my palace is on the other hostname".

## 6. Verify on the device

```
1. Open the https://…workers.dev URL in Meta Quest Browser — the top-level URL,
   not inside an embedded frame.
2. The capability line should read "Immersive VR available" and Enter VR should
   be enabled. If it says "Needs a secure address", you are on http://.
3. Enter VR, then work through docs/M0-REVIEW.md §3 (C1–C22).
4. Open "Frame stats" on the control row and leave it running through the
   five-minute rehearsal.
5. Press "Save run", then exit VR.
6. Back on the 2D page, "Last recorded run" shows the figures as selectable
   text. Use "Copy for QUEST-TEST.md" and paste it into docs/QUEST-TEST.md.
```

Step 6 exists because transcribing numbers read through a headset is how an
acceptance record ends up approximate.

## 7. Other static hosts

`dist/` is a plain static bundle; nothing is Cloudflare-specific except
`wrangler.jsonc`. Each of these needs the SPA fallback configured, or deep links
will 404:

| Host | Build command | Output | Fallback |
| --- | --- | --- | --- |
| Cloudflare Pages | `npm run build` | `dist` | SPA fallback in project settings |
| Vercel | `npm run build` (framework: Vite) | `dist` | rewrite `/(.*)` → `/index.html` |
| Render (Static Site) | `npm run build` | `dist` | rewrite `/*` → `/index.html` |

`public/_headers` is read by Cloudflare and Netlify. It sets
`Permissions-Policy: xr-spatial-tracking=(self)`, which WebXR needs, plus
`nosniff` and a no-referrer policy. **On a host that ignores `_headers` you must
set the permissions policy yourself**, or the immersive session request can be
blocked by policy rather than by capability.

## 8. Rolling back

Cloudflare keeps previous versions. `npx wrangler deployments list` shows them
and `npx wrangler rollback [version-id]` reverts. Roll back rather than deleting:
the origin must stay stable, per §5.
