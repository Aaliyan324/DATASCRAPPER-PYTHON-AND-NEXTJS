import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aether AI — Pakistan Business Data Discovery",
  description: "AI-powered business data extraction engine for Pakistan. Search any city, category, and location with natural language.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#9333ea",
          colorBackground: "#0f1117",
          colorNeutral: "#1e2330",
          borderRadius: "0.75rem",
          fontFamily: "var(--font-geist-sans), sans-serif",
        },
        elements: {
          card: "bg-[#161922] border border-slate-800 shadow-2xl",
          headerTitle: "text-slate-100",
          headerSubtitle: "text-slate-400",
          socialButtonsBlockButton: "border-slate-700 bg-[#1e2330] text-slate-200 hover:bg-slate-800",
          formButtonPrimary: "bg-purple-600 hover:bg-purple-500",
          footerActionLink: "text-purple-400 hover:text-purple-300",
          userButtonAvatarBox: "ring-2 ring-purple-500/40",
          userButtonPopoverCard: "bg-[#161922] border border-slate-800",
          userButtonPopoverActionButton: "text-slate-200 hover:bg-slate-800",
          userButtonPopoverActionButtonText: "text-slate-200",
          userButtonPopoverFooter: "border-t border-slate-800",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col" suppressHydrationWarning>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
