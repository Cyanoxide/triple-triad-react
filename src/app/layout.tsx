import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./styles/font.css";
import { Analytics } from "./analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Triple Triad React",
  /*
    * The manifest is a plain file in `public/`, not `app/manifest.ts`.
    *
    * The file convention generates a route, and `output: export` has to
    * pre-render it — one more thing to go wrong in the export for a document
    * that is nine static lines. In `public/` it is copied verbatim by every
    * build, static or not, and the PHP host serves it as-is.
    */
  manifest: "/manifest.json",
  /*
    * iOS reads none of the manifest's display settings. `standalone` there
    * comes from `apple-mobile-web-app-capable`, the title from
    * `apple-mobile-web-app-title`, and the home screen icon from
    * `apple-touch-icon` — the manifest's `icons` array is ignored.
    *
    * **`black-translucent`, so there is no status bar strip to paint.**
    *
    * `black` and `default` both make iOS *reserve* a strip above the page and
    * fill it itself, and in portrait it filled it white — the bar over the
    * clock and the island. Translucent reserves nothing: the page runs the
    * full height of the screen and the status bar is drawn over it, so what
    * shows behind the clock is the page's own ground rather than a colour iOS
    * chose. Landscape never showed it because there is no strip in landscape.
    *
    * This was avoided earlier for a reason that has since been dealt with:
    * translucent puts the page under the clock, and nothing had safe-area
    * padding. The corner furniture now does. The board cannot reach it either
    * — measured at 390x844, the portrait canvas leaves 190px of slack above
    * itself against an island of about 59px, and landscape fills the height
    * but has 148px of horizontal slack against 44px side insets.
    */
  appleWebApp: {
    capable: true,
    title: "Triple Triad React",
    statusBarStyle: "black-translucent",
  },
  /*
    * Only `apple`. Not `icon`, and not `shortcut`.
    *
    * `rel="apple-touch-icon"` does not compete with `rel="icon"` — different
    * rel, different purpose — so the hand-written `cardicon.gif` link below
    * still wins the tab. Adding an `icon` entry here would put a second
    * `rel="icon"` candidate in the head, and browsers pick the best candidate
    * rather than the first: exactly how `favicon.ico` used to beat the GIF.
    *
    * iOS does auto-discover `/apple-touch-icon.png` at the root without being
    * told, so this is belt and braces — but the discovery is a fallback that
    * costs a failed request when it is absent, and declaring it is free.
    */
  icons: {
    apple: "/icons/180.png",
  },
};

/**
 * One viewport tag, declared here rather than by hand in the head.
 *
 * There used to be a hand-written `<meta name="viewport">` *and* the one Next
 * emits by default, in that order — two tags, with the engine left to merge
 * them. WebKit merges per property, so nothing was actually being lost, but
 * the outcome depended on behaviour no spec pins down and the second tag was
 * invisible in the source. Declaring the export means Next emits exactly one.
 *
 * An earlier comment here claimed Next could not express `minimum-scale`. It
 * can: `minimumScale`, `maximumScale`, `userScalable` and `viewportFit` are
 * all on the `Viewport` type. That was the only reason the tag was hand-rolled.
 *
 * `viewportFit: "cover"` matters only once the app is installed. In a browser
 * tab iOS lays the page out across the whole viewport and this changes
 * nothing. In **standalone** it does: without it iOS insets the layout
 * viewport out of the safe areas and paints what is left over itself, which is
 * the bar around the edges. `cover` leaves no such region.
 *
 * It pairs with `black-translucent` in the metadata below: `cover` removes the
 * inset, translucent removes the reserved strip, and between them the page
 * owns the whole screen. Neither is much use without the other.
 *
 * `themeColor` is `#434546`, the dark end of the dialogs' own gradient
 * (`linear-gradient(125deg, #434546, #696c69)`), so the browser's chrome
 * matches the menus. It was the card back's `#161418`, and before that Safari
 * was tinting itself off the page's tan ground, which looks wrong without the
 * texture that normally sits on it — the colour reads as parchment only in
 * company.
 *
 * The manifest keeps `#161418` for `background_color`: that is the splash
 * screen behind the icon while the app starts, and it should match the icon's
 * own ground rather than the browser chrome.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#434546",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes"></meta>
        {/*
          * The card back, fetched up front.
          *
          * It is a CSS background on `.card::before`, so nothing asks for it
          * until a card is first drawn — and the opponent's placeholder hand is
          * drawn the moment card selection opens. Until the image arrives those
          * five cards are just the bare `[data-player=red]` gradient, which is
          * a flash of flat pink. Preloading it means it is already in hand.
          */}
        <link rel="preload" as="image" href="/assets/cardback.png"></link>
        {/*
          * The reward screen's backdrop, warmed early so the screen does not
          * assemble itself in front of you.
          *
          * **At low priority.** It is 476KB and nothing needs it until a game
          * has been played all the way through, so it must not compete with
          * first paint on a phone — but it is a `preload` rather than a
          * `prefetch`, because Safari's support for prefetch has been patchy
          * and a warmed cache is the whole point. Where `fetchpriority` is not
          * understood this is simply an ordinary preload.
          *
          * `bg.png` sits behind it in the same stack and needs no help: the
          * page texture already uses it from the first frame.
          */}
        <link rel="preload" as="image" href="/assets/bg-accent.png" fetchPriority="low"></link>
        {/*
          * The animated card icon, and the only icon link on the page.
          *
          * There used to be a `src/app/favicon.ico` beside this file — the one
          * Next starts a project with. That is a *file convention*: its mere
          * presence makes Next emit its own `<link rel="icon" href="/favicon.ico"
          * sizes="16x16">` after this one and serve it at the root. Browsers
          * pick the best candidate rather than the first, and a declared 16x16
          * is the better match for a tab, so the default icon won every time in
          * a build. Deleting the file is the fix; there is no way to turn the
          * convention off.
          *
          * `image/gif`, not `image/x-icon`: it is a GIF, and the type is a hint
          * browsers are entitled to believe. `sizes="any"` says it scales,
          * which is what stops a 16x16 candidate outranking it again.
          *
          * **Only Firefox animates a favicon.** Chrome and Safari have not for
          * years and show the first frame, which is a perfectly good still.
          */}
        <link rel="icon" type="image/gif" sizes="any" href="/assets/cardicon.gif"></link>
        <Analytics />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
