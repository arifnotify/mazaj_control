"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = {
  _id: string;
  sku: string;

  nameEn: string;
  nameAr: string;

  descriptionEn?: string;
  descriptionAr?: string;

  image: string;

  categoryEn?: string;
  categoryAr?: string;

  price: number;
  stock: number;
  active: boolean;
};

type MarketplaceName =
  | "Talabat"
  | "Snoonu"
  | "Rafeeq"
  | "Keeta";

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

  image: string;

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

const marketplaceNames: MarketplaceName[] = [
  "Talabat",
  "Snoonu",
  "Rafeeq",
  "Keeta",
];

const issueTypes = [
  {
    key: "price",
    label: "Price",
  },
  {
    key: "name",
    label: "Name",
  },
  {
    key: "description",
    label: "Description",
  },
  {
    key: "image",
    label: "Image",
  },
  {
    key: "category",
    label: "Category",
  },
  {
    key: "availability",
    label: "Availability",
  },
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

export default function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [product, setProduct] = useState<Product | null>(null);

  const [marketplaces, setMarketplaces] = useState<
    Marketplace[]
  >([]);

  const [compareResults, setCompareResults] = useState<
    CompareResult[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [savingMarketplace, setSavingMarketplace] =
    useState<string | null>(null);

  const [selectedMarketplace, setSelectedMarketplace] =
    useState<MarketplaceName>("Talabat");

  const [selectedIssues, setSelectedIssues] =
    useState<string[]>([]);

  const [reportingIssues, setReportingIssues] =
    useState(false);

  async function loadMarketplaceComparison(productId: string) {
    try {
      const response = await fetch(
        `/api/marketplaces/compare?productId=${productId}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (
        response.ok &&
        Array.isArray(data.marketplaces)
      ) {
        setCompareResults(data.marketplaces);
      }
    } catch (error) {
      console.error(
        "Comparison error:",
        error
      );
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        const { id } = await params;

        // =========================
        // PRODUCT
        // =========================

        const productResponse = await fetch(
          `/api/products/${id}`,
          {
            cache: "no-store",
          }
        );

        const productData =
          await productResponse.json();

        if (productResponse.ok) {
          setProduct(productData);
        }

        // =========================
        // MARKETPLACES
        // =========================

        const marketplaceResponse =
          await fetch(
            `/api/marketplaces?productId=${id}`,
            {
              cache: "no-store",
            }
          );

        const marketplaceData =
          await marketplaceResponse.json();

        if (
          marketplaceResponse.ok &&
          Array.isArray(marketplaceData)
        ) {
          setMarketplaces(marketplaceData);
        }

        // =========================
        // COMPARISON
        // =========================

        await loadMarketplaceComparison(id);
      } catch (error) {
        console.error(
          "Failed to load product:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params]);

  function getMarketplace(
    marketplace: MarketplaceName
  ) {
    return marketplaces.find(
      (item) =>
        item.marketplace === marketplace
    );
  }

  function getCompareResult(
    marketplace: MarketplaceName
  ) {
    return compareResults.find(
      (item) =>
        item.marketplace === marketplace
    );
  }

  async function toggleMarketplace(
    marketplace: MarketplaceName
  ) {
    if (!product) return;

    const current =
      getMarketplace(marketplace);

    try {
      setSavingMarketplace(marketplace);

      const response = await fetch(
        "/api/marketplaces",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            productId: product._id,
            marketplace,

            available: current
              ? !current.available
              : true,

            price: product.price,

            nameEn: product.nameEn,
            nameAr: product.nameAr,

            descriptionEn:
              product.descriptionEn || "",

            descriptionAr:
              product.descriptionAr || "",

            image: product.image,

            categoryEn:
              product.categoryEn || "",

            categoryAr:
              product.categoryAr || "",

            syncStatus: "pending",
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Failed to update marketplace"
        );
        return;
      }

      setMarketplaces(
        (currentList) => {
          const exists =
            currentList.some(
              (item) =>
                item.marketplace ===
                marketplace
            );

          if (exists) {
            return currentList.map(
              (item) =>
                item.marketplace ===
                marketplace
                  ? data
                  : item
            );
          }

          return [
            ...currentList,
            data,
          ];
        }
      );

      await loadMarketplaceComparison(
        product._id
      );
    } catch (error) {
      console.error(
        "Marketplace update error:",
        error
      );

      alert(
        "Failed to update marketplace"
      );
    } finally {
      setSavingMarketplace(null);
    }
  }

  function toggleIssue(type: string) {
    setSelectedIssues(
      (current) =>
        current.includes(type)
          ? current.filter(
              (item) =>
                item !== type
            )
          : [
              ...current,
              type,
            ]
    );
  }

  async function reportIssues() {
    if (!product) return;

    if (selectedIssues.length === 0) {
      alert(
        "Please select at least one issue."
      );
      return;
    }

    try {
      setReportingIssues(true);

      for (const type of selectedIssues) {
        const response = await fetch(
          "/api/issues",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              productId: product._id,
              marketplace:
                selectedMarketplace,
              type,
              note: "",
            }),
          }
        );

        if (!response.ok) {
          const data =
            await response.json();

          throw new Error(
            data.error ||
              "Failed to create issue"
          );
        }
      }

      alert(
        "Issue(s) reported successfully."
      );

      setSelectedIssues([]);
    } catch (error) {
      console.error(
        "Report issue error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to report issue."
      );
    } finally {
      setReportingIssues(false);
    }
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">

            <div className="h-5 w-32 rounded bg-gray-200" />

            <div className="h-10 w-80 rounded bg-gray-200" />

            <div className="h-4 w-48 rounded bg-gray-200" />

            <div className="grid gap-6 lg:grid-cols-3">

              <div className="h-80 rounded-2xl bg-white" />

              <div className="h-80 rounded-2xl bg-white lg:col-span-2" />

            </div>

          </div>
        </div>
      </main>
    );
  }

  // =========================
  // NOT FOUND
  // =========================

  if (!product) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-2xl">
              ?
            </div>

            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Product not found
            </h1>

            <p className="mt-2 text-gray-500">
              The product you are looking for
              does not exist.
            </p>

            <Link
              href="/products"
              className="mt-6 inline-flex rounded-xl bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-700"
            >
              Back to Products
            </Link>

          </div>
        </div>
      </main>
    );
  }

  // =========================
  // MAIN
  // =========================

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">

      <div className="mx-auto max-w-7xl">

        {/* ================================= */}
        {/* HEADER */}
        {/* ================================= */}

        <div className="mb-8">

          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
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
                  {product.active
                    ? "Active"
                    : "Inactive"}
                </span>

              </div>

              <p
                dir="rtl"
                className="mt-2 text-lg text-gray-500"
              >
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
                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
              >
                Edit Product
              </Link>

              <Link
                href="/products"
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Back
              </Link>

            </div>

          </div>
        </div>

        {/* ================================= */}
        {/* PRODUCT OVERVIEW */}
        {/* ================================= */}

        <div className="mb-6 grid gap-6 lg:grid-cols-3">

          {/* IMAGE */}

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
                  <div className="text-4xl">
                    📦
                  </div>

                  <p className="mt-2 text-sm">
                    No image
                  </p>
                </div>
              )}

            </div>

          </div>

          {/* PRODUCT INFORMATION */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">

            <div className="flex items-center justify-between">

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Master Product
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Main product information
                </p>
              </div>

              <div className="rounded-xl bg-gray-100 px-4 py-2 text-right">

                <p className="text-xs text-gray-500">
                  Price
                </p>

                <p className="text-xl font-bold text-gray-900">
                  QAR{" "}
                  {Number(
                    product.price
                  ).toFixed(2)}
                </p>

              </div>

            </div>

            <div className="mt-7 grid gap-6 sm:grid-cols-2">

              {/* EN NAME */}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  English Name
                </p>

                <p className="mt-2 font-semibold text-gray-900">
                  {product.nameEn}
                </p>
              </div>

              {/* AR NAME */}

              <div dir="rtl">
                <p className="text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Arabic Name
                </p>

                <p className="mt-2 text-right font-semibold text-gray-900">
                  {product.nameAr}
                </p>
              </div>

              {/* SKU */}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  SKU
                </p>

                <p className="mt-2 font-semibold text-gray-900">
                  {product.sku}
                </p>
              </div>

              {/* STOCK */}

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

              {/* CATEGORY EN */}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Category
                </p>

                <p className="mt-2 font-semibold text-gray-900">
                  {product.categoryEn ||
                    "-"}
                </p>
              </div>

              {/* CATEGORY AR */}

              <div dir="rtl">
                <p className="text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Arabic Category
                </p>

                <p className="mt-2 text-right font-semibold text-gray-900">
                  {product.categoryAr ||
                    "-"}
                </p>
              </div>

            </div>

            {/* DESCRIPTION */}

            <div className="mt-7 grid gap-6 border-t border-gray-100 pt-6 md:grid-cols-2">

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  English Description
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                  {product.descriptionEn ||
                    "No description"}
                </p>
              </div>

              <div dir="rtl">
                <p className="text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Arabic Description
                </p>

                <p className="mt-2 whitespace-pre-wrap text-right text-sm leading-6 text-gray-600">
                  {product.descriptionAr ||
                    "لا يوجد وصف"}
                </p>
              </div>

            </div>

          </div>

        </div>

        {/* ================================= */}
        {/* MARKETPLACE SYNC CHECK */}
        {/* ================================= */}

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

            <div className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600">
              4 Marketplaces
            </div>

          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

            {marketplaceNames.map(
              (marketplace) => {

                const result =
                  getCompareResult(
                    marketplace
                  );

                return (
                  <div
                    key={marketplace}
                    className={`rounded-2xl border p-5 transition ${
                      !result
                        ? "border-gray-200 bg-gray-50"
                        : result.healthy
                        ? "border-green-200 bg-green-50"
                        : result.connected
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-bold text-gray-700 shadow-sm">
                          {marketplaceInitials(
                            marketplace
                          )}
                        </div>

                        <h3 className="font-bold text-gray-900">
                          {marketplace}
                        </h3>

                      </div>

                      <span className="text-xl">

                        {!result
                          ? "..."
                          : result.healthy
                          ? "✅"
                          : result.connected
                          ? "⚠️"
                          : "❌"}

                      </span>

                    </div>

                    {!result ? (
                      <p className="mt-5 text-sm text-gray-500">
                        Checking...
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

                          {result.issues.map(
                            (issue) => (
                              <div
                                key={issue}
                                className="rounded-lg border border-yellow-200 bg-white px-3 py-2 text-sm text-gray-700"
                              >
                                ⚠️{" "}
                                {issueLabels[
                                  issue
                                ] ||
                                  issue}
                              </div>
                            )
                          )}

                        </div>

                      </div>
                    )}

                  </div>
                );
              }
            )}

          </div>

        </section>

        {/* ================================= */}
        {/* MARKETPLACE STATUS */}
        {/* ================================= */}

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Marketplace Availability
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Control whether this product is available on each marketplace.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

            {marketplaceNames.map(
              (marketplace) => {

                const marketplaceData =
                  getMarketplace(
                    marketplace
                  );

                const available =
                  marketplaceData?.available ??
                  false;

                const saving =
                  savingMarketplace ===
                  marketplace;

                return (
                  <div
                    key={marketplace}
                    className="rounded-2xl border border-gray-200 p-5"
                  >

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 font-bold text-gray-700">
                          {marketplaceInitials(
                            marketplace
                          )}
                        </div>

                        <h3 className="font-bold text-gray-900">
                          {marketplace}
                        </h3>

                      </div>

                      <span
                        className={`h-3 w-3 rounded-full ${
                          available
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />

                    </div>

                    <div
                      className={`mt-5 rounded-xl px-4 py-3 ${
                        available
                          ? "bg-green-50"
                          : "bg-red-50"
                      }`}
                    >

                      <p
                        className={`text-sm font-semibold ${
                          available
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {available
                          ? "Available"
                          : "Unavailable"}
                      </p>

                    </div>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        toggleMarketplace(
                          marketplace
                        )
                      }
                      className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
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

                    <p className="mt-3 text-center text-xs text-gray-400">
                      Sync:{" "}
                      {marketplaceData?.syncStatus ||
                        "not_connected"}
                    </p>

                  </div>
                );
              }
            )}

          </div>

        </section>

        {/* ================================= */}
        {/* REPORT ISSUE */}
        {/* ================================= */}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Report Marketplace Issue
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Select a marketplace and choose the fields that need to be fixed.
            </p>
          </div>

          {/* MARKETPLACE */}

          <div className="mt-7">

            <p className="mb-3 text-sm font-semibold text-gray-700">
              Marketplace
            </p>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

              {marketplaceNames.map(
                (marketplace) => (

                  <button
                    key={marketplace}
                    type="button"
                    onClick={() =>
                      setSelectedMarketplace(
                        marketplace
                      )
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      selectedMarketplace ===
                      marketplace
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {marketplace}
                  </button>

                )
              )}

            </div>

          </div>

          {/* ISSUES */}

          <div className="mt-7">

            <p className="mb-3 text-sm font-semibold text-gray-700">
              What is wrong?
            </p>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">

              {issueTypes.map(
                (issue) => {

                  const checked =
                    selectedIssues.includes(
                      issue.key
                    );

                  return (
                    <label
                      key={issue.key}
                      className={`flex cursor-pointer items-center rounded-xl border p-4 transition ${
                        checked
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >

                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          toggleIssue(
                            issue.key
                          )
                        }
                        className="h-4 w-4"
                      />

                      <span className="ml-3 text-sm font-medium text-gray-700">
                        {issue.label}
                      </span>

                    </label>
                  );
                }
              )}

            </div>

          </div>

          {/* SELECTED COUNT */}

          {selectedIssues.length > 0 && (
            <div className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {selectedIssues.length} issue
              {selectedIssues.length > 1
                ? "s"
                : ""}{" "}
              selected for{" "}
              <strong>
                {selectedMarketplace}
              </strong>
            </div>
          )}

          {/* BUTTON */}

          <button
            type="button"
            disabled={
              reportingIssues ||
              selectedIssues.length === 0
            }
            onClick={reportIssues}
            className="mt-6 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {reportingIssues
              ? "Reporting..."
              : "Report Issue"}
          </button>

        </section>

      </div>
    </main>
  );
}