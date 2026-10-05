import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { AppProvider } from "@/components/store";
import { Navbar } from "@/components/navigation";
import "./globals.css";
const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "SLAForge — Performance is the promise.",
    template: "%s | SLAForge",
  },
  description:
    "Pay for digital services based on performance. Explore USDC agreements, provider bonds, SLA monitoring, and settlement in the SLAForge frontend demo for Arc.",
  icons: { icon: "data:," },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}>
      <body>
        <AppProvider>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <Navbar />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
