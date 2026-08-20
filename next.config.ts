import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

/**
 * `next dev` cannot execute PHP, so in development /game.php is handed to a
 * local `php -S`. In production both the site and the handler are served by the
 * same host, so the path resolves on its own and no rewrite is involved.
 *
 * The key is only added in development. `personal-branch` builds with
 * `output: export`, which does not support rewrites, and merging a config that
 * always declares them would break that export.
 */
const isDev = process.env.NODE_ENV === "development";

/**
 * A static export, for uploading to a plain PHP host that cannot run Node.
 *
 * Opt-in via the environment rather than always on: `next dev` and the normal
 * build stay exactly as they were, and nothing here has to be undone to work
 * on the app. `personal-branch` sets `output: export` unconditionally in its
 * own config; this is the same thing behind a switch, so a test upload does
 * not need that branch.
 *
 * `images.unoptimized` comes with it. The optimiser is a server that will not
 * exist on the host, and an export refuses to build with it enabled.
 */
const staticExport = !!process.env.STATIC_EXPORT;

const nextConfig: NextConfig = {
  ...(staticExport
    ? { output: "export" as const, images: { unoptimized: true } }
    : {}),
  ...(isDev
    ? {
      async rewrites() {
        // beforeFiles, not the default. A plain array runs *after* filesystem
        // routes, so Next would serve public/game.php as a static asset and
        // hand the browser the PHP source instead of executing it.
        return {
          beforeFiles: [{ source: "/game.php", destination: "http://127.0.0.1:8100/game.php" }],
          afterFiles: [],
          fallback: [],
        };
      },
    }
    : {}),
};

/**
 * The service worker.
 *
 * `disable` in development, and not as a tidiness measure: a registered worker
 * outlives the page that registered it, so one installed against `next dev`
 * keeps answering from its cache after the code has moved on. The symptom is
 * an edit that appears to do nothing, which is a miserable thing to debug and
 * has nothing to do with the change being made.
 *
 * `globPublicPatterns` is the important line. It defaults to `**\/*`, which
 * would precache the whole of `public/` on install — 10MB, of which 6.7MB is
 * `bgm.mp3` and `victory.mp3`. Those two stream from an HTMLAudioElement by
 * design and are wanted *eventually*, not before the first hand is dealt, so
 * they are left out and picked up by `defaultCache`'s `static-audio-assets`
 * rule the first time they play. That rule carries `RangeRequestsPlugin`,
 * which is what a streaming media element needs and what a naive precache
 * entry would not give it.
 *
 * The patterns are an allowlist, so `game.php` and `gameSessions/` are
 * excluded by simply never matching — no negation to get wrong, and a new
 * room file cannot accidentally find its way into a precache manifest.
 */
/*
 * Do not add `additionalPrecacheEntries` here. It does not *add* — it replaces
 * the generated manifest, and everything `globPublicPatterns` matched
 * disappears with it. Measured: 71 entries without it, 29 with (the 28 webpack
 * chunks plus the one entry passed in, and not a single file from `public/`).
 *
 * The document has to be precached from somewhere, since the exported
 * `out/index.html` is written after the manifest is generated and is in
 * neither the webpack assets nor `public/`. `src/app/sw.ts` appends it to
 * `self.__SW_MANIFEST` at runtime instead, which leaves this manifest alone.
 */
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: isDev,
  globPublicPatterns: [
    "assets/**/*.{png,gif,svg}",
    "assets/audio/!(bgm|victory).mp3",
    "icons/*.png",
    "apple-touch-icon.png",
    "manifest.json",
  ],
});

export default withSerwist(nextConfig);
