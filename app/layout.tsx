import type { Metadata } from "next";
import "./globals.css";

import { LanguageProvider } from "./components/LanguageProvider";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Mazaj Control",
  description: "Mazaj Product Management Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        <LanguageProvider>
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area - সাইডবারের চওড়া (64) অনুযায়ী প্যাディング বা মার্জিন সেট করা */}
            <div className="flex-1 min-w-0 lg:ps-64">
              <main className="min-h-screen">
                {children}
              </main>
            </div>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}