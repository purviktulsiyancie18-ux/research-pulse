import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Research Pulse",
  description: "Weekly AI-research brief — arXiv papers that matter, ranked and summarised by domain.",
};

const NAV = [
  { href: "/", label: "Brief" },
  { href: "/briefs", label: "Archive" },
  { href: "/library", label: "Library" },
  { href: "/runs", label: "Runs" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  const testMode = process.env.TEST_MODE === "true";
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="no-print sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-2.5">
            <Link href="/" className="flex items-center gap-2 font-bold text-brand">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand" />
              Research Pulse
            </Link>
            {testMode && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-800">TEST</span>
            )}
            <nav className="ml-auto flex gap-1 overflow-x-auto text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-md px-2.5 py-1 text-muted hover:bg-brand-soft hover:text-brand">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        <footer className="no-print border-t border-line py-4 text-center text-xs text-muted">
          Research Pulse · arXiv + Semantic Scholar + Hugging Face · summaries by Gemini Flash · brief goes to Kavita only
        </footer>
      </body>
    </html>
  );
}
