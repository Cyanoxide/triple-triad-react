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
