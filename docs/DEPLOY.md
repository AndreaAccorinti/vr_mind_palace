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

`dist/` is a plain static bundle and nothing in the app is Cloudflare-specific.
Config for the two most likely alternatives is committed, so switching is a
dashboard action rather than a code change:

| Host | Config file | How it deploys |
| --- | --- | --- |
| Cloudflare Workers | `wrangler.jsonc` | `npm run deploy` from your machine |
| Vercel | `vercel.json` | Import the GitHub repo; every push deploys |
| Render | `render.yaml` | New Blueprint from the repo; every push deploys |
| Cloudflare Pages | *(dashboard)* | Build `npm run build`, output `dist`, enable SPA fallback |

**The one thing that does not travel is `public/_headers`.** Cloudflare and
Netlify read it; Vercel and Render do not. That file carries three things:

1. `Permissions-Policy: xr-spatial-tracking=(self)`. WebXR is allowed for
   same-origin top-level documents by default, so this is belt-and-braces rather
   than strictly required — but if a host applies a restrictive default policy,
   its absence turns into a session request that fails on policy rather than on
   capability, which is a confusing thing to debug in a headset.
2. `nosniff` and a no-referrer policy.
3. Cache rules. `index.html` must revalidate or a returning visitor never sees a
   new deploy; everything under `/assets/` is content-hashed by Vite, so it is
   cached immutably for a year. That second rule matters here more than usual:
   it is what stops the headset re-downloading the 1.39 MB Japanese font on
   every visit.

`vercel.json` and `render.yaml` restate all three in their own formats. They
were written against each host's documented schema and validated as JSON/YAML,
but **neither has been exercised by an actual deployment** — only the Cloudflare
path has had `wrangler deploy --dry-run` run against it.

### Which one

For the M0 device test, **stay on Cloudflare**: it is already wired up and
dry-run validated, and the device test is about the headset, not the host.

If you later want push-to-deploy so the fix-and-retest loop on the Quest does
not route through a terminal, **Vercel** is the better of the two alternatives —
Render's free static sites work but its free build minutes are shared and
slower, and it brings nothing Vercel does not. Whichever you pick, §5 still
applies: once a palace exists on an origin, changing hostname orphans it.

## 8. Rolling back

Cloudflare keeps previous versions. `npx wrangler deployments list` shows them
and `npx wrangler rollback [version-id]` reverts. Roll back rather than deleting:
the origin must stay stable, per §5.
