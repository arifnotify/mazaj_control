
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Unit = "g" | "kg" | "pcs" | "ml" | "L";
type WeightOption = {
  _id?: string;
  weight: number;
  unit: Unit;
  price: number;
};
type ProductType = "single" | "multiple";

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
  active: boolean;
  productType?: ProductType;
  singleWeight?: number | null;
  singleUnit?: Unit | null;
  variants?: WeightOption[];
};

type MarketplaceName = "Talabat" | "Snoonu" | "Rafeeq" | "Keeta";

type Marketplace = {
  _id?: string;
  productId: string;
  marketplace: MarketplaceName;
  available: boolean;
  price: number;
  nameEn?: string;
  nameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  image?: string;
  categoryEn?: string;
  categoryAr?: string;
  syncStatus: string;
};

type CompareResult = {
  marketplace: MarketplaceName;
  connected: boolean;
  healthy: boolean;
  issues: string[];
  available?: boolean;
  syncStatus?: string;
};

type Employee = {
  _id: string;
  name?: string;
  active?: boolean;
};

const marketplaceNames: MarketplaceName[] = [
  "Talabat",
  "Snoonu",
  "Rafeeq",
  "Keeta",
];

const issueTypes = [
  { key: "price", label: "Price" },
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
  { key: "image", label: "Image" },
  { key: "category", label: "Category" },
  { key: "availability", label: "Availability" },
];

const issueLabels: Record<string, string> = {
  price: "Price mismatch",
  name: "Name mismatch",
  description: "Description mismatch",
  image: "Image mismatch",
  category: "Category mismatch",
  availability: "Availability mismatch",
};

function marketplaceInitials(name: MarketplaceName) {
  return name.substring(0, 1);
}

function employeeDisplayName(employee: Employee) {
  return employee.name?.trim() || "Unnamed employee";
}

async function readJson(response: Response): Promise<any> {
  return response.json().catch(() => ({}));
}

function getErrorMessage(data: any, fallback: string) {
  return data?.message || data?.error || fallback;
}

