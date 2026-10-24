"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "../components/LanguageProvider";

type Unit = "g" | "kg" | "pcs" | "ml" | "L";
type ProductType = "single" | "multiple";
type FilterStatus = "all" | "active" | "inactive";

type WeightOption = {
  _id?: string;
  weight: number;
  unit: Unit;
  price: number;
};

type Product = {
  _id: string;
  sku: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  image?: string;
  categoryEn?: string;
  categoryAr?: string;
  price: number;
  stock: number;
  rating?: number;
  active: boolean;
  lastStatusChangedByName?: string;
  lastStatusChangedAt?: string;
  productType?: ProductType;
  singleWeight?: number | null;
  singleUnit?: Unit | null;
  variants?: WeightOption[];
  createdAt?: string;
};

type PerformanceRecord = {
  productId: string;
  expiryDate?: string;
  rating: number;
  note?: string;
  promotions?: string[];
  promotionDiscount?: number | string;
  promotionNote?: string;
  [key: string]: unknown;
};

type Employee = {
  _id: string;
  name: string;
  active?: boolean;
};

export default function ProductsPage() {
  const { language, isArabic, t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [performanceRecords, setPerformanceRecords] = useState<PerformanceRecord[]>([]);
  const [ratingSavingId, setRatingSavingId] = useState<string | null>(null);
  const [ratingMessage, setRatingMessage] = useState<{ productId: string; text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statusTarget, setStatusTarget] = useState<Product | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [employeePin, setEmployeePin] = useState("");
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedPrices, setExpandedPrices] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [ratingFilter, setRatingFilter] = useState<number | null | "unrated" | `range-${number}-${number}`>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const message = (en: string, ar: string) => (isArabic ? ar : en);

  useEffect(() => {
    void loadProducts();
  }, []);

  async function readResponse(response: Response) {
    return response.json().catch(() => ({}));
  }

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const [response, performanceResponse] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/product-performance", { cache: "no-store" }).catch(() => null),
      ]);

      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to load products");
      }

      const list: Product[] = Array.isArray(data)
        ? data
        : Array.isArray(data.products)
          ? data.products
          : [];

      let records: PerformanceRecord[] = [];
      if (performanceResponse?.ok) {
        const performanceData = await readResponse(performanceResponse);
        // /api/product-performance returns { success, data: { [productId]: record } }
        // while older versions may return an array/items/records.
        const rawRecords: any[] = Array.isArray(performanceData)
          ? performanceData
          : Array.isArray(performanceData.items)
            ? performanceData.items
            : Array.isArray(performanceData.records)
              ? performanceData.records
              : Array.isArray(performanceData.data)
                ? performanceData.data
                : performanceData.data && typeof performanceData.data === "object"
                  ? Object.entries(performanceData.data).map(([productId, record]) => ({
                      ...(record as Record<string, unknown>),
                      productId,
                    }))
                  : [];
        records = rawRecords
          .filter((item: any) => item && (item.productId || item.product?._id))
          .map((item: any) => ({
            ...item,
            productId: String(item.productId || item.product?._id),
            rating: Math.max(0, Math.min(5, Number(item.rating) || 0)),
          }));
      }

      setPerformanceRecords(records);
      const ratingByProduct = new Map(records.map((record) => [record.productId, record.rating]));
      setProducts(list.map((product) => ({
        ...product,
        rating: ratingByProduct.get(String(product._id)) ?? 0,
      })));
    } catch (err) {
      console.error("Load products error:", err);
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function saveEmployerRating(product: Product, rating: number) {
    if (ratingSavingId) return;

    const productId = String(product._id);
    const previousRating = Number(product.rating) || 0;
    const existing = performanceRecords.find((record) => String(record.productId) === productId);
    const nextRecord: PerformanceRecord = {
      ...(existing || {}),
      productId,
      rating,
      expiryDate: existing?.expiryDate || "",
      note: existing?.note || "",
      promotions: existing?.promotions || [],
      promotionDiscount: existing?.promotionDiscount ?? 0,
      promotionNote: existing?.promotionNote || "",
    };
    const nextRecords = existing
      ? performanceRecords.map((record) =>
          String(record.productId) === productId ? nextRecord : record
        )
      : [...performanceRecords, nextRecord];

    setRatingSavingId(productId);
    setRatingMessage(null);
    setProducts((current) =>
      current.map((item) => item._id === productId ? { ...item, rating } : item)
    );

    try {
      const response = await fetch("/api/product-performance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        // Save only the selected product. The API reports how many valid product IDs it saved.
        body: JSON.stringify({ items: [nextRecord] }),
      });
      const data = await readResponse(response);
      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to save employer rating");
      }
      if (Number(data.saved) < 1) {
        throw new Error("Rating was not saved: product ID was not accepted by the API.");
      }

      // Confirm the rating is readable from the database before showing a success message.
      const verifyResponse = await fetch("/api/product-performance", { cache: "no-store" });
      const verifyData = await readResponse(verifyResponse);
      if (!verifyResponse.ok || Number(verifyData?.data?.[productId]?.rating) !== rating) {
        throw new Error("Rating save could not be verified. Please check the product ID and API response.");
      }

      setPerformanceRecords(nextRecords);
      setRatingMessage({
        productId,
        text: message("Rating saved", "تم حفظ التقييم"),
        ok: true,
      });
    } catch (err) {
      console.error("Save employer rating error:", err);
      setProducts((current) =>
        current.map((item) => item._id === productId ? { ...item, rating: previousRating } : item)
      );
      setRatingMessage({
        productId,
        text: err instanceof Error ? err.message : message("Could not save rating", "تعذر حفظ التقييم"),
        ok: false,
      });
    } finally {
      setRatingSavingId(null);
    }
  }

  function EmployerRating({ product }: { product: Product }) {
    const rating = Number(product.rating) || 0;
    const isSaving = ratingSavingId === product._id;
    return (
      <div className="min-w-[118px]">
        <div className="flex items-center gap-0.5" role="group" aria-label={message("Employer rating", "تقييم صاحب العمل")}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => void saveEmployerRating(product, star)}
              disabled={ratingSavingId !== null}
              aria-label={message(`Rate ${star} out of 5 stars`, `التقييم ${star} من 5`)}
              aria-pressed={rating === star}
              title={`${star}/5`}
              className={`rounded px-0.5 text-xl leading-6 transition-colors disabled:cursor-wait disabled:opacity-50 ${
                star <= rating ? "text-amber-400" : "text-slate-300 hover:text-amber-300"
              }`}
            >
              ★
            </button>
          ))}
          <span className="ml-1 text-[11px] font-bold text-slate-600">{rating ? `${rating}/5` : "—"}</span>
        </div>
        {isSaving && <p className="mt-0.5 text-[10px] text-slate-500">{message("Saving…", "جارٍ الحفظ…")}</p>}
        {ratingMessage?.productId === product._id && !isSaving && (
          <p className={`mt-0.5 max-w-[150px] break-words text-[10px] ${ratingMessage.ok ? "text-emerald-600" : "text-rose-600"}`}>
            {ratingMessage.text}
          </p>
        )}
      </div>
    );
  }

  function getProductName(product: Product) {
    return language === "ar"
      ? product.nameAr || product.nameEn || "-"
      : product.nameEn || product.nameAr || "-";
  }

  function getProductCategory(product: Product) {
    return language === "ar"
      ? product.categoryAr || product.categoryEn || "بدون فئة"
      : product.categoryEn || product.categoryAr || "No Category";
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
      .sort((a, b) =>
        (language === "ar" ? a.ar : a.en).localeCompare(
          language === "ar" ? b.ar : b.en
        )
      );
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

      const categoryKey =
        `${(product.categoryEn || "").toLowerCase()}|` +
        `${(product.categoryAr || "").toLowerCase()}`;

      const matchesCategory =
        categoryFilter === "all" || categoryKey === categoryFilter;
      const productRating = Number(product.rating || 0);
      const rangeMatch = typeof ratingFilter === "string"
        ? ratingFilter.match(/^range-(\d)-(\d)$/)
        : null;
      const matchesRating =
        ratingFilter === null ||
        (ratingFilter === "unrated"
          ? productRating === 0
          : rangeMatch
            ? productRating >= Number(rangeMatch[1]) && productRating <= Number(rangeMatch[2])
            : productRating === ratingFilter);

      return matchesSearch && matchesStatus && matchesCategory && matchesRating;
    });
  }, [products, search, statusFilter, categoryFilter, ratingFilter]);

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
    setRatingFilter(null);
  }

  function closeStatusDialog() {
    if (actionLoading) return;

    setStatusTarget(null);
    setEmployeeId("");
    setEmployeePin("");
    setEmployees([]);
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

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to load employees"
        );
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
      console.error("Load employees error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load employees"
      );
    } finally {
      setEmployeeLoading(false);
    }
  }

  async function confirmStatusChange() {
    if (!statusTarget || actionLoading) return;

    if (!employeeId) {
      setError(message("Please select an employee.", "يرجى اختيار الموظف"));
      return;
    }

    if (!/^\d{3}$/.test(employeePin)) {
      setError(
        message(
          "Please enter a valid 3-digit employee PIN.",
          "أدخل رمز PIN صحيحًا مكونًا من 3 أرقام"
        )
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
        cache: "no-store",
        body: JSON.stringify({
          active: !product.active,
          statusEmployeeId: employeeId,
          employeePin,
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            message(
              "Failed to update product status.",
              "فشل تحديث حالة المنتج"
            )
        );
      }

      const updatedProduct: Product | undefined = data.product;

      if (
        !updatedProduct ||
        updatedProduct._id !== product._id ||
        typeof updatedProduct.active !== "boolean"
      ) {
        throw new Error(
          "The server did not return the updated product. Check the PUT API response."
        );
      }

      setProducts((current) =>
        current.map((item) =>
          item._id === product._id
            ? { ...item, ...updatedProduct }
            : item
        )
      );

      setStatusTarget(null);
      setEmployeeId("");
      setEmployeePin("");
      setEmployees([]);
      setError("");
    } catch (err) {
      console.error("Product status update error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update product status."
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      message(
        `Are you sure you want to delete "${getProductName(product)}"?\n\nThis action cannot be undone.`,
        `هل أنت متأكد أنك تريد حذف المنتج "${getProductName(product)}"؟\n\nلا يمكن التراجع عن هذا الإجراء.`
      )
    );

    if (!confirmed) return;

    try {
      setActionLoading(product._id);
      setError("");

      const response = await fetch(`/api/products/${product._id}`, {
        method: "DELETE",
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to delete product"
        );
      }

      setProducts((current) =>
        current.filter((item) => item._id !== product._id)
      );
    } catch (err) {
      console.error("Delete product error:", err);
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
      className="min-h-screen bg-slate-50 p-2 sm:p-4 lg:p-6 font-sans text-slate-950 overflow-x-hidden max-w-full box-border"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-[1500px] w-full space-y-4 sm:space-y-6 box-border overflow-x-hidden">
        
        {/* Header Section */}
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 sm:p-6 shadow-xs border border-slate-200 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <Link
              href="/"
              className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <span>{isArabic ? "→" : "←"}</span>
              {t("dashboard")}
            </Link>

            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-slate-900 truncate">
              {t("products")}
            </h1>

            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              {message(
                "Manage your products, inventory levels and live status.",
                "إدارة المنتجات ومستويات المخزون وحالة التوفر المباشرة."
              )}
            </p>
          </div>

          <Link
            href="/products/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 shadow-sm transition-all shrink-0"
          >
            <span className="text-base leading-none">+</span>
            {t("addProduct")}
          </Link>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[
            {
              label: t("total"),
              value: totalProducts,
              icon: "📦",
              color: "text-slate-900",
              bg: "bg-slate-100",
            },
            {
              label: t("active"),
              value: activeProducts,
              icon: "✓",
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: t("inactive"),
              value: inactiveProducts,
              icon: "⏸",
              color: "text-rose-600",
              bg: "bg-rose-50",
            },
            {
              label: t("lowStock"),
              value: lowStockProducts,
              icon: "⚠",
              color: "text-amber-600",
              bg: "bg-amber-50",
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
              className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                    {item.label}
                  </p>
                  <p className={`mt-1 text-2xl sm:text-3xl font-black ${item.color}`}>
                    {item.value}
                  </p>
                </div>
                <div
                  className={`flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-xl text-base sm:text-xl ${item.bg}`}
                >
                  {item.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* General Error Banner */}
        {error && !statusTarget && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-xs">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadProducts()}
              className="shrink-0 font-bold underline"
            >
              {message("Retry", "إعادة المحاولة")}
            </button>
          </div>
        )}

        {/* Main Content Card / Filter & Table Section */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs w-full max-w-full">
          
          {/* Search & Filters Header */}
          <div className="border-b border-slate-200 p-3 sm:p-6 bg-slate-50/50">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5 lg:flex-row">
                {/* Search Input */}
                <div className="relative w-full lg:max-w-md">
                  <span
                    className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                      isArabic ? "right-3.5" : "left-3.5"
                    }`}
                  >
                    🔍
                  </span>

                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={message(
                      "Search SKU, product or category...",
                      "البحث برمز المنتج أو الاسم أو الفئة..."
                    )}
                    className={`w-full rounded-xl border border-slate-300 bg-white py-2.5 text-xs sm:text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 shadow-2xs ${
                      isArabic ? "pr-10 pl-3.5" : "pl-10 pr-3.5"
                    }`}
                  />
                </div>

                {/* Category Dropdown */}
                <div className="w-full lg:max-w-xs">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:border-slate-900 shadow-2xs"
                  >
                    <option value="all">
                      {message("All Categories", "كل الفئات")}
                    </option>
                    {categories.map((category) => (
                      <option key={category.key} value={category.key}>
                        {language === "ar" ? category.ar : category.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Filters & Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {(
                  [
                    ["all", message("All", "الكل")],
                    ["active", t("active")],
                    ["inactive", t("inactive")],
                  ] as [FilterStatus, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-2xs ${
                      statusFilter === value
                        ? value === "active"
                          ? "bg-emerald-600 text-white"
                          : value === "inactive"
                            ? "bg-rose-600 text-white"
                            : "bg-slate-900 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}

                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1" role="group" aria-label={message("Filter by employer rating", "تصفية حسب تقييم صاحب العمل")}>
                  <span className="mr-1 text-[11px] font-bold text-slate-500">{message("Stars", "النجوم")}</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingFilter((current) => current === star ? null : star)}
                      aria-pressed={ratingFilter === star}
                      aria-label={message(`Show ${star}-star products`, `عرض المنتجات بتقييم ${star} نجوم`)}
                      title={message(`${star} star`, `${star} نجوم`)}
                      className={`rounded-md px-1 text-lg leading-6 transition-colors ${ratingFilter === star ? "bg-amber-100 text-amber-600 ring-1 ring-amber-400" : "text-slate-300 hover:bg-amber-50 hover:text-amber-400"}`}
                    >★</button>
                  ))}
                  <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
                  {([
                    ["range-1-2", "1–2"],
                    ["range-1-3", "1–3"],
                    ["range-2-4", "2–4"],
                    ["range-1-4", "1–4"],
                    ["range-1-5", "1–5"],
                  ] as [`range-${number}-${number}`, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRatingFilter((current) => current === value ? null : value)}
                      aria-pressed={ratingFilter === value}
                      title={message(`Show products rated ${label} stars`, `عرض المنتجات بتقييم من ${label} نجوم`)}
                      className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${ratingFilter === value ? "bg-amber-100 text-amber-700 ring-1 ring-amber-400" : "text-slate-500 hover:bg-amber-50 hover:text-amber-700"}`}
                    >{label}</button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRatingFilter((current) => current === "unrated" ? null : "unrated")}
                    aria-pressed={ratingFilter === "unrated"}
                    className={`rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${ratingFilter === "unrated" ? "bg-slate-200 text-slate-900 ring-1 ring-slate-400" : "text-slate-500 hover:bg-slate-100"}`}
                    title={message("Show products without a rating", "عرض المنتجات بدون تقييم")}
                  >
                    ☆ {message("Not Rated", "بدون تقييم")}
                  </button>
                  {ratingFilter !== null && (
                    <button type="button" onClick={() => setRatingFilter(null)} className="ml-1 rounded px-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100">
                      {message("All ratings", "كل التقييمات")}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {message("Clear Filters", "مسح الفلاتر")}
                </button>

                <button
                  type="button"
                  onClick={() => void loadProducts()}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition ml-auto"
                >
                  ↻ {t("refresh")}
                </button>
              </div>
            </div>

            {/* Results Counter info */}
            {!loading && (
              <div className="mt-3 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200/60 pt-2.5">
                <div>
                  {message("Showing ", "عرض ")}
                  <span className="font-bold text-slate-900">
                    {filteredProducts.length}
                  </span>
                  {message(" of ", " من ")}
                  <span className="font-bold text-slate-900">
                    {products.length}
                  </span>
                  {message(" products", " منتج")}
                </div>

                {selectedCategory && (
                  <div className="font-semibold text-slate-700">
                    {message("Category: ", "الفئة: ")}
                    {language === "ar"
                      ? selectedCategory.ar
                      : selectedCategory.en}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Loading Skeleton */}
          {loading ? (
            <div className="space-y-4 p-8 sm:p-12">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse items-center gap-4"
                >
                  <div className="h-12 w-12 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-slate-200" />
                    <div className="h-3 w-1/4 rounded bg-slate-100" />
                  </div>
                  <div className="h-8 w-20 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-4xl">
                {search || categoryFilter !== "all" ? "🔍" : "📦"}
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                {search || categoryFilter !== "all" || statusFilter !== "all" || ratingFilter !== null
                  ? message("No products found", "لم يتم العثور على منتجات")
                  : message("No products yet", "لا توجد منتجات بعد")}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                {message(
                  "Try changing your search or filters, or add your first product.",
                  "حاول تغيير البحث أو الفلاتر، أو أضف منتجك الأول."
                )}
              </p>

              {search || categoryFilter !== "all" || statusFilter !== "all" || ratingFilter !== null ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {message("Clear Filters", "مسح الفلاتر")}
                </button>
              ) : (
                <Link
                  href="/products/new"
                  className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 transition"
                >
                  + {t("addProduct")}
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (With horizontal scrolling containment & compact actions) */}
              <div className="hidden lg:block w-full overflow-x-auto max-w-full">
                <table className="w-full min-w-[1000px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      {[
                        t("name"),
                        t("sku"),
                        t("category"),
                        t("price"),
                        message("Employer Rating", "تقييم صاحب العمل"),
                        t("status"),
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-end text-xs font-bold uppercase tracking-wider text-slate-500 w-[180px]">
                        {message("Actions", "الإجراء")}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((product) => {
                      const isActionLoading = actionLoading === product._id;
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
                          className="group transition-colors hover:bg-slate-50/80"
                        >
                          {/* Product image & name */}
                          <td className="px-4 py-3 max-w-[250px]">
                            <div className="flex items-center gap-2.5">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-2xs">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={getProductName(product)}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-base text-slate-400">
                                    📦
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-slate-900 text-xs sm:text-sm">
                                  {getProductName(product)}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                                  {language === "ar"
                                    ? product.nameEn || "-"
                                    : product.nameAr || "-"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* SKU */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                              {product.sku}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3 max-w-[140px]">
                            <div className="truncate">
                              <p className="truncate text-xs font-semibold text-slate-700">
                                {getProductCategory(product)}
                              </p>
                            </div>
                          </td>

                          {/* Price & Variants */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-black text-slate-900 text-xs sm:text-sm">
                              QAR {highestPrice.toFixed(2)}
                            </span>

                            {variantPrices.length > 0 ? (
                              <div className="mt-1">
                                <button
                                  type="button"
                                  aria-expanded={expandedPrices.includes(product._id)}
                                  onClick={() =>
                                    setExpandedPrices((current) =>
                                      current.includes(product._id)
                                        ? current.filter((id) => id !== product._id)
                                        : [...current, product._id]
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition"
                                >
                                  {expandedPrices.includes(product._id)
                                    ? message("Hide weights ▲", "إخفاء ▲")
                                    : message(
                                        `${variantPrices.length} weights ▼`,
                                        `${variantPrices.length} أوزان ▼`
                                      )}
                                </button>

                                {expandedPrices.includes(product._id) && (
                                  <div className="mt-1.5 min-w-[160px] space-y-1 rounded-xl border border-slate-200 bg-white p-2 text-[11px] shadow-lg z-20 absolute">
                                    {variantPrices.map((variant, index) => (
                                      <div
                                        key={
                                          variant._id ||
                                          `${variant.weight}-${variant.unit}-${index}`
                                        }
                                        className="flex items-center justify-between gap-3 py-0.5"
                                      >
                                        <span className="text-slate-500 font-medium">
                                          {variant.weight} {variant.unit}
                                        </span>
                                        <span className="font-bold text-slate-900">
                                          QAR {Number(variant.price).toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="mt-0.5 text-[11px] text-slate-500 font-medium">
                                {product.singleWeight
                                  ? `${product.singleWeight}${product.singleUnit || "g"}`
                                  : message("Single", "مفرد")}
                              </p>
                            )}
                          </td>

                          {/* Employer Rating */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <EmployerRating product={product} />
                          </td>

                          {/* Active / Inactive Switch & Date Info */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void openStatusDialog(product)}
                                disabled={isActionLoading || actionLoading !== null}
                                aria-label={
                                  product.active ? "Turn product off" : "Turn product on"
                                }
                                className={`relative inline-flex h-6 w-12 shrink-0 items-center rounded-full transition-all duration-200 shadow-2xs ${
                                  product.active ? "bg-emerald-500" : "bg-slate-300"
                                } ${
                                  isActionLoading || actionLoading !== null
                                    ? "cursor-wait opacity-50"
                                    : "cursor-pointer"
                                }`}
                              >
                                <span
                                  className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                    product.active
                                      ? isArabic
                                        ? "-translate-x-7"
                                        : "translate-x-7"
                                      : isArabic
                                        ? "-translate-x-1"
                                        : "translate-x-1"
                                  }`}
                                />
                                <span
                                  className={`absolute text-[8px] font-black ${
                                    product.active
                                      ? isArabic
                                        ? "right-1.5 text-white"
                                        : "left-1.5 text-white"
                                      : isArabic
                                        ? "left-1.5 text-slate-600"
                                        : "right-1.5 text-slate-600"
                                  }`}
                                >
                                  {product.active ? "ON" : "OFF"}
                                </span>
                              </button>
                            </div>

                            {(product.lastStatusChangedByName || product.lastStatusChangedAt) && (
                              <div className="mt-1 text-[10px] leading-tight text-slate-500 max-w-[150px]">
                                {product.lastStatusChangedByName && (
                                  <div className="font-semibold text-slate-700 truncate">
                                    {product.active ? "ON" : "OFF"} by {product.lastStatusChangedByName}
                                  </div>
                                )}
                                {product.lastStatusChangedAt && (
                                  <div className="text-[9px] text-slate-400">
                                    {new Date(product.lastStatusChangedAt).toLocaleString(
                                      language === "ar" ? "ar-QA" : "en-GB",
                                      {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Action Buttons (Strictly Contained & Flexible for Zoom) */}
                          <td className="px-4 py-3 text-end whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap max-w-[180px] ml-auto">
                              <Link
                                href={`/products/${product._id}`}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-slate-900 transition shadow-2xs"
                              >
                                {t("view")}
                              </Link>

                              <Link
                                href={`/products/${product._id}/edit`}
                                className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800 transition shadow-2xs"
                              >
                                {t("edit")}
                              </Link>

                              <button
                                type="button"
                                onClick={() => void deleteProduct(product)}
                                disabled={actionLoading !== null}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition shadow-2xs"
                              >
                                {isActionLoading ? "..." : t("delete")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE & TABLET CARD VIEW (Visible on smaller screens, fully contained) */}
              <div className="block lg:hidden divide-y divide-slate-100 p-3 space-y-3 w-full max-w-full box-border">
                {filteredProducts.map((product) => {
                  const isActionLoading = actionLoading === product._id;
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
                    <div
                      key={`mobile-${product._id}`}
                      className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3 w-full max-w-full box-border overflow-hidden"
                    >
                      <div className="flex items-start gap-2.5 w-full">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={getProductName(product)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg text-slate-400">
                              📦
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                              {getProductName(product)}
                            </h3>
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 shrink-0">
                              {product.sku}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {getProductCategory(product)}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="font-black text-slate-900 text-xs sm:text-sm">
                              QAR {highestPrice.toFixed(2)}
                            </span>
                            <div className="min-w-0">
                              <EmployerRating product={product} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status Info for Mobile */}
                      {(product.lastStatusChangedByName || product.lastStatusChangedAt) && (
                        <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl text-[11px] text-slate-600 space-y-0.5">
                          {product.lastStatusChangedByName && (
                            <div className="font-semibold truncate">
                              {product.active ? "ON" : "OFF"} by {product.lastStatusChangedByName}
                            </div>
                          )}
                          {product.lastStatusChangedAt && (
                            <div className="text-[9px] text-slate-400">
                              {new Date(product.lastStatusChangedAt).toLocaleString(
                                language === "ar" ? "ar-QA" : "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Footer: Toggle Switch & Action Buttons */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 gap-2 flex-wrap">
                        {/* ON/OFF Switch */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openStatusDialog(product)}
                            disabled={isActionLoading || actionLoading !== null}
                            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all duration-200 ${
                              product.active ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                product.active
                                  ? isArabic
                                    ? "-translate-x-7"
                                    : "translate-x-7"
                                  : isArabic
                                    ? "-translate-x-1"
                                    : "translate-x-1"
                              }`}
                            />
                            <span
                              className={`absolute text-[8px] font-black ${
                                product.active
                                  ? isArabic
                                    ? "right-1.5 text-white"
                                    : "left-1.5 text-white"
                                  : isArabic
                                    ? "left-1.5 text-slate-600"
                                    : "right-1.5 text-slate-600"
                              }`}
                            >
                              {product.active ? "ON" : "OFF"}
                            </span>
                          </button>
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/products/${product._id}`}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition"
                          >
                            {t("view")}
                          </Link>

                          <Link
                            href={`/products/${product._id}/edit`}
                            className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800 transition"
                          >
                            {t("edit")}
                          </Link>

                          <button
                            type="button"
                            onClick={() => void deleteProduct(product)}
                            disabled={actionLoading !== null}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100 transition"
                          >
                            {t("delete")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Summary */}
        {!loading && products.length > 0 && (
          <div className="flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between px-1">
            <span>
              {isArabic
                ? `${filteredProducts.length} منتج معروض`
                : `${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""} displayed`}
            </span>
            <span>
              {message("Total Database Products: ", "إجمالي المنتجات في القاعدة: ")}
              <span className="font-bold text-slate-700">
                {products.length}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Employee PIN Confirmation Modal */}
      {statusTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 box-border overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm product status change"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeStatusDialog();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto box-border"
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                {statusTarget.active
                  ? message("Turn Product OFF", "إيقاف المنتج")
                  : message("Turn Product ON", "تشغيل المنتج")}
              </h2>

              <p className="mt-1 text-xs sm:text-sm font-bold text-indigo-600 truncate">
                {getProductName(statusTarget)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {message(
                  "Select the employee and enter their 3-digit security PIN to authorize this change.",
                  "اختر الموظف وأدخل رمز الأمان المكون من 3 أرقام للموافقة على التغيير."
                )}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="status-employee"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  {message("Employee Name *", "اسم الموظف *")}
                </label>

                <select
                  id="status-employee"
                  value={employeeId}
                  onChange={(e) => {
                    setEmployeeId(e.target.value);
                    setError("");
                  }}
                  disabled={employeeLoading || actionLoading !== null}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-slate-900 disabled:bg-slate-100 shadow-2xs"
                >
                  <option value="">
                    {employeeLoading
                      ? message("Loading employees...", "جارٍ تحميل الموظفين...")
                      : message("Select Employee", "اختر الموظف")}
                  </option>

                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name}
                    </option>
                  ))}
                </select>

                {employees.length === 0 && !employeeLoading && (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {message(
                      "No active employees found.",
                      "لم يتم العثور على موظفين نشطين."
                    )}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="employee-pin"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  {message("Employee PIN (3 digits) *", "رمز PIN للموظف (3 أرقام) *")}
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
                  placeholder={message("Enter 3-digit PIN", "أدخل 3 أرقام")}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-center text-base tracking-[0.4em] font-mono text-slate-900 outline-none focus:border-slate-900 shadow-2xs"
                  disabled={actionLoading !== null}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
                >
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={closeStatusDialog}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                {message("Cancel", "إلغاء")}
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
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 transition shadow-sm"
              >
                {actionLoading
                  ? message("Saving...", "جارٍ الحفظ...")
                  : statusTarget.active
                    ? message("Confirm OFF", "تأكيد الإيقاف")
                    : message("Confirm ON", "تأكيد التشغيل")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}