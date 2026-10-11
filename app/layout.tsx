import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { Toaster } from "@/components/Toast";
import { isAdmin, passcodeEnabled } from "@/lib/auth";
import { libraryCount } from "@/lib/repo";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Research Pulse",
  description: "From research to real insights — a weekly AI-research brief, ranked and summarised by topic.",
  icons: { icon: "/rp-mark.png", apple: "/rp-mark.png" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const testMode = process.env.TEST_MODE === "true";
  const [count, admin] = await Promise.all([libraryCount().catch(() => 0), isAdmin()]);
  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-white/88 backdrop-blur-md">
          <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-4 gap-y-1 py-2.5" style={{ paddingInline: "clamp(16px,4vw,40px)" }}>
            <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Research Pulse home">
              <Image src="/rp-mark.png" alt="" width={34} height={34} priority />
              <span className="font-display text-[18px] font-extrabold tracking-[-0.01em]">
                <span className="text-logo-ink">Research</span> <span className="text-logo-blue">Pulse</span>
              </span>
            </Link>
            {testMode && <span className="pill bg-amber/14 text-[11px] text-amber-ink">TEST</span>}
            <div className="ml-auto flex min-w-0 max-sm:ml-0 max-sm:w-full">
              <NavLinks libraryCount={count} showUnlock={passcodeEnabled() && !admin} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-content flex-1" style={{ padding: "clamp(20px,4vw,40px) clamp(16px,4vw,40px)" }}>
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
