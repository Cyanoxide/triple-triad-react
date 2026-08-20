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
    * `black` status bar, not `black-translucent`: translucent draws the page
    * *under* the clock and battery, and this layout is scaled to
    * `documentElement.clientHeight` with no safe-area padding anywhere. The
    * top of the board would go under the status bar on a notched phone.
    */
  appleWebApp: {
    capable: true,
    title: "Triad",
    statusBarStyle: "black",
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
    apple: "/apple-touch-icon.png",
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
 * The status bar stays `black`, not `black-translucent`, so the web view still
 * begins below the clock and nothing yet needs `env(safe-area-inset-*)`
 * padding. Translucent is what would push the board under the status bar.
 *
 * `themeColor` is the card back's own dark, sampled from `cardback.png` — the
 * same value the manifest gives `theme_color` and `background_color`, so the
 * splash screen, the status bar and the icon ground are one colour.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#161418",
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
