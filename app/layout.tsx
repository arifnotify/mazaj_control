import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Mazaj Control",
  description: "Mazaj Product Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <Sidebar />

        <main className="ml-64 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}