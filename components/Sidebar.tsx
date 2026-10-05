"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: "▣",
  },
  {
    name: "Products",
    href: "/products",
    icon: "□",
  },
  {
    name: "Issues",
    href: "/issues",
    icon: "⚠",
  },
  {
    name: "Categories",
    href: "/categories",
    icon: "▤",
  },
  {
    name: "Employees",
    href: "/employees",
    icon: "♙",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r bg-white">
      
      {/* Logo */}
      <div className="border-b px-6 py-6">
        <h1 className="text-xl font-bold tracking-wide text-gray-900">
          MAZAJ CONTROL
        </h1>

        <p className="mt-1 text-xs text-gray-500">
          Product Management
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

              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t p-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-700">
            MAZAJ CONTROL
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Admin Panel
          </p>
        </div>
      </div>
    </aside>
  );
}