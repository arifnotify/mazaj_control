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
      className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans text-slate-950 transition-all"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="w-full space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white p-5 sm:p-6 shadow-xs border border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Mazaj Control
            </h1>

            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              {isArabic
                ? "لوحة إدارة المنتجات"
                : "Product management dashboard"}
            </p>
          </div>

          <button
            onClick={loadDashboard}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs self-start sm:self-auto"
          >
            ↻ {t("refresh")}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-medium text-rose-700 shadow-xs">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-sm font-medium shadow-xs">
            {t("loading")}
          </div>
        ) : data ? (
          <>
            {/* Main Stats */}
            <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-5">

              {/* Products */}
              <a
                href="/products"
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs transition hover:border-slate-300 hover:shadow-md"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t("products")}
                </p>

                <p className="mt-2 text-3xl sm:text-4xl font-black text-slate-900">
                  {data.products.total}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 border border-emerald-200/60">
                    {data.products.active} {t("active")}
                  </span>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 border border-slate-200/60">
                    {data.products.inactive} {t("inactive")}
                  </span>
                </div>
              </a>

              {/* Categories */}
              <a
                href="/categories"
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs transition hover:border-slate-300 hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("categories")}
                  </p>

                  <p className="mt-2 text-3xl sm:text-4xl font-black text-slate-900">
                    {data.categories.total}
                  </p>
                </div>

                <p className="mt-4 text-xs font-bold text-indigo-600">
                  {isArabic
                    ? "إدارة فئات المنتجات ←"
                    : "Manage product categories →"}
                </p>
              </a>

              {/* Employees */}
              <a
                href="/employees"
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs transition hover:border-slate-300 hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("employees")}
                  </p>

                  <p className="mt-2 text-3xl sm:text-4xl font-black text-slate-900">
                    {data.employees.total}
                  </p>
                </div>

                <p className="mt-4 text-xs font-bold text-indigo-600">
                  {isArabic
                    ? "إدارة الموظفين ←"
                    : "Manage employees →"}
                </p>
              </a>

              {/* Total Issues */}
              <a
                href="/issues"
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs transition hover:border-slate-300 hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {isArabic ? "إجمالي المشاكل" : "Total Issues"}
                  </p>

                  <p className="mt-2 text-3xl sm:text-4xl font-black text-slate-900">
                    {data.issues.total}
                  </p>
                </div>

                <p className="mt-4 text-xs font-bold text-indigo-600">
                  {isArabic
                    ? "عرض جميع المشاكل ←"
                    : "View all issues →"}
                </p>
              </a>

              {/* Open Issues */}
              <a
                href="/issues"
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs transition hover:border-slate-300 hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {isArabic ? "المشاكل المفتوحة" : "Open Issues"}
                  </p>

                  <p className="mt-2 text-3xl sm:text-4xl font-black text-rose-600">
                    {data.issues.open}
                  </p>
                </div>

                <p className="mt-4 text-xs font-bold text-rose-500">
                  {isArabic
                    ? "تحتاج إلى اهتمام"
                    : "Needs attention"}
                </p>
              </a>
            </div>

            {/* Issue Status */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
              <div className="mb-5 border-b border-slate-100 pb-4">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  {isArabic ? "حالة المشاكل" : "Issue Status"}
                </h2>

                <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                  {isArabic
                    ? "التقدم الحالي لمشاكل الأسواق"
                    : "Current marketplace issue progress"}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                {/* Open */}
                <div className="rounded-xl bg-rose-50/70 border border-rose-200/60 p-4 sm:p-5 shadow-xs">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
                    {isArabic ? "مفتوحة" : "Open"}
                  </p>

                  <p className="mt-2 text-2xl sm:text-3xl font-black text-rose-700">
                    {data.issues.open}
                  </p>
                </div>

                {/* In Progress */}
                <div className="rounded-xl bg-amber-50/70 border border-amber-200/60 p-4 sm:p-5 shadow-xs">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    {isArabic ? "قيد التنفيذ" : "In Progress"}
                  </p>

                  <p className="mt-2 text-2xl sm:text-3xl font-black text-amber-700">
                    {data.issues.in_progress}
                  </p>
                </div>

                {/* Fixed */}
                <div className="rounded-xl bg-blue-50/70 border border-blue-200/60 p-4 sm:p-5 shadow-xs">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    {isArabic ? "تم الإصلاح" : "Fixed"}
                  </p>

                  <p className="mt-2 text-2xl sm:text-3xl font-black text-blue-700">
                    {data.issues.fixed}
                  </p>
                </div>

                {/* Verified */}
                <div className="rounded-xl bg-purple-50/70 border border-purple-200/60 p-4 sm:p-5 shadow-xs">
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
                    {isArabic ? "تم التحقق" : "Verified"}
                  </p>

                  <p className="mt-2 text-2xl sm:text-3xl font-black text-purple-700">
                    {data.issues.verified}
                  </p>
                </div>

                {/* Closed */}
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/60 p-4 sm:p-5 shadow-xs">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                    {isArabic ? "مغلقة" : "Closed"}
                  </p>

                  <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-700">
                    {data.issues.closed}
                  </p>
                </div>

              </div>
            </div>

            {/* Marketplace Issues */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
              <div className="mb-5 border-b border-slate-100 pb-4">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  {isArabic
                    ? "مشاكل الأسواق"
                    : "Marketplace Issues"}
                </h2>

                <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                  {isArabic
                    ? "المشاكل المسجلة لكل سوق"
                    : "Issues reported for each marketplace"}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">

                {marketplaces.map((marketplace) => {
                  const count =
                    getMarketplaceIssueCount(marketplace);

                  return (
                    <div
                      key={marketplace}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                          {marketplace}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            count > 0
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-700"
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

                      <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">
                        {count}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500 font-medium">
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
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">
                {isArabic
                  ? "إجراءات سريعة"
                  : "Quick Actions"}
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

                <a
                  href="/products/new"
                  className="rounded-xl bg-slate-900 px-4 py-3.5 text-center text-xs sm:text-sm font-bold text-white hover:bg-slate-800 transition shadow-xs"
                >
                  + {t("addProduct")}
                </a>

                <a
                  href="/categories"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-center text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                >
                  {isArabic
                    ? "إدارة الفئات"
                    : "Manage Categories"}
                </a>

                <a
                  href="/employees"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-4 text-center text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                >
                  {isArabic
                    ? "إدارة الموظفين"
                    : "Manage Employees"}
                </a>

                <a
                  href="/issues"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-center text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                >
                  {isArabic
                    ? "إدارة المشاكل"
                    : "Manage Issues"}
                </a>

                <a
                  href="/products"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-center text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
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