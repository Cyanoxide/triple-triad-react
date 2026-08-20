import type { Metadata } from "next";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no"></meta>
        {/*
          * Written by hand, not via the `viewport` export.
          *
          * Next 15 wants `themeColor` in an exported `viewport` object — but
          * that export also owns the viewport meta above, and this one is
          * hand-tuned (`maximum-scale`, `user-scalable=no`). Declaring the
          * export to add one colour would mean handing Next the tag it is
          * generated from, and it does not emit `minimum-scale` at all.
          *
          * `#161418` is the card back's own dark, sampled from
          * `cardback.png` — the same value the manifest uses for
          * `theme_color` and `background_color`, so the splash screen, the
          * status bar and the icon ground are one colour.
          */}
        <meta name="theme-color" content="#161418"></meta>
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
