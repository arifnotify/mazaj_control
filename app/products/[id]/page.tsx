"use client";

import { useEffect, useState } from "react";

const marketplaces = ["Talabat", "Snoonu", "Rafeeq", "Keeta"];

const issueTypes = [
  ["price", "Price"],
  ["name", "Name"],
  ["description", "Description"],
  ["image", "Image"],
  ["category", "Category"],
  ["availability", "Availability"],
];

export default function ProductDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [productId, setProductId] = useState("");
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMarketplace, setSelectedMarketplace] = useState("Talabat");
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    params.then((p) => {
      setProductId(p.id);

      fetch(`/api/products/${p.id}`)
        .then((res) => res.json())
        .then((data) => {
          setProduct(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [params]);

  function toggleIssue(type: string) {
    setSelectedIssues((current) =>
      current.includes(type)
        ? current.filter((x) => x !== type)
        : [...current, type]
    );
  }

  async function reportProblems() {
    if (!productId || selectedIssues.length === 0) return;

    try {
      for (const type of selectedIssues) {
        await fetch("/api/issues", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId,
            marketplace: selectedMarketplace,
            type,
            note: "",
          }),
        });
      }

      setMessage("Problem reported successfully.");
      setSelectedIssues([]);
    } catch {
      setMessage("Failed to report problem.");
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!product) {
    return <div className="p-8">Product not found.</div>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">

        <a href="/products" className="text-gray-500">
          ← Back to Products
        </a>

        <div className="mt-5 bg-white rounded-xl shadow p-6">
          <h1 className="text-3xl font-bold">
            {product.name}
          </h1>

          <p className="text-gray-500 mt-1">
            SKU: {product.sku}
          </p>

          <div className="grid grid-cols-4 gap-4 mt-6">

            <div className="border rounded-lg p-4">
              <p className="text-gray-500">Category</p>
              <p className="font-semibold mt-1">
                {product.category || "-"}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-gray-500">Price</p>
              <p className="font-semibold mt-1">
                QAR {product.price}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-gray-500">Stock</p>
              <p className="font-semibold mt-1">
                {product.stock}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-gray-500">Status</p>
              <p className="font-semibold text-green-600 mt-1">
                {product.active ? "Active" : "Inactive"}
              </p>
            </div>

          </div>
        </div>

        {/* Marketplace */}
        <div className="mt-6 bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold">
            Marketplace Status
          </h2>

          <div className="grid grid-cols-4 gap-4 mt-5">
            {marketplaces.map((marketplace) => (
              <button
                key={marketplace}
                onClick={() =>
                  setSelectedMarketplace(marketplace)
                }
                className={`border rounded-lg p-5 text-left ${
                  selectedMarketplace === marketplace
                    ? "border-black bg-gray-50"
                    : ""
                }`}
              >
                <h3 className="font-bold">
                  {marketplace}
                </h3>

                <p className="text-gray-500 mt-2">
                  Status not connected yet
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Report Issue */}
        <div className="mt-6 bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold">
            Report Product Problem
          </h2>

          <p className="text-gray-500 mt-1">
            Marketplace: {selectedMarketplace}
          </p>

          <div className="grid grid-cols-3 gap-3 mt-5">
            {issueTypes.map(([value, label]) => (
              <label
                key={value}
                className="border rounded-lg p-4 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIssues.includes(value)}
                  onChange={() => toggleIssue(value)}
                  className="mr-3"
                />
                {label}
              </label>
            ))}
          </div>

          <button
            onClick={reportProblems}
            disabled={selectedIssues.length === 0}
            className="mt-5 bg-black text-white px-6 py-3 rounded-lg disabled:opacity-40"
          >
            Report Problem
          </button>

          {message && (
            <p className="mt-4 text-green-600">
              {message}
            </p>
          )}
        </div>

      </div>
    </main>
  );
}