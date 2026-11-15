import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

const app = Instrument_Sans({ variable: "--font-app", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Daybrief",
  description: "A daily plan built from your inbox and where your attention went.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${app.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
