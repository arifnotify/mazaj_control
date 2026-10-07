"use client";

import { useLanguage } from "@/app/components/LanguageProvider";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  {
    key: "dashboard",
    href: "/",
    icon: "▣",
  },
  {
    key: "products",
    href: "/products",
    icon: "□",
  },
  {
    key: "issues",
    href: "/issues",
    icon: "⚠",
  },
  {
    key: "categories",
    href: "/categories",
    icon: "▤",
  },
  {
    key: "employees",
    href: "/employees",
    icon: "♙",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { language, isArabic, t } = useLanguage();

  return (
    <aside
      className={`fixed top-0 z-50 flex h-screen w-64 flex-col border-gray-200 bg-white ${
        isArabic
          ? "right-0 border-l"
          : "left-0 border-r"
      }`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Logo */}
      <div className="border-b border-gray-200 px-6 py-6">
        <h1 className="text-xl font-bold tracking-wide text-gray-900">
          MAZAJ CONTROL
        </h1>

        <p className="mt-1 text-xs text-gray-500">
          {isArabic
            ? "إدارة المنتجات"
            : "Product Management"}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4">
        {menuItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="w-5 text-center text-base">
                {item.icon}
              </span>

              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Language */}
      <div className="border-t border-gray-200 p-4">
        <p className="mb-2 text-xs font-medium text-gray-500">
          {t("language")}
        </p>

        <LanguageSwitcher />
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-200 p-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-700">
            MAZAJ CONTROL
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {language === "ar"
              ? "لوحة الإدارة"
              : "Admin Panel"}
          </p>
        </div>
      </div>
    </aside>
  );
}