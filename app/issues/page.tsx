"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

type MarketplaceName = "Talabat" | "Snoonu" | "Rafeeq" | "Keeta";

type IssueType =
  | "price"
  | "name"
  | "description"
  | "image"
  | "category"
  | "availability"
  | "other";

type IssueStatus =
  | "open"
  | "in_progress"
  | "fixed"
  | "verified"
  | "closed";

type ProductInfo = {
  _id: string;
  sku?: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  categoryEn?: string;
  categoryAr?: string;
  category?: string | { name?: string; nameEn?: string; nameAr?: string } | null;
  image?: string;
};

type MarketplaceStatus = {
  marketplace: MarketplaceName;
  connected: boolean;
  available: boolean | null;
  syncStatus: string;
};

type ProductStatus = ProductInfo & {
  marketplaces: MarketplaceStatus[];
};

type EmployeeInfo = {
  _id?: string;
  name?: string;
};

type IssueRecord = {
  _id: string;
  productId: ProductInfo | string | null;
  marketplace: MarketplaceName;
  type: IssueType;
  note?: string;
  reporterName?: string;
  reporterEmployeeId?: EmployeeInfo | string | null;
  status: IssueStatus;
  createdAt?: string;
  updatedAt?: string;
};

const MARKETPLACES: MarketplaceName[] = [
  "Talabat",
  "Snoonu",
  "Rafeeq",
  "Keeta",
];

const ISSUE_TYPES: IssueType[] = [
  "price",
  "name",
  "description",
  "image",
  "category",
  "availability",
  "other",
];

const ISSUE_STATUSES: IssueStatus[] = [
  "open",
  "in_progress",
  "fixed",
  "verified",
  "closed",
];

const STATUS_LABELS: Record<IssueStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  fixed: "Fixed",
  verified: "Verified",
  closed: "Closed",
};

function getProductName(
  product: ProductInfo | string | null | undefined
): string {
  if (!product) return "Unknown product";
  if (typeof product === "string") return product;
  return (
    product.nameEn ||
    product.name ||
    product.nameAr ||
    product.sku ||
    "Unknown product"
  );
}

function getProductImage(product: ProductInfo | string | null | undefined): string {
  if (!product || typeof product === "string") return "";
  return typeof product.image === "string" ? product.image.trim() : "";
}

function getProductSku(
  product: ProductInfo | string | null | undefined
): string {
  if (!product || typeof product === "string") return "";
  return product.sku || "";
}

function getCategoryName(product: ProductInfo): string {
  const categoryEn = product.categoryEn?.trim();
  const categoryAr = product.categoryAr?.trim();

  if (categoryEn) return categoryEn;
  if (categoryAr) return categoryAr;

  const category = product.category;

  if (!category) return "Uncategorized";
  if (typeof category === "string") {
    return category.trim() || "Uncategorized";
  }

  return (
    category.nameEn?.trim() ||
    category.name?.trim() ||
    category.nameAr?.trim() ||
    "Uncategorized"
  );
}

function getEmployeeName(
  employee: EmployeeInfo | string | null | undefined
): string {
  if (!employee) return "";
  if (typeof employee === "string") return employee;
  return employee.name || "";
}

function formatDate(date?: string): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

