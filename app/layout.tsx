import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "../src/providers/AppProviders";

export const metadata: Metadata = {
  title: "FinBoard - Finance Dashboard",
  description:
    "Customizable finance dashboard with real-time data visualization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
