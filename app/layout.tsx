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
          {/* মূল ফ্লেক্স কন্টেইনার - কোনো বাড়তি ফাঁকা জায়গা রাখবে না */}
          <div className="flex min-h-screen w-full">
            {/* সাইডবার */}
            <Sidebar />

            {/* মূল ড্যাশবোর্ড কনটেন্ট এলাকা */}
            <div className="flex-1 min-w-0 bg-slate-50">
              <main className="min-h-screen w-full">
                {children}
              </main>
            </div>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}