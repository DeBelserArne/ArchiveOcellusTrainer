# Tikky Takka Trainer

A free practice simulator for phase 4 of the Ocellus fight in The Fractured Archive.

**Status: early development.** Mechanics come from the community wiki and release-day reports. Timings are unverified and will change.

Play it at https://tikky-takka-trainer.pages.dev. Add `?invincible=on` to the link to practise without dying, or open **Settings** in the game and tick **Invincible**. Pick a single mechanic to drill from **Focus** in the same menu. Hold Control while clicking a tile to walk there instead of running, as in game.

Built on [osrs-sdk](https://github.com/OldSchoolSDK/osrs-sdk), following the layout of [ColosseumTrainer](https://github.com/Supalosa/ColosseumTrainer).

## Development

Requires Node 22.

```sh
npm ci
scripts/install-beta-sdk.sh     # beta osrs-sdk packages, installed without saving; rerun after any npm ci
npm run assets -- --cache-dir <openrs2 cache dir> --reader-path <osrscachereader checkout>
npm start                       # http://127.0.0.1:8002
```

`npm run assets` extracts models from OpenRS2 cache 2746 into `public/osrs-assets/`, which is never committed. It then draws an inventory icon for each of the trainer's own items, and for the Masori (f) pieces and Zaryte vambraces, from the item's model in the same cache, the way the game client draws it, into `public/osrs-assets/item-icons/`, and writes the boss's overhead icons from the cache's sprite index into `public/osrs-assets/sprites/`. `npm run item-icons` with the same two options redraws only the icons. The icon renderer in `src/itemIcons/` is ported from RuneLite's cache tool under its BSD 2-clause licence.

## Hosting

The site is a static bundle in `dist`, published to Cloudflare Pages at https://tikky-takka-trainer.pages.dev. The Worker in `src/worker/worker.ts` is deployed separately as `tikky-takka-trainer` and accepts the sampled performance summaries at `/t`, writing them to Workers Analytics Engine. Pages Functions cannot bind Analytics Engine, so the browser posts the summary to the Worker's absolute address, which `src/telemetry.json` names as `beaconUrl`; without that field the beacon falls back to `/t` on whichever host served the page.

Both deployments sit on free plans whose limits are hard caps rather than metered billing, so hosting costs nothing and cannot produce an invoice:

- Pages serves the site from its free plan: up to 20,000 files at 25 MiB each, and 500 builds a month, which the direct upload here does not spend. Static requests do not consume a Worker request.
- Workers Free allows 100,000 requests a day, so the cap now covers the beacon alone rather than every asset. Past it `/t` stops accepting summaries until the next day and the game keeps working.
- Analytics Engine accepts 100,000 data points a day on the Free plan, and Cloudflare does not currently bill Analytics Engine usage at all.

A cold visit is 374 requests for 7.5 MB gzipped; return visits mostly come from the browser cache the rules in `src/_headers` allow. Staying on the free plans is what keeps this free; moving the Worker to Workers Paid is the one change that turns these caps into a bill.

### Deploying

`wrangler.jsonc` holds the Worker config: the script at `src/worker/worker.ts` and the Analytics Engine dataset `archive_ocellus_perf` bound to `env.PERF`. Both hosts upload `dist`, and neither needs a separate Worker build, because `wrangler deploy` bundles the TypeScript. `public/osrs-assets/` and `dist/` are not committed, so build them first.

```sh
npx wrangler login     # opens the browser and links the CLI to your Cloudflare account
npx wrangler whoami    # prints the account and its workers.dev subdomain
npm ci && scripts/install-beta-sdk.sh
npm run assets -- --cache-dir <openrs2 cache dir> --reader-path <osrscachereader checkout>
npm run build
npm run deploy         # the Worker that takes /t
npm run deploy:pages   # the site at https://tikky-takka-trainer.pages.dev
```

Both commands create their resource on first run, so nothing has to exist in the dashboard beforehand. `npx wrangler deploy --dry-run` validates the Worker bundle and its bindings without an account.

To deploy from CI, skip `wrangler login` and authenticate with a token: create one from the **Edit Cloudflare Workers** API token template, then run `npm run deploy` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set in the environment. `wrangler` is a pinned devDependency, so `npm ci` provides it, and its local state lands in `.wrangler/`, which is gitignored.

`netlify.toml` and `scripts/netlify-build.sh` build the same bundle without Cloudflare, and the test workflow runs that script to measure performance. Netlify is not the production host: its credit-based Free plan is a 300 credit monthly hard limit that charges 20 credits per GB of bandwidth and 15 credits per production deploy, so a cold visit costs about 0.22 credits and a month covers about 1,300 of them, and Netlify has nothing to serve `/t`. Keeping the deploy on Cloudflare keeps the bandwidth free.

## Review

Read [CODE_REVIEW.md](CODE_REVIEW.md) before you review a change. It lists the performance red flags and explains `scripts/verify.sh perf`, which measures draw calls, canvas size, GPU resource growth, frame time and tick timing against the budgets in `src/perf/perfGate.json`.

## Releases

Each pull request that changes what players see adds one plain-language line to `src/content/ocellus/changelog.ts`. The line goes in the newest release if that release has not shipped yet. Otherwise it goes in a new release, versioned by the day it ships: `YYYY.MM.DD`, or `YYYY.MM.DD.2` for a second release that day. Players read the notes under **Settings**, then **What's new**, and `node scripts/release-notes.mjs` prints the newest release as Markdown for a GitHub release.

## Privacy

To find what causes lag, a sample of runs sends one anonymous performance summary when the run ends or the page is hidden mid-run. It holds the frame and tick timings, 2D or 3D, the screen scale and game size rounded to 50 pixels, the CPU core count, the graphics card family (such as `nvidia` or `apple`, never the full name), the browser family, the app version, the phase and how the run ended. It carries no ID, sets no cookie and stores nothing that identifies a player, and the trainer's code does not store IP addresses. Page views are counted with Cloudflare Web Analytics, which sets no cookies. Web Analytics loads on every page view unless you opt out. Only the performance summary is sampled. To turn both off, open **Settings** and untick **Send anonymous performance data**. The choice is saved in the browser. The summary stops at once, and page view counting stops from the next page load.

The share of runs that send a summary is `sampleRate` in `src/telemetry.json`, served as `/telemetry.json`. The Worker in `src/worker/worker.ts` accepts summaries at `/t` and writes each one to Workers Analytics Engine. `scripts/perf-report.mjs` summarises them.

## Credit

Made by Julian Dasilva / Moarhots ([@ShadowJdas](https://x.com/ShadowJdas) on X).

Created using intellectual property belonging to Jagex Limited under the terms of Jagex's Fan Content Policy. This content is not endorsed by or affiliated with Jagex.

Game models are extracted, and item icons drawn, from the game cache at build time. Neither is stored in this repository.

## Licence

GPL-3.0. See [LICENSE](LICENSE).
