"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "../components/LanguageProvider";

type Unit = "g" | "kg" | "pcs" | "ml" | "L";
type WeightOption = {
  weight: number;
  unit: Unit;
  price: number;
};
type ProductType = "single" | "multiple";
type FilterStatus = "all" | "active" | "inactive";

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
  lastStatusChangedByName?: string;
  lastStatusChangedAt?: string;
  productType?: ProductType;
  singleWeight?: number | null;
  singleUnit?: Unit | null;
  variants?: WeightOption[];
  createdAt?: string;
};

type Employee = {
  _id: string;
  name: string;
  active?: boolean;
};

export default function ProductsPage() {
  const { language, isArabic, t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statusTarget, setStatusTarget] = useState<Product | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [employeePin, setEmployeePin] = useState("");
  const [employeeLoading, setEmployeeLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [expandedPrices, setExpandedPrices] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] =
    useState<FilterStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    void loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/products", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load products");
      }

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load products"
      );
    } finally {
      setLoading(false);
    }
  }

  function getProductName(product: Product) {
    return language === "ar"
      ? product.nameAr || product.nameEn || "-"
      : product.nameEn || product.nameAr || "-";
  }

  function getProductCategory(product: Product) {
    return language === "ar"
      ? product.categoryAr ||
          product.categoryEn ||
          "بدون فئة"
      : product.categoryEn ||
          product.categoryAr ||
          "No Category";
  }

  const categories = useMemo(() => {
    const map = new Map<string, { en: string; ar: string }>();

    products.forEach((product) => {
      const en = product.categoryEn?.trim() || "";
      const ar = product.categoryAr?.trim() || "";

      if (!en && !ar) return;

      const key = `${en.toLowerCase()}|${ar.toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, { en: en || ar, ar: ar || en });
      }
    });

    return Array.from(map.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => {
        const nameA = language === "ar" ? a.ar : a.en;
        const nameB = language === "ar" ? b.ar : b.en;
        return nameA.localeCompare(nameB);
      });
  }, [products, language]);

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

      const productCategoryKey = `${(
        product.categoryEn || ""
      ).toLowerCase()}|${(product.categoryAr || "").toLowerCase()}`;

      const matchesCategory =
        categoryFilter === "all" ||
        productCategoryKey === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [products, search, statusFilter, categoryFilter]);

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.active).length;
  const inactiveProducts = products.filter((p) => !p.active).length;
  const lowStockProducts = products.filter(
    (p) => p.stock > 0 && p.stock <= 5
  ).length;
  const outOfStockProducts = products.filter(
    (p) => p.stock === 0
  ).length;

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
  }

  function closeStatusDialog() {
    if (actionLoading) return;

    setStatusTarget(null);
    setEmployeeId("");
    setEmployeePin("");
    setError("");
  }

  async function openStatusDialog(product: Product) {
    setStatusTarget(product);
    setEmployeeId("");
    setEmployeePin("");
    setEmployees([]);
    setEmployeeLoading(true);
    setError("");

    try {
      const response = await fetch("/api/employees", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load employees");
      }

      const list: Employee[] = Array.isArray(data)
        ? data
        : Array.isArray(data.employees)
          ? data.employees
          : [];

      setEmployees(
        list.filter(
          (employee) =>
            employee.active !== false && employee.name?.trim()
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load employees"
      );
    } finally {
      setEmployeeLoading(false);
    }
  }

  async function confirmStatusChange() {
    if (!statusTarget) return;

    if (!employeeId) {
      setError(
        isArabic
          ? "يرجى اختيار الموظف"
          : "Please select an employee."
      );
      return;
    }

    // Keep PIN as a string so PINs such as 007 remain valid.
    if (!/^\d{3}$/.test(employeePin)) {
      setError(
        isArabic
          ? "أدخل رمز PIN صحيحًا مكونًا من 3 أرقام"
          : "Please enter a valid 3-digit employee PIN."
      );
      return;
    }

    const product = statusTarget;

    try {
      setActionLoading(product._id);
      setError("");

      const response = await fetch(`/api/products/${product._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !product.active,
          statusEmployeeId: employeeId,
          employeePin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            (isArabic
              ? "فشل تحديث حالة المنتج"
              : "Failed to update product status")
        );
      }

      setProducts((current) =>
        current.map((item) =>
          item._id === product._id ? { ...item, ...data } : item
        )
      );

      setStatusTarget(null);
      setEmployeeId("");
      setEmployeePin("");
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update product status"
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteProduct(product: Product) {
    const productName = getProductName(product);

    const confirmed = window.confirm(
      isArabic
        ? `هل أنت متأكد أنك تريد حذف المنتج "${productName}"؟\n\nلا يمكن التراجع عن هذا الإجراء.`
        : `Are you sure you want to delete "${productName}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setActionLoading(product._id);
      setError("");

      const response = await fetch(`/api/products/${product._id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete product");
      }

      setProducts((current) =>
        current.filter((item) => item._id !== product._id)
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete product"
      );
    } finally {
      setActionLoading(null);
    }
  }

  const selectedCategory = categories.find(
    (category) => category.key === categoryFilter
  );

  return (
    <main
      className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-[1500px]">
        {/* Header */}
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <span className="text-lg leading-none">+</span>
            {t("addProduct")}
          </Link>
        </div>

        {/* Statistics */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: t("total"),
              value: totalProducts,
              icon: "📦",
              color: "text-gray-900",
              bg: "bg-gray-100",
            },
            {
              label: t("active"),
              value: activeProducts,
              icon: "✓",
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: t("inactive"),
              value: inactiveProducts,
              icon: "⏸",
              color: "text-red-600",
              bg: "bg-red-50",
            },
            {
              label: t("lowStock"),
              value: lowStockProducts,
              icon: "⚠",
              color: "text-orange-600",
              bg: "bg-orange-50",
            },
            {
              label: t("outOfStock"),
              value: outOfStockProducts,
              icon: "!",
              color: "text-red-700",
              bg: "bg-red-50",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {item.label}
                  </p>
                  <p className={`mt-2 text-3xl font-bold ${item.color}`}>
                    {item.value}
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${item.bg}`}
                >
                  {item.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && !statusTarget && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadProducts()}
              className="shrink-0 font-semibold underline"
            >
              {isArabic ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        )}

        {/* Products card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Search and filters */}
          <div className="border-b border-gray-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative w-full lg:max-w-md">
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
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={
                      isArabic
                        ? "البحث برمز المنتج أو الاسم أو الفئة..."
                        : "Search SKU, product or category..."
                    }
                    className={`w-full rounded-xl border border-gray-300 bg-gray-50 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-100 ${
                      isArabic ? "pr-11 pl-4" : "pl-11 pr-4"
                    }`}
                  />
                </div>

                <div className="w-full lg:max-w-xs">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none focus:border-gray-900 focus:bg-white"
                  >
                    <option value="all">
                      {isArabic ? "كل الفئات" : "All Categories"}
                    </option>
                    {categories.map((category) => (
                      <option key={category.key} value={category.key}>
                        {language === "ar" ? category.ar : category.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    ["all", isArabic ? "الكل" : "All"],
                    ["active", t("active")],
                    ["inactive", t("inactive")],
                  ] as [FilterStatus, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                      statusFilter === value
                        ? value === "active"
                          ? "bg-green-600 text-white"
                          : value === "inactive"
                            ? "bg-red-600 text-white"
                            : "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {isArabic ? "مسح الفلاتر" : "Clear Filters"}
                </button>

                <button
                  type="button"
                  onClick={() => void loadProducts()}
                  disabled={loading}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  ↻ {t("refresh")}
                </button>
              </div>
            </div>

            {!loading && (
              <div className="mt-4 flex flex-col gap-1 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {isArabic ? "عرض " : "Showing "}
                  <span className="font-semibold text-gray-900">
                    {filteredProducts.length}
                  </span>
                  {isArabic ? " من " : " of "}
                  <span className="font-semibold text-gray-900">
                    {products.length}
                  </span>
                  {isArabic ? " منتج" : " products"}
                </div>

                {selectedCategory && (
                  <div className="font-medium text-gray-700">
                    {isArabic ? "الفئة: " : "Category: "}
                    {language === "ar"
                      ? selectedCategory.ar
                      : selectedCategory.en}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Loading */}
          {loading ? (
            <div className="space-y-4 p-12">
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
          ) : filteredProducts.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 text-4xl">
                {search || categoryFilter !== "all" ? "🔍" : "📦"}
              </div>

              <h2 className="mt-5 text-xl font-bold text-gray-900">
                {search ||
                categoryFilter !== "all" ||
                statusFilter !== "all"
                  ? isArabic
                    ? "لم يتم العثور على منتجات"
                    : "No products found"
                  : isArabic
                    ? "لا توجد منتجات بعد"
                    : "No products yet"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                {isArabic
                  ? "حاول تغيير البحث أو الفلاتر، أو أضف منتجك الأول."
                  : "Try changing your search or filters, or add your first product."}
              </p>

              {search ||
              categoryFilter !== "all" ||
              statusFilter !== "all" ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {isArabic ? "مسح الفلاتر" : "Clear Filters"}
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px]">
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
                      {isArabic ? "الإجراء" : "Actions"}
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

                    const isActionLoading =
                      actionLoading === product._id;

                    const variantPrices =
                      product.productType === "multiple" &&
                      product.variants?.length
                        ? product.variants
                        : [];

                    const highestPrice = variantPrices.length
                      ? Math.max(
                          ...variantPrices.map(
                            (variant) => Number(variant.price) || 0
                          )
                        )
                      : Number(product.price) || 0;

                    return (
                      <tr
                        key={product._id}
                        className="group transition hover:bg-gray-50/70"
                      >
                        {/* Product image and name */}
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
                              <p className="truncate font-semibold text-gray-900">
                                {getProductName(product)}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-gray-400">
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
                            <p className="truncate text-sm font-medium text-gray-700">
                              {getProductCategory(product)}
                            </p>
                            <p className="truncate text-xs text-gray-400">
                              {language === "ar"
                                ? product.categoryEn || "-"
                                : product.categoryAr || "-"}
                            </p>
                          </div>
                        </td>

                        {/* Price and variants */}
                        <td className="px-5 py-4">
                          <span className="font-semibold text-gray-900">
                            QAR {highestPrice.toFixed(2)}
                          </span>

                          {variantPrices.length > 0 ? (
                            <div className="mt-2">
                              <button
                                type="button"
                                aria-expanded={expandedPrices.includes(
                                  product._id
                                )}
                                onClick={() =>
                                  setExpandedPrices((current) =>
                                    current.includes(product._id)
                                      ? current.filter(
                                          (id) => id !== product._id
                                        )
                                      : [...current, product._id]
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                              >
                                {expandedPrices.includes(product._id)
                                  ? isArabic
                                    ? "إخفاء الأسعار ▲"
                                    : "Hide weight prices ▲"
                                  : isArabic
                                    ? `عرض ${variantPrices.length} أوزان ▼`
                                    : `View ${variantPrices.length} weight prices ▼`}
                              </button>

                              {expandedPrices.includes(product._id) && (
                                <div className="mt-2 min-w-[180px] space-y-1 rounded-lg border border-gray-200 bg-white p-2 text-xs">
                                  {variantPrices.map((variant, index) => (
                                    <div
                                      key={`${variant.weight}-${variant.unit}-${index}`}
                                      className="flex items-center justify-between gap-4"
                                    >
                                      <span className="text-gray-500">
                                        {variant.weight} {variant.unit}
                                      </span>
                                      <span className="font-medium text-gray-900">
                                        QAR{" "}
                                        {Number(variant.price).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="mt-1 text-xs text-gray-500">
                              {product.singleWeight
                                ? `${product.singleWeight}${product.singleUnit || "g"}`
                                : isArabic
                                  ? "منتج واحد"
                                  : "Single Item"}
                            </p>
                          )}
                        </td>

                        {/* Stock */}
                        <td className="px-5 py-4">
                          {stockStatus === "out" ? (
                            <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                              {t("outOfStock")}
                            </span>
                          ) : stockStatus === "low" ? (
                            <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600">
                              {product.stock} {isArabic ? "متبقي" : "left"}
                            </span>
                          ) : (
                            <span className="font-medium text-gray-700">
                              {product.stock}
                            </span>
                          )}
                        </td>

                        {/* Status toggle */}
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => void openStatusDialog(product)}
                            disabled={isActionLoading}
                            aria-label={
                              product.active
                                ? "Turn product off"
                                : "Turn product on"
                            }
                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-200 ${
                              product.active
                                ? "bg-green-500"
                                : "bg-gray-300"
                            } ${
                              isActionLoading
                                ? "cursor-wait opacity-50"
                                : "cursor-pointer"
                            }`}
                          >
                            <span
                              className={`absolute h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                product.active
                                  ? isArabic
                                    ? "-translate-x-8"
                                    : "translate-x-8"
                                  : isArabic
                                    ? "-translate-x-1"
                                    : "translate-x-1"
                              }`}
                            />
                            <span
                              className={`absolute text-[9px] font-bold ${
                                product.active
                                  ? isArabic
                                    ? "right-2 text-white"
                                    : "left-2 text-white"
                                  : isArabic
                                    ? "left-2 text-gray-600"
                                    : "right-2 text-gray-600"
                              }`}
                            >
                              {product.active ? "ON" : "OFF"}
                            </span>
                          </button>

                          {product.lastStatusChangedByName && (
                            <div className="mt-1 max-w-36 text-[11px] leading-4 text-gray-500">
                              <div>
                                {product.active ? "ON" : "OFF"}{" "}
                                {isArabic ? "بواسطة" : "by"}{" "}
                                {product.lastStatusChangedByName}
                              </div>
                              {product.lastStatusChangedAt && (
                                <div>
                                  {new Date(
                                    product.lastStatusChangedAt
                                  ).toLocaleString(
                                    language === "ar" ? "ar" : "en"
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-end">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/products/${product._id}`}
                              className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:border-gray-900 hover:text-gray-900"
                            >
                              {t("view")}
                            </Link>

                            <Link
                              href={`/products/${product._id}/edit`}
                              className="rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-800"
                            >
                              {t("edit")}
                            </Link>

                            <button
                              type="button"
                              onClick={() => void deleteProduct(product)}
                              disabled={isActionLoading}
                              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600 hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isActionLoading
                                ? "..."
                                : t("delete")}
                            </button>
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
                    filteredProducts.length !== 1 ? "s" : ""
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

      {/* Employee PIN confirmation modal */}
      {statusTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm product status change"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            dir={isArabic ? "rtl" : "ltr"}
          >
            <h2 className="text-xl font-bold text-gray-900">
              {statusTarget.active
                ? isArabic
                  ? "إيقاف المنتج"
                  : "Turn Product OFF"
                : isArabic
                  ? "تشغيل المنتج"
                  : "Turn Product ON"}
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              {getProductName(statusTarget)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {isArabic
                ? "اختر الموظف وأدخل رمز PIN المكون من 3 أرقام."
                : "Select the employee and enter their 3-digit PIN."}
            </p>

            <label
              htmlFor="status-employee"
              className="mt-5 block text-sm font-semibold text-gray-700"
            >
              {isArabic ? "اسم الموظف *" : "Employee Name *"}
            </label>

            <select
              id="status-employee"
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                setError("");
              }}
              disabled={employeeLoading || actionLoading !== null}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 disabled:bg-gray-100"
            >
              <option value="">
                {employeeLoading
                  ? isArabic
                    ? "جارٍ تحميل الموظفين..."
                    : "Loading employees..."
                  : isArabic
                    ? "اختر الموظف"
                    : "Select Employee"}
              </option>

              {employees.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name}
                </option>
              ))}
            </select>

            {employees.length === 0 && !employeeLoading && (
              <p className="mt-2 text-sm text-red-600">
                {isArabic
                  ? "لم يتم العثور على موظفين نشطين."
                  : "No active employees found."}
              </p>
            )}

            <label
              htmlFor="employee-pin"
              className="mt-4 block text-sm font-semibold text-gray-700"
            >
              {isArabic ? "رمز PIN للموظف (3 أرقام) *" : "Employee PIN (3 digits) *"}
            </label>

            <input
              id="employee-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={3}
              pattern="[0-9]{3}"
              value={employeePin}
              onChange={(e) => {
                setEmployeePin(
                  e.target.value.replace(/\D/g, "").slice(0, 3)
                );
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void confirmStatusChange();
                }
              }}
              placeholder={isArabic ? "أدخل 3 أرقام" : "Enter 3-digit PIN"}
              className="mt-2 w-full rounded-lg border border-gray-300 p-3 tracking-[0.35em] text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
              disabled={actionLoading !== null}
            />

            {error && (
              <div
                role="alert"
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={closeStatusDialog}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>

              <button
                type="button"
                disabled={
                  !employeeId ||
                  !/^\d{3}$/.test(employeePin) ||
                  employeeLoading ||
                  actionLoading !== null
                }
                onClick={() => void confirmStatusChange()}
                className="rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? isArabic
                    ? "جارٍ الحفظ..."
                    : "Saving..."
                  : isArabic
                    ? `تأكيد ${statusTarget.active ? "الإيقاف" : "التشغيل"}`
                    : `Confirm ${statusTarget.active ? "OFF" : "ON"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}