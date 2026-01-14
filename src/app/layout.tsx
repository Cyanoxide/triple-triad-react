import type { Metadata } from "next";
import "./globals.css";
import "./styles/font.css";

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
        <meta name="viewport" content="width=device-width, initial-scale=1"></meta>
        <link rel="icon" type="image/x-icon" href="/assets/cardicon.gif"></link>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
