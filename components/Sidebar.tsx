
"use client";

import { useLanguage } from "@/app/components/LanguageProvider";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menuItems = [
  {
    key: "dashboard",
    labelEn: "Dashboard",
    labelAr: "لوحة التحكم",
    href: "/",
    icon: "▣",
  },
  {
    key: "products",
    labelEn: "Products",
    labelAr: "المنتجات",
    href: "/products",
    icon: "🛍️",
  },
  {
    key: "stockReceiving",
    labelEn: "Stock Receiving",
    labelAr: "استلام المخزون",
    href: "/stock-receiving",
    icon: "📥",
  },
  {
    key: "stockArrivals",
    labelEn: "Stock Arrivals",
    labelAr: "وصول المخزون",
    href: "/stock-arrivals",
    icon: "📦📣",
  },
  {
    key: "purchaseCenter",
    labelEn: "Purchase Center",
    labelAr: "مركز المشتريات",
    href: "/purchase-center",
    icon: "🛒",
  },
  {
    key: "productPerformance",
    labelEn: "Product Performance",
    labelAr: "أداء المنتجات",
    href: "/product-performance",
    icon: "📊",
  },
  {
    key: "customerCRM",
    labelEn: "Customer Intelligence CRM",
    labelAr: "إدارة علاقات العملاء",
    href: "/customers",
    icon: "👥",
  },
  {
    key: "issues",
    labelEn: "Issues",
    labelAr: "المشاكل",
    href: "/issues",
    icon: "⚠️",
  },
  {
    key: "categories",
    labelEn: "Categories",
    labelAr: "الفئات",
    href: "/categories",
    icon: "▤",
  },
  {
    key: "employees",
    labelEn: "Employees",
    labelAr: "الموظفون",
    href: "/admin/employees",
    icon: "👩🏽‍🍳",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { language, isArabic } = useLanguage();
  const [isMinimized, setIsMinimized] = useState(false);

  const text = {
    language: isArabic ? "اللغة" : "Language",
    productManagement: isArabic
      ? "إدارة المنتجات"
      : "Product Management",
    adminPanel: isArabic ? "لوحة الإدارة" : "Admin Panel",
    expand: isArabic ? "توسيع القائمة" : "Expand Sidebar",
    minimize: isArabic ? "تصغير القائمة" : "Minimize Sidebar",
  };

  return (
    <aside
      className={`sticky top-0 z-50 flex h-screen shrink-0 flex-col border-slate-200 bg-white shadow-sm transition-all duration-300 ease-in-out ${
        isArabic ? "border-l" : "border-r"
      } ${isMinimized ? "w-20" : "w-64"}`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-5">
        {!isMinimized && (
          <Link href="/" className="block min-w-0 overflow-hidden">
            <h1
              className="truncate text-base font-black tracking-wide text-slate-900"
              dir="ltr"
            >
              MAZAJ CONTROL
            </h1>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
              {text.productManagement}
            </p>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setIsMinimized((previous) => !previous)}
          aria-label={isMinimized ? text.expand : text.minimize}
          title={isMinimized ? text.expand : text.minimize}
          className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition hover:bg-slate-100"
        >
          <span className="text-sm font-bold">
            {isMinimized
              ? isArabic ? "◀" : "▶"
              : isArabic ? "▶" : "◀"}
          </span>
        </button>
      </div>

      <nav
        className="flex-1 space-y-1.5 overflow-y-auto p-3"
        aria-label={isArabic ? "القائمة الرئيسية" : "Main navigation"}
      >
        {menuItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

          const label = isArabic ? item.labelAr : item.labelEn;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={isMinimized ? label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition-all ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              } ${isMinimized ? "justify-center" : ""}`}
            >
              <span className="w-5 shrink-0 text-center text-base">
                {item.icon}
              </span>

              {!isMinimized && (
                <span className="truncate">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {!isMinimized && (
        <div className="border-t border-slate-200 bg-slate-50/50 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            {text.language}
          </p>
          <LanguageSwitcher />
        </div>
      )}

      {!isMinimized && (
        <div className="border-t border-slate-200 p-3">
          <div className="rounded-xl border border-slate-200/60 bg-slate-100/70 p-3">
            <p
              className="truncate text-xs font-bold text-slate-800"
              dir="ltr"
            >
              MAZAJ CONTROL
            </p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
              {text.adminPanel}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