export default function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [compareResults, setCompareResults] = useState<CompareResult[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [savingMarketplace, setSavingMarketplace] =
    useState<string | null>(null);

  const [selectedMarketplace, setSelectedMarketplace] =
    useState<MarketplaceName>("Talabat");

  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [reporterEmployeeId, setReporterEmployeeId] = useState("");
  const [issueNote, setIssueNote] = useState("");
  const [reportingIssues, setReportingIssues] = useState(false);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMarketplaceComparison(productId: string) {
      try {
        const response = await fetch(
          `/api/marketplaces/compare?productId=${encodeURIComponent(productId)}`,
          { cache: "no-store" }
        );

        const data = await readJson(response);

        if (!response.ok) {
          console.error("Marketplace comparison failed:", data);
          return;
        }

        const results = Array.isArray(data)
          ? data
          : Array.isArray(data.marketplaces)
            ? data.marketplaces
            : [];

        if (!cancelled) {
          setCompareResults(results);
        }
      } catch (error) {
        console.error("Comparison error:", error);
      }
    }

    async function loadData() {
      try {
        setLoading(true);
        setPageError("");

        const { id } = await params;

        const [productResponse, marketplaceResponse] = await Promise.all([
          fetch(`/api/products/${encodeURIComponent(id)}`, {
            cache: "no-store",
          }),
          fetch(
            `/api/marketplaces?productId=${encodeURIComponent(id)}`,
            { cache: "no-store" }
          ),
        ]);

        const productData = await readJson(productResponse);
        const marketplaceData = await readJson(marketplaceResponse);

        if (cancelled) return;

        if (!productResponse.ok) {
          throw new Error(
            getErrorMessage(productData, "Failed to load product.")
          );
        }

        // Supports both { success: true, product: {...} } and direct product.
        const loadedProduct: Product | undefined =
          productData?.product ?? productData;

        if (!loadedProduct?._id) {
          throw new Error("The product API did not return a valid product.");
        }

        setProduct(loadedProduct);

        if (!marketplaceResponse.ok) {
          console.error("Marketplace load failed:", marketplaceData);
        } else {
          // Supports an array or { marketplaces: [...] } response.
          const loadedMarketplaces: Marketplace[] = Array.isArray(
            marketplaceData
          )
            ? marketplaceData
            : Array.isArray(marketplaceData?.marketplaces)
              ? marketplaceData.marketplaces
              : [];

          setMarketplaces(loadedMarketplaces);
        }

        await loadMarketplaceComparison(id);
      } catch (error) {
        console.error("Failed to load product:", error);

        if (!cancelled) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load product."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    async function loadEmployees() {
      try {
        const response = await fetch("/api/employees", {
          cache: "no-store",
        });

        const data = await readJson(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(data, "Failed to load employees.")
          );
        }

        const allEmployees: Employee[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.employees)
            ? data.employees
            : [];

        if (!cancelled) {
          setEmployees(
            allEmployees.filter(
              (employee) =>
                employee.active !== false && Boolean(employee._id)
            )
          );
        }
      } catch (error) {
        console.error("Failed to load employees:", error);

        if (!cancelled) {
          setEmployees([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingEmployees(false);
        }
      }
    }

    void loadData();
    void loadEmployees();

    return () => {
      cancelled = true;
    };
  }, [params]);

  function getMarketplace(name: MarketplaceName) {
    return marketplaces.find((item) => item.marketplace === name);
  }

  function getCompareResult(name: MarketplaceName) {
    return compareResults.find((item) => item.marketplace === name);
  }

  async function refreshComparison(productId: string) {
    try {
      const response = await fetch(
        `/api/marketplaces/compare?productId=${encodeURIComponent(productId)}`,
        { cache: "no-store" }
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to refresh marketplace comparison.")
        );
      }

      const results = Array.isArray(data)
        ? data
        : Array.isArray(data?.marketplaces)
          ? data.marketplaces
          : [];

      setCompareResults(results);
    } catch (error) {
      console.error("Comparison refresh error:", error);
    }
  }

  async function toggleMarketplace(name: MarketplaceName) {
    if (!product || savingMarketplace) return;

    const current = getMarketplace(name);
    const nextAvailable = current ? !current.available : true;

    try {
      setSavingMarketplace(name);
      setPageError("");

      const response = await fetch("/api/marketplaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product._id,
          marketplace: name,
          available: nextAvailable,
          price: product.price,
          nameEn: product.nameEn,
          nameAr: product.nameAr,
          descriptionEn: product.descriptionEn || "",
          descriptionAr: product.descriptionAr || "",
          image: product.image || "",
          categoryEn: product.categoryEn || "",
          categoryAr: product.categoryAr || "",
          syncStatus: "pending",
        }),
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to update marketplace.")
        );
      }

      // Supports direct marketplace object or wrapped response.
      const savedMarketplace: Marketplace | undefined =
        data?.marketplace ?? data?.data ?? data;

      if (
        !savedMarketplace ||
        savedMarketplace.marketplace !== name ||
        typeof savedMarketplace.available !== "boolean"
      ) {
        throw new Error(
          "The marketplace API did not return the updated marketplace."
        );
      }

      setMarketplaces((currentList) => {
        const exists = currentList.some(
          (item) => item.marketplace === name
        );

        return exists
          ? currentList.map((item) =>
              item.marketplace === name
                ? { ...item, ...savedMarketplace }
                : item
            )
          : [...currentList, savedMarketplace];
      });

      await refreshComparison(product._id);
    } catch (error) {
      console.error("Marketplace update error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update marketplace."
      );
    } finally {
      setSavingMarketplace(null);
    }
  }

  function toggleIssue(type: string) {
    if (reportingIssues) return;

    setSelectedIssues((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    );
  }

  async function reportIssues() {
    if (!product || reportingIssues) return;

    if (loadingEmployees) {
      alert("Please wait until employees finish loading.");
      return;
    }

    if (!reporterEmployeeId) {
      alert("Please select the employee reporting this issue.");
      return;
    }

    if (!employees.some((employee) => employee._id === reporterEmployeeId)) {
      alert("Please select a valid active employee.");
      return;
    }

    if (selectedIssues.length === 0) {
      alert("Please select at least one issue.");
      return;
    }

    if (!issueNote.trim()) {
      alert("Please explain the issue in the note.");
      return;
    }

    if (issueNote.trim().length > 2000) {
      alert("The note cannot exceed 2000 characters.");
      return;
    }

    try {
      setReportingIssues(true);

      let successfulCount = 0;

      for (const type of selectedIssues) {
        const response = await fetch("/api/issues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product._id,
            marketplace: selectedMarketplace,
            type,
            note: issueNote.trim(),
            reporterEmployeeId,
          }),
        });

        const data = await readJson(response);

        if (!response.ok) {
          const message = getErrorMessage(
            data,
            "Failed to create issue."
          );

          if (successfulCount > 0) {
            throw new Error(
              `${successfulCount} issue(s) were saved, but another issue failed: ${message}. Check the Issues page before submitting again.`
            );
          }

          throw new Error(message);
        }

        successfulCount++;
      }

      alert(
        successfulCount === 1
          ? "Issue reported successfully."
          : `${successfulCount} issues reported successfully.`
      );

      setSelectedIssues([]);
      setIssueNote("");
      setReporterEmployeeId("");
    } catch (error) {
      console.error("Report issue error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to report issue."
      );
    } finally {
      setReportingIssues(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-5 w-32 rounded bg-gray-200" />
          <div className="h-10 w-80 rounded bg-gray-200" />
          <div className="h-4 w-48 rounded bg-gray-200" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="h-80 rounded-2xl bg-white" />
            <div className="h-80 rounded-2xl bg-white lg:col-span-2" />
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 md:p-8">
        <div className="mx-auto max-w-5xl rounded-2xl border bg-white p-12 text-center shadow-sm">
          <div className="text-3xl">📦</div>

          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            Product not found
          </h1>

          <p className="mt-2 text-gray-500">
            {pageError ||
              "The product could not be loaded. Check the API response."}
          </p>

          <Link
            href="/products"
            className="mt-6 inline-flex rounded-xl bg-gray-900 px-5 py-3 font-medium text-white hover:bg-gray-700"
          >
            Back to Products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8">
          <Link
            href="/products"
            className="text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            ← Products
          </Link>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  {product.nameEn}
                </h1>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    product.active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {product.active ? "Active" : "Inactive"}
                </span>
              </div>

              <p dir="rtl" className="mt-2 text-lg text-gray-500">
                {product.nameAr}
              </p>

              <p className="mt-2 text-sm text-gray-500">
                SKU:{" "}
                <span className="font-semibold text-gray-700">
                  {product.sku}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/products/${product._id}/edit`}
                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-700"
              >
                Edit Product
              </Link>

              <Link
                href="/products"
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Back
              </Link>
            </div>
          </div>
        </div>

        {pageError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {/* PRODUCT OVERVIEW */}
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gray-100">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.nameEn}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <div className="text-4xl">📦</div>
                  <p className="mt-2 text-sm">No image</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Master Product
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Main product information
                </p>
              </div>

              <div className="shrink-0 rounded-xl bg-gray-100 px-4 py-2 text-right">
                <p className="text-xs text-gray-500">Price</p>
                <p className="text-xl font-bold text-gray-900">
                  QAR {Number(product.price).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  English Name
                </p>
                <p className="mt-2 font-semibold text-gray-900">
                  {product.nameEn}
                </p>
              </div>

              <div dir="rtl">
                <p className="text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Arabic Name
                </p>
                <p className="mt-2 text-right font-semibold text-gray-900">
                  {product.nameAr}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  SKU
                </p>
                <p className="mt-2 font-semibold text-gray-900">
                  {product.sku}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Stock
                </p>
                <p
                  className={`mt-2 font-semibold ${
                    product.stock === 0
                      ? "text-red-600"
                      : product.stock <= 5
                        ? "text-yellow-600"
                        : "text-gray-900"
                  }`}
                >
                  {product.stock === 0
                    ? "Out of stock"
                    : product.stock <= 5
                      ? `${product.stock} — Low stock`
                      : product.stock}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Category
                </p>
                <p className="mt-2 font-semibold text-gray-900">
                  {product.categoryEn || "-"}
                </p>
              </div>

              <div dir="rtl">
                <p className="text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Arabic Category
                </p>
                <p className="mt-2 text-right font-semibold text-gray-900">
                  {product.categoryAr || "-"}
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-6 border-t border-gray-100 pt-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  English Description
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                  {product.descriptionEn || "No description"}
                </p>
              </div>

              <div dir="rtl">
                <p className="text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Arabic Description
                </p>
                <p className="mt-2 whitespace-pre-wrap text-right text-sm leading-6 text-gray-600">
                  {product.descriptionAr || "لا يوجد وصف"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* WEIGHT OPTIONS */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Weight Options & Pricing
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            One SKU and one shared stock across all weight options.
          </p>

          {product.productType === "multiple" &&
          product.variants?.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {product.variants.map((variant, index) => (
                <div
                  key={
                    variant._id ||
                    `${variant.weight}-${variant.unit}-${index}`
                  }
                  className="rounded-xl border bg-gray-50 p-4"
                >
                  <p className="font-semibold text-gray-900">
                    {variant.weight} {variant.unit}
                  </p>
                  <p className="mt-1 text-blue-700">
                    QAR {Number(variant.price).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-gray-700">
              {product.singleWeight
                ? `${product.singleWeight} ${product.singleUnit || "g"}`
                : "Single item (no weight)"}{" "}
              — QAR {Number(product.price).toFixed(2)}
            </p>
          )}
        </section>

        {/* MARKETPLACE COMPARISON */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Marketplace Sync Check
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Compare marketplace data with the master product.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void refreshComparison(product._id)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ↻ Refresh comparison
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {marketplaceNames.map((name) => {
              const result = getCompareResult(name);

              return (
                <div
                  key={name}
                  className={`rounded-2xl border p-5 ${
                    !result
                      ? "border-gray-200 bg-gray-50"
                      : result.healthy
                        ? "border-green-200 bg-green-50"
                        : result.connected
                          ? "border-yellow-200 bg-yellow-50"
                          : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-bold text-gray-700 shadow-sm">
                        {marketplaceInitials(name)}
                      </div>
                      <h3 className="font-bold text-gray-900">{name}</h3>
                    </div>

                    <span className="text-xl">
                      {!result
                        ? "…"
                        : result.healthy
                          ? "✅"
                          : result.connected
                            ? "⚠️"
                            : "❌"}
                    </span>
                  </div>

                  {!result ? (
                    <p className="mt-5 text-sm text-gray-500">
                      No comparison result available.
                    </p>
                  ) : !result.connected ? (
                    <div className="mt-5">
                      <p className="font-semibold text-red-600">
                        Not Connected
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Marketplace data is not available.
                      </p>
                    </div>
                  ) : result.healthy ? (
                    <div className="mt-5">
                      <p className="font-semibold text-green-600">
                        Synced
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        All checked fields match.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5">
                      <p className="font-semibold text-yellow-700">
                        Mismatch Found
                      </p>

                      <div className="mt-3 space-y-2">
                        {result.issues.map((issue) => (
                          <div
                            key={issue}
                            className="rounded-lg border border-yellow-200 bg-white px-3 py-2 text-sm text-gray-700"
                          >
                            ⚠️ {issueLabels[issue] || issue}
                          </div>
                        ))}

                        {result.issues.length === 0 && (
                          <p className="text-sm text-gray-500">
                            Check the comparison API for details.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* MARKETPLACE AVAILABILITY */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Marketplace Availability
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Control whether this product is marked available on each marketplace.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {marketplaceNames.map((name) => {
              const marketplaceData = getMarketplace(name);
              const available = marketplaceData?.available ?? false;
              const saving = savingMarketplace === name;

              return (
                <div
                  key={name}
                  className="rounded-2xl border border-gray-200 p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 font-bold text-gray-700">
                        {marketplaceInitials(name)}
                      </div>
                      <h3 className="font-bold text-gray-900">{name}</h3>
                    </div>

                    <span
                      className={`h-3 w-3 rounded-full ${
                        available ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                  </div>

                  <div
                    className={`mt-5 rounded-xl px-4 py-3 ${
                      available ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        available ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {available ? "Available" : "Unavailable"}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={savingMarketplace !== null}
                    onClick={() => void toggleMarketplace(name)}
                    className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                      available
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {saving
                      ? "Saving..."
                      : available
                        ? "Turn OFF"
                        : "Turn ON"}
                  </button>

                  <p className="mt-3 break-words text-center text-xs text-gray-400">
                    Sync: {marketplaceData?.syncStatus || "not_connected"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* REPORT ISSUE */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Report Marketplace Issue
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Select the marketplace, issue types, reporter and explain the problem.
            </p>
          </div>

          {/* REPORTER */}
          <div className="mt-7">
            <label
              htmlFor="reporter"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Reported By / Reporter Name
            </label>

            <select
              id="reporter"
              value={reporterEmployeeId}
              onChange={(event) => setReporterEmployeeId(event.target.value)}
              disabled={loadingEmployees || reportingIssues}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-gray-500 disabled:bg-gray-100"
            >
              <option value="">
                {loadingEmployees
                  ? "Loading employees..."
                  : "Select employee"}
              </option>

              {employees.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employeeDisplayName(employee)}
                </option>
              ))}
            </select>

            {!loadingEmployees && employees.length === 0 && (
              <p className="mt-2 text-sm text-red-600">
                No active employees found. Check the Employees page and the
                /api/employees response.
              </p>
            )}
          </div>

          {/* MARKETPLACE SELECTOR */}
          <div className="mt-7">
            <p className="mb-3 text-sm font-semibold text-gray-700">
              Marketplace
            </p>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {marketplaceNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  disabled={reportingIssues}
                  onClick={() => setSelectedMarketplace(name)}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-50 ${
                    selectedMarketplace === name
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* ISSUE TYPES */}
          <div className="mt-7">
            <p className="mb-3 text-sm font-semibold text-gray-700">
              What is wrong?
            </p>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {issueTypes.map((issue) => {
                const checked = selectedIssues.includes(issue.key);

                return (
                  <label
                    key={issue.key}
                    className={`flex cursor-pointer items-center rounded-xl border p-4 ${
                      checked
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={reportingIssues}
                      onChange={() => toggleIssue(issue.key)}
                      className="h-4 w-4"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      {issue.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ISSUE NOTE */}
          <div className="mt-7">
            <label
              htmlFor="issue-note"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Note / Explain the problem
            </label>

            <textarea
              id="issue-note"
              value={issueNote}
              onChange={(event) => setIssueNote(event.target.value)}
              rows={4}
              maxLength={2000}
              disabled={reportingIssues}
              placeholder="Example: The price on Keeta is QAR 25, but the correct price is QAR 44."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-500 disabled:bg-gray-100"
            />

            <p className="mt-1 text-right text-xs text-gray-400">
              {issueNote.length}/2000
            </p>
          </div>

          {selectedIssues.length > 0 && (
            <div className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {selectedIssues.length} issue
              {selectedIssues.length > 1 ? "s" : ""} selected for{" "}
              <strong>{selectedMarketplace}</strong>
            </div>
          )}

          <button
            type="button"
            disabled={
              reportingIssues ||
              selectedIssues.length === 0 ||
              !reporterEmployeeId ||
              !issueNote.trim() ||
              loadingEmployees
            }
            onClick={() => void reportIssues()}
            className="mt-6 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {reportingIssues ? "Reporting..." : "Report Issue"}
          </button>
        </section>
      </div>
    </main>
  );
}
