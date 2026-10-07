"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./components/LanguageProvider";

type DashboardData = {
  products: {
    total: number;
    active: number;
    inactive: number;
  };

  categories: {
    total: number;
  };

  employees: {
    total: number;
  };

  issues: {
    total: number;
    open: number;
    in_progress: number;
    fixed: number;
    verified: number;
    closed: number;
  };

  marketplaceIssues: {
    _id: string;
    count: number;
  }[];
};

const marketplaces = [
  "Talabat",
  "Snoonu",
  "Rafeeq",
  "Keeta",
];

export default function DashboardPage() {
  const { isArabic, t } = useLanguage();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/dashboard");

      if (!response.ok) {
        throw new Error("Failed to load dashboard");
      }

      const result = await response.json();

      setData(result);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Dashboard load করা যায়নি"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function getMarketplaceIssueCount(marketplace: string) {
    return (
      data?.marketplaceIssues.find(
        (item) => item._id === marketplace
      )?.count || 0
    );
  }

  return (
    <main
      className="min-h-screen bg-gray-50 p-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Mazaj Control
            </h1>

            <p className="mt-2 text-gray-500">
              {isArabic
                ? "لوحة إدارة المنتجات"
                : "Product management dashboard"}
            </p>
          </div>

          <button
            onClick={loadDashboard}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            {t("refresh")}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-red-600">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
            {t("loading")}
          </div>
        ) : data ? (
          <>
            {/* Main Stats */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">

              {/* Products */}
              <a
                href="/products"
                className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <p className="text-sm font-medium text-gray-500">
                  {t("products")}
                </p>

                <p className="mt-3 text-4xl font-bold text-gray-900">
                  {data.products.total}
                </p>

                <div className="mt-4 flex gap-3 text-xs">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
                    {data.products.active} {t("active")}
                  </span>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
                    {data.products.inactive} {t("inactive")}
                  </span>
                </div>
              </a>

              {/* Categories */}
              <a
                href="/categories"
                className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <p className="text-sm font-medium text-gray-500">
                  {t("categories")}
                </p>

                <p className="mt-3 text-4xl font-bold text-gray-900">
                  {data.categories.total}
                </p>

                <p className="mt-4 text-sm text-gray-500">
                  {isArabic
                    ? "إدارة فئات المنتجات ←"
                    : "Manage product categories →"}
                </p>
              </a>

              {/* Employees */}
              <a
                href="/employees"
                className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <p className="text-sm font-medium text-gray-500">
                  {t("employees")}
                </p>

                <p className="mt-3 text-4xl font-bold text-gray-900">
                  {data.employees.total}
                </p>

                <p className="mt-4 text-sm text-gray-500">
                  {isArabic
                    ? "إدارة الموظفين ←"
                    : "Manage employees →"}
                </p>
              </a>

              {/* Total Issues */}
              <a
                href="/issues"
                className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <p className="text-sm font-medium text-gray-500">
                  {isArabic ? "إجمالي المشاكل" : "Total Issues"}
                </p>

                <p className="mt-3 text-4xl font-bold text-gray-900">
                  {data.issues.total}
                </p>

                <p className="mt-4 text-sm text-gray-500">
                  {isArabic
                    ? "عرض جميع المشاكل ←"
                    : "View all issues →"}
                </p>
              </a>

              {/* Open Issues */}
              <a
                href="/issues"
                className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <p className="text-sm font-medium text-gray-500">
                  {isArabic ? "المشاكل المفتوحة" : "Open Issues"}
                </p>

                <p className="mt-3 text-4xl font-bold text-red-600">
                  {data.issues.open}
                </p>

                <p className="mt-4 text-sm text-red-500">
                  {isArabic
                    ? "تحتاج إلى اهتمام"
                    : "Needs attention"}
                </p>
              </a>
            </div>

            {/* Issue Status */}
            <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {isArabic ? "حالة المشاكل" : "Issue Status"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {isArabic
                    ? "التقدم الحالي لمشاكل الأسواق"
                    : "Current marketplace issue progress"}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                {/* Open */}
                <div className="rounded-lg bg-red-50 p-5">
                  <p className="text-sm text-red-600">
                    {isArabic ? "مفتوحة" : "Open"}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-red-700">
                    {data.issues.open}
                  </p>
                </div>

                {/* In Progress */}
                <div className="rounded-lg bg-yellow-50 p-5">
                  <p className="text-sm text-yellow-600">
                    {isArabic ? "قيد التنفيذ" : "In Progress"}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-yellow-700">
                    {data.issues.in_progress}
                  </p>
                </div>

                {/* Fixed */}
                <div className="rounded-lg bg-blue-50 p-5">
                  <p className="text-sm text-blue-600">
                    {isArabic ? "تم الإصلاح" : "Fixed"}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-blue-700">
                    {data.issues.fixed}
                  </p>
                </div>

                {/* Verified */}
                <div className="rounded-lg bg-purple-50 p-5">
                  <p className="text-sm text-purple-600">
                    {isArabic ? "تم التحقق" : "Verified"}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-purple-700">
                    {data.issues.verified}
                  </p>
                </div>

                {/* Closed */}
                <div className="rounded-lg bg-green-50 p-5">
                  <p className="text-sm text-green-600">
                    {isArabic ? "مغلقة" : "Closed"}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-green-700">
                    {data.issues.closed}
                  </p>
                </div>

              </div>
            </div>

            {/* Marketplace Issues */}
            <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {isArabic
                    ? "مشاكل الأسواق"
                    : "Marketplace Issues"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {isArabic
                    ? "المشاكل المسجلة لكل سوق"
                    : "Issues reported for each marketplace"}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-4">

                {marketplaces.map((marketplace) => {
                  const count =
                    getMarketplaceIssueCount(marketplace);

                  return (
                    <div
                      key={marketplace}
                      className="rounded-xl border p-5"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">
                          {marketplace}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            count > 0
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {count > 0
                            ? isArabic
                              ? "مشاكل"
                              : "Issues"
                            : isArabic
                              ? "سليم"
                              : "Healthy"}
                        </span>
                      </div>

                      <p className="mt-4 text-3xl font-bold text-gray-900">
                        {count}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {count === 1
                          ? isArabic
                            ? "مشكلة"
                            : "issue"
                          : isArabic
                            ? "مشاكل"
                            : "issues"}
                      </p>
                    </div>
                  );
                })}

              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">
                {isArabic
                  ? "إجراءات سريعة"
                  : "Quick Actions"}
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                <a
                  href="/products/new"
                  className="rounded-lg bg-black px-5 py-4 text-center font-medium text-white hover:bg-gray-800"
                >
                  + {t("addProduct")}
                </a>

                <a
                  href="/categories"
                  className="rounded-lg border px-5 py-4 text-center font-medium hover:bg-gray-50"
                >
                  {isArabic
                    ? "إدارة الفئات"
                    : "Manage Categories"}
                </a>

                <a
                  href="/employees"
                  className="rounded-lg border px-5 py-4 text-center font-medium hover:bg-gray-50"
                >
                  {isArabic
                    ? "إدارة الموظفين"
                    : "Manage Employees"}
                </a>

                <a
                  href="/issues"
                  className="rounded-lg border px-5 py-4 text-center font-medium hover:bg-gray-50"
                >
                  {isArabic
                    ? "إدارة المشاكل"
                    : "Manage Issues"}
                </a>

                <a
                  href="/products"
                  className="rounded-lg border px-5 py-4 text-center font-medium hover:bg-gray-50"
                >
                  {isArabic
                    ? "পণ্য দেখুন"
                    : "View Products"}
                </a>

              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}