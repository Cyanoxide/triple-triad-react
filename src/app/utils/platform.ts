"use client";

/**
 * What the app is being run as, and on what.
 *
 * All of this is browser-only and must be read *after* mount. The server has no
 * user agent worth trusting and no display mode at all, so deciding any of it
 * during render makes the first client render disagree with the server's — the
 * same trap the multiplayer redirect in `page.tsx` documents.
 */

/**
 * Whether this is the installed app rather than a browser tab.
 *
 * Two checks because they cover different eras. `display-mode: standalone` is
 * the standard and is what Android and iOS 16.4 and up report;
 * `navigator.standalone` is Apple's own, and the only signal on older iOS.
 * Either being true means there is no address bar and no tab.
 */
export const isStandalone = (): boolean => {
    if (typeof window === "undefined") return false;

    const legacy = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    return legacy || window.matchMedia("(display-mode: standalone)").matches;
};

/**
 * Whether this is an iPhone or iPad.
 *
 * The `maxTouchPoints` half is not belt and braces: since iPadOS 13 an iPad
 * reports itself as "MacIntel" and is otherwise indistinguishable from a
 * desktop by user agent alone. A Mac has no touch points; an iPad has five.
 */
export const isIOS = (): boolean => {
    if (typeof window === "undefined") return false;

    const ua = window.navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return true;

    return window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
};
