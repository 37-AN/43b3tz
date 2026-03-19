import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "43V3R BET AI - AI-Powered Betting Intelligence",
  description: "AI-powered sports betting platform with value bet detection, tipster marketplace, and intelligent predictions. Find mispriced odds and beat the bookmakers.",
  keywords: ["sports betting", "AI predictions", "value bets", "tipster", "football", "soccer", "betting intelligence"],
  authors: [{ name: "43V3R BET AI Team" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>",
  },
  openGraph: {
    title: "43V3R BET AI - AI-Powered Betting Intelligence",
    description: "Find value bets with AI. Beat the bookmakers with our intelligent prediction system.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "43V3R BET AI",
    description: "AI-powered sports betting intelligence platform",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
