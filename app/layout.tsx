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
      <body className="min-h-screen bg-gray-50">
        <LanguageProvider>
          <Sidebar />

          <main className="min-h-screen ps-64">
            {children}
          </main>
        </LanguageProvider>
      </body>
    </html>
  );
}