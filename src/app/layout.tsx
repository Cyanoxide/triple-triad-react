import type { Metadata } from "next";
import "./globals.css";
import "./styles/font.css";
import { Analytics } from "./analytics";

export const metadata: Metadata = {
  title: "Triple Triad React",
  description: "Authentic Browser-based Triple Triad Game - This is a React and Typescript based project that I built in early 2025 to authentically recreate the Final Fantasy VII version of the Triple Triad minigame, and make it playable in a web browser with all the various functionalities implemented.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" type="image/x-icon" href="https://res.cloudinary.com/dnbsag1cp/image/upload/v1759174757/cardicon_wpjhxn.gif"></link>
        <Analytics />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
