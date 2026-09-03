import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eboi Lyric Studio",
  description: "Original melodic Christian trap lyric generator for Eboi",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
