// apps/web/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import SoundToggle from "@/components/SoundToggle";
import { Cinzel, Inter } from "next/font/google";

const display = Cinzel({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AnimaSaga",
  description: "An onchain chronicle of choice. Elyndra remembers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="bg-black text-zinc-100 antialiased">
        <Providers>
          <SoundToggle />
          {children}
        </Providers>
      </body>
    </html>
  );
}
