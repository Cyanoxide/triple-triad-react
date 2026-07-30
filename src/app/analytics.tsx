/**
 * Umami, rendered only when a website ID was built in.
 *
 * The ID comes from `.env.production.local`, which is gitignored, so a clone or
 * a fork renders no script tag at all — analytics are simply absent rather than
 * broken or pointed at someone else's account. See `.env.example`.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, and this project is a static
 * export, so the tag either is or is not in the exported HTML. Nothing is
 * decided at runtime.
 *
 * Umami is cookieless, which is why the site carries no consent banner.
 */
export function Analytics() {
    const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

    if (!websiteId) return null;

    // A plain tag rather than next/script: the tracker reads its configuration
    // off document.currentScript, and this way it is in the exported HTML with
    // no client-side JavaScript involved at all.
    return <script defer src="https://cloud.umami.is/script.js" data-website-id={websiteId} />;
}
