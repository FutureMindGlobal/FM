import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "futuremindglobal.org";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    title: "Future Mind Global | Think Beyond Borders",
    description: "A global learning, assessment, and recognition platform for the human capabilities that shape the future.",
    icons: { icon: "/logo.jpg" },
    openGraph: { title: "Think Beyond Borders. Lead What Comes Next.", description: "Build the human capabilities that shape the future.", type: "website", images: [{ url: `${origin}/og.png`, width: 1734, height: 907, alt: "Future Mind Global" }] },
    twitter: { card: "summary_large_image", title: "Future Mind Global", description: "Think beyond borders. Lead what comes next.", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geist.variable} ${mono.variable}`}>{children}</body></html>;
}