function statusColor(status: IssueStatus): string {
  switch (status) {
    case "open":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "in_progress":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "fixed":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "verified":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "closed":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function MarketplaceBadge({
  marketplace,
}: {
  marketplace: MarketplaceStatus;
}) {
  if (!marketplace.connected) {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-500/10">
        Not Connected
      </span>
    );
  }

  if (marketplace.available === true) {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        ● ON
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
      ● OFF
    </span>
  );
}

export default function IssuesPage() {
  const { language, isArabic } = useLanguage();
  const tr = (english: string, arabic: string) => (isArabic ? arabic : english);
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [products, setProducts] = useState<ProductStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [issuesResponse, productsResponse] = await Promise.all([
        fetch("/api/issues", { cache: "no-store" }),
        fetch("/api/marketplaces/status", { cache: "no-store" }),
      ]);

      const issuesData = await issuesResponse.json();
      const productsData = await productsResponse.json();

      if (!issuesResponse.ok) {
        throw new Error(
          issuesData.message || "Failed to load reported issues."
        );
      }
      if (!productsResponse.ok) {
        throw new Error(
          productsData.message || "Failed to load marketplace statuses."
        );
      }

      const issueList = Array.isArray(issuesData)
        ? issuesData
        : Array.isArray(issuesData.issues)
          ? issuesData.issues
          : [];

      const productList = Array.isArray(productsData)
        ? productsData
        : Array.isArray(productsData.products)
          ? productsData.products
          : [];

      setIssues(issueList);
      setProducts(productList);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const productCategories = useMemo(() => {
    const categories = products.map((product) => getCategoryName(product));
    return Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.name?.toLowerCase().includes(term) ||
        product.nameEn?.toLowerCase().includes(term) ||
        product.nameAr?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term);

      const matchesCategory =
        categoryFilter === "all" ||
        getCategoryName(product) === categoryFilter;

      const matchesMarketplace =
        marketplaceFilter === "all" ||
        product.marketplaces.some(
          (item) => item.marketplace === marketplaceFilter
        );

      const matchesAvailability =
        availabilityFilter === "all" ||
        product.marketplaces.some((item) => {
          if (
            marketplaceFilter !== "all" &&
            item.marketplace !== marketplaceFilter
          ) {
            return false;
          }
          if (availabilityFilter === "connected") return item.connected;
          if (availabilityFilter === "on") return item.connected && item.available === true;
          if (availabilityFilter === "off") return item.connected && item.available === false;
          if (availabilityFilter === "not_connected") return !item.connected;
          return true;
        });

      return (
        Boolean(matchesSearch) &&
        matchesCategory &&
        matchesMarketplace &&
        matchesAvailability
      );
    });
  }, [
    products,
    search,
    categoryFilter,
    marketplaceFilter,
    availabilityFilter,
  ]);

  const filteredIssues = useMemo(() => {
    const term = search.trim().toLowerCase();
    return issues.filter((issue) => {
      const productName = getProductName(issue.productId);
      const sku = getProductSku(issue.productId);
      const employeeName =
        issue.reporterName || getEmployeeName(issue.reporterEmployeeId);

      const matchesSearch =
        !term ||
        productName.toLowerCase().includes(term) ||
        sku.toLowerCase().includes(term) ||
        (issue.note || "").toLowerCase().includes(term) ||
        employeeName.toLowerCase().includes(term);

      const matchesMarketplace =
        marketplaceFilter === "all" ||
        issue.marketplace === marketplaceFilter;

      const matchesType =
        typeFilter === "all" || issue.type === typeFilter;

      const matchesStatus =
        statusFilter === "all" || issue.status === statusFilter;

      return (
        matchesSearch &&
        matchesMarketplace &&
        matchesType &&
        matchesStatus
      );
    });
  }, [
    issues,
    search,
    marketplaceFilter,
    typeFilter,
    statusFilter,
  ]);

  const marketplaceCounts = useMemo(() => {
    let on = 0;
    let off = 0;
    let notConnected = 0;
    for (const product of products) {
      for (const item of product.marketplaces || []) {
        if (!item.connected) {
          notConnected++;
        } else if (item.available === true) {
          on++;
        } else {
          off++;
        }
      }
    }
    return { on, off, notConnected };
  }, [products]);

  async function updateIssueStatus(
    issueId: string,
    newStatus: IssueStatus
  ) {
    setError("");
    setSuccess("");
    setUpdatingId(issueId);
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update issue status.");
      }

      setIssues((previous) =>
        previous.map((issue) =>
          issue._id === issueId
            ? { ...issue, status: newStatus }
            : issue
        )
      );
      setSuccess("Issue status updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update issue status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteIssue(issueId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this reported issue? This cannot be undone."
    );
    if (!confirmed) return;
    setError("");
    setSuccess("");
    setDeletingId(issueId);
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete issue.");
      }

      setIssues((previous) =>
        previous.filter((issue) => issue._id !== issueId)
      );
      setSuccess("Issue permanently deleted from the database.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete issue."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const openCount = issues.filter((issue) => issue.status === "open").length;
  const inProgressCount = issues.filter(
    (issue) => issue.status === "in_progress"
  ).length;
  const fixedCount = issues.filter(
    (issue) => issue.status === "fixed"
  ).length;
  const closedCount = issues.filter(
    (issue) => issue.status === "closed"
  ).length;

  return (
    <main lang={language} dir={isArabic ? "rtl" : "ltr"} className="min-h-screen space-y-8 bg-slate-50/70 p-4 text-slate-900 sm:p-6 lg:p-10 font-sans">
      
      {/* Top Header Section */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              Mazaj Operations
            </span>
            <span className="text-xs text-slate-400" lang="ar" dir="rtl">
              إدارة العمليات والمنتجات
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {tr("Issues & Marketplace Status", "المشكلات وحالة الأسواق")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {tr("Monitor real-time product availability across platforms and manage operational logs.", "راقب توفر المنتجات عبر المنصات وأدر سجلات العمليات.")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {tr("Refreshing...", "جارٍ التحديث...")}
            </span>
          ) : (
            tr("Refresh Data", "تحديث البيانات")
          )}
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 shadow-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-800 font-bold">✕</button>
        </div>
      )}

      {success && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 shadow-sm flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-800 font-bold">✕</button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{tr("Total Products", "إجمالي المنتجات")}</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{products.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Marketplace ON</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">{marketplaceCounts.on}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Marketplace OFF</p>
          <p className="mt-2 text-3xl font-black text-rose-600">{marketplaceCounts.off}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Not Connected</p>
          <p className="mt-2 text-3xl font-black text-slate-500">{marketplaceCounts.notConnected}</p>
        </div>
      </section>

      {/* Marketplace Status Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">{tr("Product Marketplace Status", "حالة المنتجات في الأسواق")}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {tr("ON indicates product availability in delivery apps. OFF means unavailable.", "تعني ON أن المنتج متوفر في تطبيقات التوصيل، وتعني OFF أنه غير متوفر.")}
          </p>
        </div>

        {/* Filters Toolbar */}
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={tr("Search product name or SKU...", "ابحث باسم المنتج أو رمز SKU...")}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filter products by category"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 shadow-sm"
          >
            <option value="all">{tr("All Categories", "كل الفئات")}</option>
            {productCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={marketplaceFilter}
            onChange={(event) => setMarketplaceFilter(event.target.value)}
            aria-label="Filter products by marketplace"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 shadow-sm"
          >
            <option value="all">{tr("All Marketplaces", "كل الأسواق")}</option>
            {MARKETPLACES.map((marketplace) => (
              <option key={marketplace} value={marketplace}>{marketplace}</option>
            ))}
          </select>
          <select
            value={availabilityFilter}
            onChange={(event) => setAvailabilityFilter(event.target.value)}
            aria-label="Filter products by availability status"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 shadow-sm"
          >
            <option value="all">{tr("All Availability", "كل حالات التوفر")}</option>
            <option value="on">{tr("ON only", "المتوفر فقط")}</option>
            <option value="off">{tr("OFF only", "غير المتوفر فقط")}</option>
            <option value="not_connected">{tr("Not Connected", "غير متصل")}</option>
            <option value="connected">{tr("Connected only", "المتصل فقط")}</option>
          </select>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block max-h-[60vh] overflow-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 shadow-xs">
              <tr>
                <th className="px-5 py-3.5 font-bold">Product</th>
                <th className="px-5 py-3.5 font-bold">SKU</th>
                {MARKETPLACES.map((marketplace) => (
                  <th key={marketplace} className="px-4 py-3.5 text-center font-bold">
                    {marketplace}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">{tr("Loading marketplace statuses...", "جارٍ تحميل حالات الأسواق...")}</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">{tr("No products found.", "لم يتم العثور على منتجات.")}</td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-slate-50/85 transition-colors">
                    <td className="px-5 py-3.5 font-medium">
                      <div className="flex items-center gap-3">
                        {getProductImage(product) ? (
                          <img src={getProductImage(product)} alt={getProductName(product)} className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1" loading="lazy" />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-1 text-center text-[10px] text-slate-400">{tr("No image", "لا توجد صورة")}</div>
                        )}
                        <div className="min-w-0">
                          <Link href={`/products/${product._id}`} className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline">
                            {isArabic ? (product.nameAr || getProductName(product)) : getProductName(product)}
                          </Link>
                          <p className="mt-0.5 text-xs text-slate-400">{tr("Category", "الفئة")}: {isArabic ? (product.categoryAr || getCategoryName(product)) : getCategoryName(product)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">
                      {product.sku || "—"}
                    </td>
                    {MARKETPLACES.map((marketplaceName) => {
                      const marketplace = (product.marketplaces || []).find(
                        (item) => item.marketplace === marketplaceName
                      );
                      return (
                        <td key={marketplaceName} className="px-4 py-3.5 text-center">
                          {marketplace ? (
                            <MarketplaceBadge marketplace={marketplace} />
                          ) : (
                            <MarketplaceBadge
                              marketplace={{
                                marketplace: marketplaceName,
                                connected: false,
                                available: null,
                                syncStatus: "not_connected",
                              }}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (For small screens) */}
        <div className="block md:hidden divide-y divide-slate-100 max-h-[65vh] overflow-auto p-4 space-y-3">
          {loading ? (
            <div className="py-10 text-center text-slate-400 text-sm">{tr("Loading statuses...", "جارٍ تحميل الحالات...")}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">{tr("No products found.", "لم يتم العثور على منتجات.")}</div>
          ) : (
            filteredProducts.map((product) => (
              <div key={product._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-start gap-3">
                  {getProductImage(product) ? (
                    <img src={getProductImage(product)} alt={getProductName(product)} className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1" loading="lazy" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-1 text-center text-[10px] text-slate-400">{tr("No image", "لا توجد صورة")}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${product._id}`} className="text-indigo-600 font-bold text-sm hover:underline">
                      {isArabic ? (product.nameAr || getProductName(product)) : getProductName(product)}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">SKU: {product.sku || "—"} · {isArabic ? (product.categoryAr || getCategoryName(product)) : getCategoryName(product)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  {MARKETPLACES.map((marketplaceName) => {
                    const marketplace = (product.marketplaces || []).find(
                      (item) => item.marketplace === marketplaceName
                    );
                    return (
                      <div key={marketplaceName} className="flex justify-between items-center bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs">
                        <span className="font-medium text-slate-600">{marketplaceName}</span>
                        {marketplace ? (
                          <MarketplaceBadge marketplace={marketplace} />
                        ) : (
                          <MarketplaceBadge
                            marketplace={{
                              marketplace: marketplaceName,
                              connected: false,
                              available: null,
                              syncStatus: "not_connected",
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 bg-slate-50/50">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      </section>

      {/* {tr("Reported Issues", "المشكلات المُبلّغ عنها")} Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{tr("Reported Issues", "المشكلات المُبلّغ عنها")}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {tr("Manage operational issues, adjust status, or clear resolved logs.", "أدر المشكلات التشغيلية وحدّث حالتها أو احذف السجلات التي تم حلها.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-rose-50 px-3 py-1 font-bold text-rose-700 border border-rose-200">
              Open: {openCount}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 font-bold text-amber-800 border border-amber-200">
              In Progress: {inProgressCount}
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1 font-bold text-sky-700 border border-sky-200">
              Fixed: {fixedCount}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700 border border-slate-200">
              Closed: {closedCount}
            </span>
          </div>
        </div>

        {/* Issue Filters Toolbar */}
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 p-4 md:grid-cols-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={tr("Search product, SKU, employee, note...", "ابحث عن المنتج أو SKU أو الموظف أو الملاحظة...")}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 shadow-sm"
          />
          <select
            value={marketplaceFilter}
            onChange={(event) => setMarketplaceFilter(event.target.value)}
            aria-label="Filter issues by marketplace"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 shadow-sm"
          >
            <option value="all">{tr("All Marketplaces", "كل الأسواق")}</option>
            {MARKETPLACES.map((marketplace) => (
              <option key={marketplace} value={marketplace}>{marketplace}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="Filter issues by type"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 shadow-sm"
          >
            <option value="all">{tr("All Issue Types", "كل أنواع المشكلات")}</option>
            {ISSUE_TYPES.map((type) => (
              <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter issues by status"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 shadow-sm"
          >
            <option value="all">{tr("All Statuses", "كل الحالات")}</option>
            {ISSUE_STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </div>

        {/* Desktop Issues Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 font-bold">
              <tr>
                <th className="px-5 py-3.5">Product</th>
                <th className="px-4 py-3.5">Marketplace</th>
                <th className="px-4 py-3.5">Issue Type</th>
                <th className="px-4 py-3.5">Note</th>
                <th className="px-4 py-3.5">Reported By</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">{tr("Loading reported issues...", "جارٍ تحميل المشكلات المُبلّغ عنها...")}</td>
                </tr>
              ) : filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">{tr("No reported issues found.", "لم يتم العثور على مشكلات مُبلّغ عنها.")}</td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr key={issue._id} className="align-top hover:bg-slate-50/85 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/products/${
                          typeof issue.productId === "object" && issue.productId
                            ? issue.productId._id
                            : ""
                        }`}
                        className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {getProductName(issue.productId)}
                      </Link>
                      {getProductSku(issue.productId) && (
                        <p className="mt-0.5 text-xs text-slate-400 font-mono">
                          SKU: {getProductSku(issue.productId)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-700">{issue.marketplace}</td>
                    <td className="px-4 py-3.5 capitalize text-slate-600">
                      <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold">
                        {issue.type}
                      </span>
                    </td>
                    <td className="max-w-[240px] whitespace-pre-wrap px-4 py-3.5 text-slate-600 text-xs">
                      {issue.note || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs font-medium">
                      {issue.reporterName ||
                        getEmployeeName(issue.reporterEmployeeId) ||
                        "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-500 text-xs">
                      {formatDate(issue.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold border ${statusColor(
                            issue.status
                          )}`}
                        >
                          {STATUS_LABELS[issue.status] || issue.status}
                        </span>
                        <select
                          value={issue.status}
                          disabled={
                            updatingId === issue._id ||
                            deletingId === issue._id
                          }
                          onChange={(event) =>
                            void updateIssueStatus(
                              issue._id,
                              event.target.value as IssueStatus
                            )
                          }
                          aria-label={`Update status for issue on ${getProductName(issue.productId)}`}
                          className="block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 disabled:opacity-50"
                        >
                          {ISSUE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {typeof issue.productId === "object" &&
                          issue.productId && (
                            <Link
                              href={`/products/${issue.productId._id}`}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                            >
                              View
                            </Link>
                          )}
                        <button
                          type="button"
                          onClick={() => void deleteIssue(issue._id)}
                          disabled={
                            deletingId === issue._id ||
                            updatingId === issue._id
                          }
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 shadow-2xs transition-colors"
                        >
                          {deletingId === issue._id ? "..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Card View for Issues */}
        <div className="block lg:hidden divide-y divide-slate-100 p-4 space-y-3">
          {loading ? (
            <div className="py-10 text-center text-slate-400 text-sm">{tr("Loading issues...", "جارٍ تحميل المشكلات...")}</div>
          ) : filteredIssues.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">{tr("No reported issues found.", "لم يتم العثور على مشكلات مُبلّغ عنها.")}</div>
          ) : (
            filteredIssues.map((issue) => (
              <div key={issue._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <Link
                      href={`/products/${
                        typeof issue.productId === "object" && issue.productId
                          ? issue.productId._id
                          : ""
                      }`}
                      className="font-bold text-indigo-600 text-sm hover:underline"
                    >
                      {getProductName(issue.productId)}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">SKU: {getProductSku(issue.productId) || "—"}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold border ${statusColor(issue.status)}`}>
                    {STATUS_LABELS[issue.status]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg text-slate-600">
                  <div><strong className="text-slate-400">Marketplace:</strong> {issue.marketplace}</div>
                  <div><strong className="text-slate-400">Type:</strong> <span className="capitalize">{issue.type}</span></div>
                  <div className="col-span-2"><strong className="text-slate-400">Note:</strong> {issue.note || "—"}</div>
                  <div><strong className="text-slate-400">By:</strong> {issue.reporterName || getEmployeeName(issue.reporterEmployeeId) || "—"}</div>
                  <div><strong className="text-slate-400">Date:</strong> {formatDate(issue.createdAt)}</div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <select
                    value={issue.status}
                    disabled={updatingId === issue._id || deletingId === issue._id}
                    onChange={(event) =>
                      void updateIssueStatus(
                        issue._id,
                        event.target.value as IssueStatus
                      )
                    }
                    aria-label={`Update status for issue on ${getProductName(issue.productId)}`}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 outline-none"
                  >
                    {ISSUE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>

                  {typeof issue.productId === "object" && issue.productId && (
                    <Link
                      href={`/products/${issue.productId._id}`}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      View
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => void deleteIssue(issue._id)}
                    disabled={deletingId === issue._id || updatingId === issue._id}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    {deletingId === issue._id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 bg-slate-50/50">
          Showing {filteredIssues.length} of {issues.length} reported issues
        </div>
      </section>

    </main>
  );
}
