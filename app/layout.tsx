import type { Metadata } from "next";
import { Geist, Noto_Sans_Gujarati } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const notoGujarati = Noto_Sans_Gujarati({
  variable: "--font-gujarati",
  subsets: ["gujarati"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "EcoLearn", template: "%s · EcoLearn" },
  description: "Learn economics in Gujarati and English — news, current affairs, Indian economy data and study resources.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="gu" className={`${geistSans.variable} ${notoGujarati.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
