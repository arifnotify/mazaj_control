"use client";

import { useEffect, useState } from "react";

type Product = {
  _id: string;
  sku: string;
  name: string;
  description: string;
  image: string;
  category: string;
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
  name: string;
  description: string;
  image: string;
  category?: string;
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

  useEffect(() => {
    async function loadData() {
      try {
        const { id } = await params;

        // Product
        const productResponse = await fetch(
          `/api/products/${id}`
        );

        const productData =
          await productResponse.json();

        if (productResponse.ok) {
          setProduct(productData);
        }

        // Marketplace data
        const marketplaceResponse =
          await fetch(
            `/api/marketplaces?productId=${id}`
          );

        const marketplaceData =
          await marketplaceResponse.json();

        if (
          marketplaceResponse.ok &&
          Array.isArray(marketplaceData)
        ) {
          setMarketplaces(marketplaceData);
        }

        // Automatic comparison
        const compareResponse =
          await fetch(
            `/api/marketplaces/compare?productId=${id}`
          );

        const compareData =
          await compareResponse.json();

        if (
          compareResponse.ok &&
          Array.isArray(
            compareData.marketplaces
          )
        ) {
          setCompareResults(
            compareData.marketplaces
          );
        }
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: product._id,
            marketplace,

            available: current
              ? !current.available
              : true,

            price: product.price,

            name: product.name,

            description:
              product.description,

            image: product.image,

            // Category added
            category: product.category,

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

      // Refresh automatic comparison
      const compareResponse =
        await fetch(
          `/api/marketplaces/compare?productId=${product._id}`
        );

      const compareData =
        await compareResponse.json();

      if (
        compareResponse.ok &&
        Array.isArray(
          compareData.marketplaces
        )
      ) {
        setCompareResults(
          compareData.marketplaces
        );
      }
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

  async function reportIssues() {
    if (!product) return;

    if (selectedIssues.length === 0) {
      alert(
        "Please select at least one issue."
      );
      return;
    }

    try {
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
          throw new Error(
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
        "Failed to report issue."
      );
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-6xl rounded-xl bg-white p-10 text-center">
          Loading product...
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-6xl rounded-xl bg-white p-10 text-center">
          <h1 className="text-2xl font-bold">
            Product not found
          </h1>

          <a
            href="/products"
            className="mt-5 inline-block rounded-lg bg-black px-5 py-3 text-white"
          >
            Back to Products
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <a
            href="/products"
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Products
          </a>

          <h1 className="mt-3 text-3xl font-bold">
            {product.name}
          </h1>

          <p className="mt-1 text-gray-500">
            SKU: {product.sku}
          </p>

          <div className="mt-5 flex gap-3">
            <a
              href={`/products/${product._id}/edit`}
              className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
            >
              Edit Product
            </a>

            <a
              href="/products"
              className="rounded-lg border bg-white px-5 py-3 font-medium hover:bg-gray-50"
            >
              Back to Products
            </a>
          </div>
        </div>

        {/* Master Product */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold">
            Master Product
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <div>
              <p className="text-sm text-gray-500">
                Product Name
              </p>

              <p className="mt-1 font-semibold">
                {product.name}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                SKU
              </p>

              <p className="mt-1 font-semibold">
                {product.sku}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Category
              </p>

              <p className="mt-1 font-semibold">
                {product.category || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Price
              </p>

              <p className="mt-1 font-semibold">
                QAR{" "}
                {Number(
                  product.price
                ).toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Stock
              </p>

              <p className="mt-1 font-semibold">
                {product.stock}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Status
              </p>

              <p className="mt-1 font-semibold">
                {product.active
                  ? "Active"
                  : "Inactive"}
              </p>
            </div>

          </div>

          {product.description && (
            <div className="mt-5">
              <p className="text-sm text-gray-500">
                Description
              </p>

              <p className="mt-1">
                {product.description}
              </p>
            </div>
          )}
        </div>

        {/* Automatic Comparison */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Marketplace Sync Check
              </h2>

              <p className="mt-1 text-gray-500">
                Automatically compare marketplace data with the master product.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

            {marketplaceNames.map(
              (marketplace) => {
                const result =
                  getCompareResult(
                    marketplace
                  );

                return (
                  <div
                    key={marketplace}
                    className={`rounded-xl border p-5 ${
                      !result
                        ? "border-gray-200"
                        : result.healthy
                        ? "border-green-200 bg-green-50"
                        : result.connected
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <h3 className="font-bold">
                        {marketplace}
                      </h3>

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
                      <p className="mt-4 text-sm text-gray-500">
                        Checking...
                      </p>
                    ) : !result.connected ? (
                      <div className="mt-4">
                        <p className="font-semibold text-red-600">
                          Not Connected
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          Marketplace data is not available.
                        </p>
                      </div>
                    ) : result.healthy ? (
                      <div className="mt-4">
                        <p className="font-semibold text-green-600">
                          Synced
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          All checked fields match.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4">

                        <p className="font-semibold text-yellow-700">
                          Mismatch Found
                        </p>

                        <div className="mt-3 space-y-2">

                          {result.issues.map(
                            (issue) => (
                              <div
                                key={issue}
                                className="rounded-lg border bg-white px-3 py-2 text-sm"
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
        </div>

        {/* Marketplace Status */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold">
            Marketplace Status
          </h2>

          <p className="mb-6 mt-1 text-gray-500">
            Control product availability on each marketplace.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

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
                    className="rounded-xl border p-5"
                  >

                    <div className="flex items-center justify-between">

                      <h3 className="font-bold">
                        {marketplace}
                      </h3>

                      <span
                        className={`h-3 w-3 rounded-full ${
                          available
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />

                    </div>

                    <p
                      className={`mt-3 text-sm font-medium ${
                        available
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {available
                        ? "Available"
                        : "Unavailable"}
                    </p>

                    <button
                      disabled={saving}
                      onClick={() =>
                        toggleMarketplace(
                          marketplace
                        )
                      }
                      className={`mt-4 w-full rounded-lg px-4 py-2 font-medium text-white disabled:opacity-50 ${
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

                    <p className="mt-3 text-xs text-gray-400">
                      Sync:{" "}
                      {marketplaceData?.syncStatus ||
                        "not_connected"}
                    </p>

                  </div>
                );
              }
            )}

          </div>
        </div>

        {/* Issue Report */}
        <div className="rounded-xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold">
            Report Marketplace Issue
          </h2>

          <p className="mt-1 text-gray-500">
            Select marketplace and check the fields that are wrong.
          </p>

          {/* Marketplace */}
          <div className="mt-6">

            <p className="mb-3 text-sm font-semibold">
              Marketplace
            </p>

            <div className="flex flex-wrap gap-3">

              {marketplaceNames.map(
                (marketplace) => (
                  <button
                    key={marketplace}
                    onClick={() =>
                      setSelectedMarketplace(
                        marketplace
                      )
                    }
                    className={`rounded-lg px-4 py-2 ${
                      selectedMarketplace ===
                      marketplace
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {marketplace}
                  </button>
                )
              )}

            </div>
          </div>

          {/* Issues */}
          <div className="mt-6">

            <p className="mb-3 text-sm font-semibold">
              What is wrong?
            </p>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

              {issueTypes.map(
                (issue) => (
                  <label
                    key={issue.key}
                    className="cursor-pointer rounded-lg border p-4 hover:bg-gray-50"
                  >

                    <input
                      type="checkbox"
                      checked={selectedIssues.includes(
                        issue.key
                      )}
                      onChange={() =>
                        toggleIssue(
                          issue.key
                        )
                      }
                      className="mr-3"
                    />

                    {issue.label}

                  </label>
                )
              )}

            </div>
          </div>

          <button
            onClick={reportIssues}
            className="mt-6 rounded-lg bg-black px-6 py-3 font-medium text-white hover:bg-gray-800"
          >
            Report Issue
          </button>

        </div>

      </div>
    </main>
  );
}