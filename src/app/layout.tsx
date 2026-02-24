import type { Metadata } from "next";
import { Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AnkhCursor } from "@/components/ui/AnkhCursor";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "137 Studio",
  description: "See the pattern. Feel the frequency. Open the door. Fine art, sacred geometry, and digital experiences by 137 Studio.",
  openGraph: {
    title: "137 Studio",
    description: "See the pattern. Feel the frequency. Open the door.",
    images: ["/og-image.jpg"],
    url: "https://the37thmove.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${jetbrains.variable} antialiased bg-[#0a0a0a] text-[#ededed]`}>
        <AnkhCursor />
        {children}
      </body>
    </html>
  );
}
