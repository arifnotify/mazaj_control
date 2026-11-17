import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

import { LanguageProvider } from "./components/LanguageProvider";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Mazaj Nuts | Premium Nuts & Dry Fruits in Qatar",
  description: "Discover premium nuts, dates and dry fruits at Mazaj Nuts Qatar.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";
  const isCustomerDomain = host === "mazajnuts.com" || host === "www.mazajnuts.com";

  if (isCustomerDomain) {
    return <html lang="en" dir="ltr"><body className="min-h-screen bg-[#fbfaf6] font-sans antialiased">{children}</body></html>;
  }

  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        <LanguageProvider>
          <div className="flex min-h-screen w-full">
            <Sidebar />
            <div className="min-w-0 flex-1 bg-slate-50"><main className="min-h-screen w-full">{children}</main></div>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
