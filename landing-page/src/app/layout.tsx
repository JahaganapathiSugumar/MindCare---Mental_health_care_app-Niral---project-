import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MindCare | AI-Powered Mental Wellness Companion",
  description: "A calm, intelligent AI companion that helps users improve emotional wellbeing through personalized conversations, mood insights, guided breathing, and daily wellness reports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/30">{children}</body>
    </html>
  );
}
