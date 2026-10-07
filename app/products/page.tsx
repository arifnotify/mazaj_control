"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "../components/LanguageProvider";

type Product = {
  _id: string;
  sku: string;

  nameEn: string;
  nameAr: string;

  descriptionEn?: string;
  descriptionAr?: string;

  image: string;

  categoryEn: string;
  categoryAr: string;

  price: number;
  stock: number;
  active: boolean;

  createdAt?: string;
};

type FilterStatus = "all" | "active" | "inactive";

export default function ProductsPage() {
  const { language, isArabic, t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<FilterStatus>("all");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/products");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load products"
        );
      }

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load products"
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.sku?.toLowerCase().includes(query) ||
        product.nameEn?.toLowerCase().includes(query) ||
        product.nameAr?.toLowerCase().includes(query) ||
        product.categoryEn?.toLowerCase().includes(query) ||
        product.categoryAr?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.active) ||
        (statusFilter === "inactive" && !product.active);

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const totalProducts = products.length;

  const activeProducts = products.filter(
    (product) => product.active
  ).length;

  const inactiveProducts = products.filter(
    (product) => !product.active
  ).length;

  const lowStockProducts = products.filter(
    (product) => product.stock > 0 && product.stock <= 5
  ).length;

  const outOfStockProducts = products.filter(
    (product) => product.stock === 0
  ).length;

  function getProductName(product: Product) {
    return language === "ar"
      ? product.nameAr || product.nameEn || "-"
      : product.nameEn || product.nameAr || "-";
  }

  function getProductCategory(product: Product) {
    return language === "ar"
      ? product.categoryAr || product.categoryEn || "-"
      : product.categoryEn || product.categoryAr || "-";
  }

  return (
    <main
      className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-[1500px]">

        {/* ================= HEADER ================= */}
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900"
            >
              <span>{isArabic ? "→" : "←"}</span>
              {t("dashboard")}
            </Link>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {t("products")}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {isArabic
                ? "إدارة المنتجات والمخزون والتوفر."
                : "Manage your products, inventory and availability."}
            </p>
          </div>

          <Link
            href="/products/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
          >
            <span className="text-lg leading-none">
              +
            </span>

            {t("addProduct")}
          </Link>
        </div>

        {/* ================= STATS ================= */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

          {/* Total */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {t("total")}
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {totalProducts}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl">
                📦
              </div>
            </div>
          </div>

          {/* Active */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {t("active")}
                </p>

                <p className="mt-2 text-3xl font-bold text-green-600">
                  {activeProducts}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-xl">
                ✓
              </div>
            </div>
          </div>

          {/* Inactive */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {t("inactive")}
                </p>

                <p className="mt-2 text-3xl font-bold text-red-600">
                  {inactiveProducts}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-xl">
                ⏸
              </div>
            </div>
          </div>

          {/* Low stock */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {t("lowStock")}
                </p>

                <p className="mt-2 text-3xl font-bold text-orange-600">
                  {lowStockProducts}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-xl">
                ⚠
              </div>
            </div>
          </div>

          {/* Out of stock */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {t("outOfStock")}
                </p>

                <p className="mt-2 text-3xl font-bold text-red-700">
                  {outOfStockProducts}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-xl">
                !
              </div>
            </div>
          </div>
        </div>

        {/* ================= ERROR ================= */}
        {error && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={loadProducts}
              className="font-semibold underline"
            >
              {isArabic ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        )}

        {/* ================= MAIN CARD ================= */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          {/* Toolbar */}
          <div className="border-b border-gray-200 p-4 sm:p-5">

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              {/* Search */}
              <div className="relative w-full xl:max-w-md">
                <span
                  className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${
                    isArabic ? "right-4" : "left-4"
                  }`}
                >
                  🔍
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder={
                    isArabic
                      ? "البحث برمز المنتج أو الاسم أو الفئة..."
                      : "Search SKU, product or category..."
                  }
                  className={`w-full rounded-xl border border-gray-300 bg-gray-50 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-100 ${
                    isArabic
                      ? "pr-11 pl-4"
                      : "pl-11 pr-4"
                  }`}
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">

                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    statusFilter === "all"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {isArabic ? "الكل" : "All"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setStatusFilter("active")
                  }
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    statusFilter === "active"
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t("active")}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setStatusFilter("inactive")
                  }
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    statusFilter === "inactive"
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t("inactive")}
                </button>

                <button
                  type="button"
                  onClick={loadProducts}
                  disabled={loading}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  ↻ {t("refresh")}
                </button>
              </div>
            </div>

            {/* Result count */}
            {!loading && (
              <div className="mt-4 text-sm text-gray-500">
                {isArabic
                  ? `عرض ${filteredProducts.length} من ${products.length} منتج`
                  : "Showing "}
                {!isArabic && (
                  <>
                    <span className="font-semibold text-gray-900">
                      {filteredProducts.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-gray-900">
                      {products.length}
                    </span>{" "}
                    products
                  </>
                )}
              </div>
            )}
          </div>

          {/* ================= LOADING ================= */}
          {loading ? (
            <div className="p-12">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    className="flex animate-pulse items-center gap-4"
                  >
                    <div className="h-12 w-12 rounded-xl bg-gray-200" />

                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 rounded bg-gray-200" />
                      <div className="h-3 w-1/4 rounded bg-gray-100" />
                    </div>

                    <div className="h-8 w-20 rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (

            /* ================= EMPTY ================= */
            <div className="px-6 py-20 text-center">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 text-4xl">
                {search ? "🔍" : "📦"}
              </div>

              <h2 className="mt-5 text-xl font-bold text-gray-900">
                {search
                  ? isArabic
                    ? "لم يتم العثور على منتجات"
                    : "No products found"
                  : isArabic
                  ? "لا توجد منتجات بعد"
                  : "No products yet"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                {search
                  ? isArabic
                    ? "حاول تغيير البحث أو الفلتر."
                    : "Try changing your search or filter."
                  : isArabic
                  ? "أضف منتجك الأول لبدء إدارة المخزون."
                  : "Add your first product to start managing your inventory."}
              </p>

              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className="mt-5 rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {isArabic
                    ? "مسح الفلاتر"
                    : "Clear Filters"}
                </button>
              ) : (
                <Link
                  href="/products/new"
                  className="mt-5 inline-flex rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  + {t("addProduct")}
                </Link>
              )}
            </div>

          ) : (

            /* ================= TABLE ================= */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">

                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">

                    <th className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {t("name")}
                    </th>

                    <th className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {t("sku")}
                    </th>

                    <th className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {t("category")}
                    </th>

                    <th className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {t("price")}
                    </th>

                    <th className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {t("stock")}
                    </th>

                    <th className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {t("status")}
                    </th>

                    <th className="px-5 py-4 text-end text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {isArabic ? "الإجراء" : "Action"}
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">

                  {filteredProducts.map((product) => {
                    const stockStatus =
                      product.stock === 0
                        ? "out"
                        : product.stock <= 5
                        ? "low"
                        : "good";

                    return (
                      <tr
                        key={product._id}
                        className="group transition hover:bg-gray-50/70"
                      >

                        {/* Product */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">

                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">

                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={getProductName(product)}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xl text-gray-400">
                                  📦
                                </div>
                              )}

                            </div>

                            <div className="min-w-0">
                              <p
                                className={`truncate font-semibold text-gray-900 ${
                                  isArabic ? "text-right" : "text-left"
                                }`}
                              >
                                {getProductName(product)}
                              </p>

                              <p
                                dir={isArabic ? "rtl" : "ltr"}
                                className="mt-0.5 truncate text-xs text-gray-400"
                              >
                                {language === "ar"
                                  ? product.nameEn || "-"
                                  : product.nameAr || "-"}
                              </p>
                            </div>

                          </div>
                        </td>

                        {/* SKU */}
                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-medium text-gray-600">
                            {product.sku}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4">
                          <div className="max-w-[180px]">

                            <p
                              className={`truncate text-sm font-medium text-gray-700 ${
                                isArabic
                                  ? "text-right"
                                  : "text-left"
                              }`}
                            >
                              {getProductCategory(product)}
                            </p>

                            <p
                              dir={isArabic ? "ltr" : "rtl"}
                              className="truncate text-xs text-gray-400"
                            >
                              {language === "ar"
                                ? product.categoryEn || "-"
                                : product.categoryAr || "-"}
                            </p>

                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-5 py-4">
                          <span className="font-semibold text-gray-900">
                            QAR{" "}
                            {Number(product.price).toFixed(2)}
                          </span>
                        </td>

                        {/* Stock */}
                        <td className="px-5 py-4">

                          {stockStatus === "out" ? (
                            <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                              {t("outOfStock")}
                            </span>
                          ) : stockStatus === "low" ? (
                            <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600">
                              {product.stock}{" "}
                              {isArabic ? "متبقي" : "left"}
                            </span>
                          ) : (
                            <span className="font-medium text-gray-700">
                              {product.stock}
                            </span>
                          )}

                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">

                          {product.active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              {t("active")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                              {t("inactive")}
                            </span>
                          )}

                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-end">

                          <div className="flex items-center justify-end gap-2">

                            <Link
                              href={`/products/${product._id}`}
                              className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-900 hover:text-gray-900"
                            >
                              {t("view")}
                            </Link>

                            <Link
                              href={`/products/${product._id}/edit`}
                              className="rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                            >
                              {t("edit")}
                            </Link>

                          </div>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && products.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">

            <span>
              {isArabic
                ? `${filteredProducts.length} منتج معروض`
                : `${filteredProducts.length} product${
                    filteredProducts.length !== 1
                      ? "s"
                      : ""
                  } displayed`}
            </span>

            <span>
              {isArabic ? "الإجمالي: " : "Total: "}

              <span className="font-semibold text-gray-700">
                {products.length}
              </span>
            </span>

          </div>
        )}

      </div>
    </main>
  );
}