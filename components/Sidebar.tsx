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
  { key: "issues", href: "/issues", icon: "⚠" },
  { key: "categories", href: "/categories", icon: "▤" },
  { key: "employees", href: "/admin/employees", icon: "♙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { language, isArabic, t } = useLanguage();
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <aside
      className={`sticky top-0 z-50 flex h-screen shrink-0 flex-col border-slate-200 bg-white transition-all duration-300 ease-in-out shadow-sm ${
        isArabic ? "border-l" : "border-r"
      } ${isMinimized ? "w-20" : "w-64"}`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Logo / Header & Minimize Toggle Button */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-5">
        {!isMinimized && (
          <Link href="/" className="block overflow-hidden">
            <h1 className="text-base font-black tracking-wide text-slate-900 truncate">
              MAZAJ CONTROL
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500 font-medium truncate">
              {isArabic ? "إدارة المنتجات" : "Product Management"}
            </p>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setIsMinimized(!isMinimized)}
          aria-label="Toggle Minimize Sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition shadow-2xs mx-auto"
          title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
        >
          <span className="text-sm font-bold">
            {isMinimized ? (isArabic ? "◀" : "▶") : (isArabic ? "▶" : "◀")}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {menuItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={isMinimized ? t(item.key) : undefined}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition-all ${
                active
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              } ${isMinimized ? "justify-center" : ""}`}
            >
              <span className="shrink-0 text-base text-center w-5">
                {item.icon}
              </span>
              {!isMinimized && <span className="truncate">{t(item.key)}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Language Section (Hidden when minimized) */}
      {!isMinimized && (
        <div className="border-t border-slate-200 p-3 bg-slate-50/50">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            {t("language")}
          </p>
          <LanguageSwitcher />
        </div>
      )}

      {/* Bottom Admin Info (Hidden when minimized) */}
      {!isMinimized && (
        <div className="border-t border-slate-200 p-3">
          <div className="rounded-xl bg-slate-100/70 p-3 border border-slate-200/60">
            <p className="text-xs font-bold text-slate-800 truncate">
              MAZAJ CONTROL
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 font-medium truncate">
              {language === "ar" ? "لوحة الإدارة" : "Admin Panel"}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}