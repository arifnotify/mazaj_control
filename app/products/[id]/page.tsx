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
        <div className="max-w-6xl mx-auto bg-white rounded-xl p-10 text-center">
          Loading product...
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto bg-white rounded-xl p-10 text-center">
          <h1 className="text-2xl font-bold">
            Product not found
          </h1>

          <a
            href="/products"
            className="inline-block mt-5 bg-black text-white px-5 py-3 rounded-lg"
          >
            Back to Products
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <a
            href="/products"
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Products
          </a>

          <h1 className="text-3xl font-bold mt-3">
            {product.name}
          </h1>

          <p className="text-gray-500 mt-1">
            SKU: {product.sku}
          </p>

          <div className="mt-5 flex gap-3">
            <a
              href={`/products/${product._id}/edit`}
              className="rounded-lg bg-black px-5 py-3 text-white font-medium hover:bg-gray-800"
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
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-5">
            Master Product
          </h2>

          <div className="grid grid-cols-2 gap-5">

            <div>
              <p className="text-sm text-gray-500">
                Product Name
              </p>

              <p className="font-semibold mt-1">
                {product.name}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                SKU
              </p>

              <p className="font-semibold mt-1">
                {product.sku}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Category
              </p>

              <p className="font-semibold mt-1">
                {product.category || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Price
              </p>

              <p className="font-semibold mt-1">
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

              <p className="font-semibold mt-1">
                {product.stock}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Status
              </p>

              <p className="font-semibold mt-1">
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
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

          <div className="flex items-center justify-between mb-6">

            <div>
              <h2 className="text-xl font-bold">
                Marketplace Sync Check
              </h2>

              <p className="text-gray-500 mt-1">
                Automatically compare marketplace data with the master product.
              </p>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {marketplaceNames.map(
              (marketplace) => {
                const result =
                  getCompareResult(
                    marketplace
                  );

                return (
                  <div
                    key={marketplace}
                    className={`border rounded-xl p-5 ${
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
                      <p className="text-sm text-gray-500 mt-4">
                        Checking...
                      </p>
                    ) : !result.connected ? (
                      <div className="mt-4">
                        <p className="font-semibold text-red-600">
                          Not Connected
                        </p>

                        <p className="text-sm text-gray-500 mt-1">
                          Marketplace data is not available.
                        </p>
                      </div>
                    ) : result.healthy ? (
                      <div className="mt-4">
                        <p className="font-semibold text-green-600">
                          Synced
                        </p>

                        <p className="text-sm text-gray-500 mt-1">
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
                                className="text-sm bg-white border rounded-lg px-3 py-2"
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
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

          <h2 className="text-xl font-bold">
            Marketplace Status
          </h2>

          <p className="text-gray-500 mt-1 mb-6">
            Control product availability on each marketplace.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {marketplaceNames.map(
              (marketplace) => {
                const data =
                  getMarketplace(
                    marketplace
                  );

                const available =
                  data?.available ??
                  false;

                const saving =
                  savingMarketplace ===
                  marketplace;

                return (
                  <div
                    key={marketplace}
                    className="border rounded-xl p-5"
                  >

                    <div className="flex items-center justify-between">

                      <h3 className="font-bold">
                        {marketplace}
                      </h3>

                      <span
                        className={`w-3 h-3 rounded-full ${
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
                      className={`w-full mt-4 rounded-lg px-4 py-2 text-white font-medium disabled:opacity-50 ${
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

                    <p className="text-xs text-gray-400 mt-3">
                      Sync:{" "}
                      {data?.syncStatus ||
                        "not_connected"}
                    </p>

                  </div>
                );
              }
            )}

          </div>
        </div>

        {/* Issue Report */}
        <div className="bg-white rounded-xl shadow-sm p-6">

          <h2 className="text-xl font-bold">
            Report Marketplace Issue
          </h2>

          <p className="text-gray-500 mt-1">
            Select marketplace and check the fields that are wrong.
          </p>

          {/* Marketplace */}
          <div className="mt-6">

            <p className="text-sm font-semibold mb-3">
              Marketplace
            </p>

            <div className="flex gap-3 flex-wrap">

              {marketplaceNames.map(
                (marketplace) => (
                  <button
                    key={marketplace}
                    onClick={() =>
                      setSelectedMarketplace(
                        marketplace
                      )
                    }
                    className={`px-4 py-2 rounded-lg ${
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

            <p className="text-sm font-semibold mb-3">
              What is wrong?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              {issueTypes.map(
                (issue) => (
                  <label
                    key={issue.key}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
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
            className="mt-6 rounded-lg bg-black px-6 py-3 text-white font-medium hover:bg-gray-800"
          >
            Report Issue
          </button>

        </div>

      </div>
    </main>
  );
}