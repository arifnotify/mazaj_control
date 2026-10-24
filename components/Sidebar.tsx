"use client";

import { useLanguage } from "@/app/components/LanguageProvider";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { key: "dashboard", href: "/", icon: "▣" },
  { key: "products", href: "/products", icon: "□" },
  { key: "stockReceiving", href: "/stock-receiving", icon: "📥" },
  { key: "stockArrivals", href: "/stock-arrivals", icon: "📦" },
  { key: "purchaseCenter", href: "/purchase-center", icon: "🛒" },
  { key: "productPerformance", href: "/product-performance", icon: "📊" },
  { key: "issues", href: "/issues", icon: "⚠" },
  { key: "categories", href: "/categories", icon: "▤" },
  { key: "employees", href: "/admin/employees", icon: "♙" },
];

export default function Sidebar() {
  const { isArabic, t } = useLanguage();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const labelFor = (key: string) => {
    if (key === "productPerformance") {
      return isArabic ? "أداء المنتجات" : "Product Performance";
    }
    return t(key);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={isArabic ? "فتح القائمة" : "Toggle navigation"}
        aria-expanded={mobileOpen}
        className="fixed left-4 top-4 z-50 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 shadow md:hidden"
      >
        {mobileOpen ? "✕" : "☰"}
      </button>

      {mobileOpen && (
        <button
          type="button"
          aria-label={isArabic ? "إغلاق القائمة" : "Close navigation"}
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
        />
      )}

      <aside
        dir={isArabic ? "rtl" : "ltr"}
        className={`fixed inset-y-0 z-40 flex w-72 flex-col bg-slate-950 text-white shadow-xl transition-transform duration-200 md:translate-x-0 ${
          isArabic ? "right-0" : "left-0"
        } ${
          mobileOpen
            ? "translate-x-0"
            : isArabic
              ? "translate-x-full md:translate-x-0"
              : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="border-b border-white/10 px-5 py-6">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="block text-lg font-black tracking-wide text-white"
          >
            MAZAJ CONTROL
          </Link>
          <p className="mt-1 text-xs text-slate-400">
            {isArabic ? "نظام إدارة المنتجات" : "Product Management System"}
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {menuItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-indigo-500 text-white shadow"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center text-lg" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{labelFor(item.key)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <LanguageSwitcher />
        </div>
      </aside>

      {/* Add md:ml-72 to your main content wrapper (or md:mr-72 in Arabic layouts)
          if your root layout does not already reserve space for the sidebar. */}
    </>
  );
}
