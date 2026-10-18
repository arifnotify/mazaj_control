"use client";

import { useLanguage } from "@/app/components/LanguageProvider";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <aside
      className={`flex h-screen w-64 shrink-0 flex-col border-slate-200 bg-white sticky top-0 shadow-sm ${
        isArabic ? "border-l" : "border-r"
      }`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Logo / Header */}
      <div className="border-b border-slate-200 px-6 py-5">
        <Link href="/" className="block">
          <h1 className="text-lg font-black tracking-wide text-slate-900">
            MAZAJ CONTROL
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 font-medium">
            {isArabic ? "إدارة المنتجات" : "Product Management"}
          </p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
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
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                active
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="w-5 shrink-0 text-center text-base">
                {item.icon}
              </span>
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Language Section */}
      <div className="border-t border-slate-200 p-4 bg-slate-50/50">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          {t("language")}
        </p>
        <LanguageSwitcher />
      </div>

      {/* Bottom Admin Info */}
      <div className="border-t border-slate-200 p-4">
        <div className="rounded-xl bg-slate-100/70 p-3.5 border border-slate-200/60">
          <p className="text-xs font-bold text-slate-800">
            MAZAJ CONTROL
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 font-medium">
            {language === "ar" ? "لوحة الإدارة" : "Admin Panel"}
          </p>
        </div>
      </div>
    </aside>
  );
}