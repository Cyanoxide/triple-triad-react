import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const manifest = self.__SW_MANIFEST ?? [];

/*
 * The exported document, added to the precache by hand.
 *
 * `out/index.html` is written by the export step, *after* the precache
 * manifest has been generated, and it lives in neither the webpack assets nor
 * `public/` — so nothing puts it in the manifest. Without it the worker caches
 * every asset and still cannot answer a navigation: the app loads perfectly
 * online and fails outright offline, which reads as the service worker not
 * working at all rather than as a missing entry.
 *
 * It cannot go in `additionalPrecacheEntries` in `next.config.ts`, because
 * that option replaces the generated manifest rather than extending it.
 *
 * The revision is the sorted list of the build's JS chunk names, every one of
 * which carries a content hash. So it changes exactly when the app's code
 * changes — which is also the only time the exported HTML changes — and stays
 * put when nothing has. A timestamp would have re-fetched the document on
 * every deploy whether or not it differed.
 */
const documentRevision = manifest
  .map((entry) => (typeof entry === "string" ? entry : entry.url))
  .filter((url) => url.endsWith(".js"))
  .sort()
  .join(",");

const serwist = new Serwist({
  precacheEntries: [...manifest, { url: "/", revision: documentRevision }],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    /*
      * The multiplayer handler, never cached.
      *
      * A room is an append-only event log and the client asks what happened
      * after event N. Serving any of that from a cache hands a client an
      * answer to a question it is not asking — and it would not look like a
      * caching fault, it would look like the board desyncing or a move being
      * dropped, which is the hardest class of bug in this app to chase.
      *
      * First in the array on purpose: Serwist takes the first matching
      * strategy, and `defaultCache`'s catch-all rules would otherwise claim it.
      */
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname === "/game.php",
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
