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

type Issue = {
  _id: string;
  productId: Product | null;
  marketplace: MarketplaceName;
  type:
    | "price"
    | "name"
    | "description"
    | "image"
    | "category"
    | "availability"
    | "other";
  status:
    | "open"
    | "in_progress"
    | "fixed"
    | "verified"
    | "closed";
  note: string;
  createdAt: string;
  updatedAt: string;
};

const statusOptions = [
  "open",
  "in_progress",
  "fixed",
  "verified",
  "closed",
] as const;

function formatType(type: string) {
  return type
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function formatStatus(status: string) {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "fixed":
      return "Fixed";
    case "verified":
      return "Verified";
    case "closed":
      return "Closed";
    default:
      return "Open";
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "open":
      return "bg-red-100 text-red-700";

    case "in_progress":
      return "bg-yellow-100 text-yellow-700";

    case "fixed":
      return "bg-blue-100 text-blue-700";

    case "verified":
      return "bg-purple-100 text-purple-700";

    case "closed":
      return "bg-green-100 text-green-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function IssueDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [issue, setIssue] = useState<Issue | null>(
    null
  );

  const [marketplace, setMarketplace] =
    useState<Marketplace | null>(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadIssue() {
      try {
        const { id } = await params;

        // Get issue
        const issueResponse = await fetch(
          `/api/issues/${id}`
        );

        const issueData =
          await issueResponse.json();

        if (!issueResponse.ok) {
          throw new Error(
            issueData.error ||
              "Failed to load issue"
          );
        }

        setIssue(issueData);

        // Get marketplace data
        if (issueData.productId?._id) {
          const marketplaceResponse =
            await fetch(
              `/api/marketplaces?productId=${issueData.productId._id}`
            );

          const marketplaceData =
            await marketplaceResponse.json();

          if (
            marketplaceResponse.ok &&
            Array.isArray(marketplaceData)
          ) {
            const selected =
              marketplaceData.find(
                (item: Marketplace) =>
                  item.marketplace ===
                  issueData.marketplace
              );

            setMarketplace(
              selected || null
            );
          }
        }
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Issue load করা যায়নি"
        );
      } finally {
        setLoading(false);
      }
    }

    loadIssue();
  }, [params]);

  async function updateIssue(
    status: Issue["status"]
  ) {
    if (!issue) return;

    try {
      setUpdating(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/issues/${issue._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            note,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update issue"
        );
      }

      setIssue((current) =>
        current
          ? {
              ...current,
              status,
              note:
                note !== ""
                  ? note
                  : current.note,
              updatedAt:
                new Date().toISOString(),
            }
          : current
      );

      setNote("");

      setSuccess(
        "Issue updated successfully"
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Issue update করা যায়নি"
      );
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl rounded-xl bg-white p-10 text-center">
          Loading issue...
        </div>
      </main>
    );
  }

  if (!issue) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl rounded-xl bg-white p-10 text-center">
          <h1 className="text-2xl font-bold">
            Issue not found
          </h1>

          <a
            href="/issues"
            className="mt-5 inline-block rounded-lg bg-black px-5 py-3 text-white"
          >
            Back to Issues
          </a>
        </div>
      </main>
    );
  }

  const product = issue.productId;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <a
            href="/issues"
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Issues
          </a>

          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Issue Details
              </h1>

              <p className="mt-1 text-gray-500">
                Review and manage marketplace issue
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                issue.status
              )}`}
            >
              {formatStatus(issue.status)}
            </span>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">
            {success}
          </div>
        )}

        {/* Issue Summary */}
        <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold">
            Issue Summary
          </h2>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

            <div>
              <p className="text-sm text-gray-500">
                Product
              </p>

              <p className="mt-1 font-semibold">
                {product?.name || "Unknown"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                SKU
              </p>

              <p className="mt-1 font-semibold">
                {product?.sku || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Marketplace
              </p>

              <p className="mt-1 font-semibold">
                {issue.marketplace}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Issue Type
              </p>

              <p className="mt-1 font-semibold">
                {formatType(issue.type)}
              </p>
            </div>
          </div>

          {issue.note && (
            <div className="mt-6 rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700">
                Note
              </p>

              <p className="mt-1 text-sm text-gray-600">
                {issue.note}
              </p>
            </div>
          )}
        </div>

        {/* Comparison */}
        <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-xl font-bold">
            Master vs Marketplace
          </h2>

          <p className="mb-6 text-sm text-gray-500">
            Compare the master product with{" "}
            {issue.marketplace}.
          </p>

          {!product ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-600">
              Product data not found.
            </div>
          ) : !marketplace ? (
            <div className="rounded-lg bg-yellow-50 p-4 text-yellow-700">
              Marketplace data not found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-4">
                      Field
                    </th>

                    <th className="px-4 py-4">
                      Master Product
                    </th>

                    <th className="px-4 py-4">
                      {issue.marketplace}
                    </th>

                    <th className="px-4 py-4">
                      Result
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">

                  {/* Price */}
                  <tr>
                    <td className="px-4 py-4 font-medium">
                      Price
                    </td>

                    <td className="px-4 py-4">
                      QAR{" "}
                      {Number(
                        product.price
                      ).toFixed(2)}
                    </td>

                    <td className="px-4 py-4">
                      QAR{" "}
                      {Number(
                        marketplace.price
                      ).toFixed(2)}
                    </td>

                    <td className="px-4 py-4">
                      {Number(product.price) ===
                      Number(marketplace.price) ? (
                        <span className="font-semibold text-green-600">
                          ✓ Match
                        </span>
                      ) : (
                        <span className="font-semibold text-red-600">
                          ✕ Mismatch
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Name */}
                  <tr>
                    <td className="px-4 py-4 font-medium">
                      Name
                    </td>

                    <td className="px-4 py-4">
                      {product.name}
                    </td>

                    <td className="px-4 py-4">
                      {marketplace.name}
                    </td>

                    <td className="px-4 py-4">
                      {product.name ===
                      marketplace.name ? (
                        <span className="font-semibold text-green-600">
                          ✓ Match
                        </span>
                      ) : (
                        <span className="font-semibold text-red-600">
                          ✕ Mismatch
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Description */}
                  <tr>
                    <td className="px-4 py-4 font-medium">
                      Description
                    </td>

                    <td className="max-w-xs px-4 py-4">
                      {product.description ||
                        "-"}
                    </td>

                    <td className="max-w-xs px-4 py-4">
                      {marketplace.description ||
                        "-"}
                    </td>

                    <td className="px-4 py-4">
                      {product.description ===
                      marketplace.description ? (
                        <span className="font-semibold text-green-600">
                          ✓ Match
                        </span>
                      ) : (
                        <span className="font-semibold text-red-600">
                          ✕ Mismatch
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Category */}
                  <tr>
                    <td className="px-4 py-4 font-medium">
                      Category
                    </td>

                    <td className="px-4 py-4">
                      {product.category ||
                        "-"}
                    </td>

                    <td className="px-4 py-4">
                      {marketplace.category ||
                        "-"}
                    </td>

                    <td className="px-4 py-4">
                      {product.category ===
                      marketplace.category ? (
                        <span className="font-semibold text-green-600">
                          ✓ Match
                        </span>
                      ) : (
                        <span className="font-semibold text-red-600">
                          ✕ Mismatch
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Image */}
                  <tr>
                    <td className="px-4 py-4 font-medium">
                      Image
                    </td>

                    <td className="px-4 py-4">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {marketplace.image ? (
                        <img
                          src={marketplace.image}
                          alt={marketplace.name}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {product.image ===
                      marketplace.image ? (
                        <span className="font-semibold text-green-600">
                          ✓ Match
                        </span>
                      ) : (
                        <span className="font-semibold text-red-600">
                          ✕ Mismatch
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Availability */}
                  <tr>
                    <td className="px-4 py-4 font-medium">
                      Availability
                    </td>

                    <td className="px-4 py-4">
                      {product.active
                        ? "Available"
                        : "Unavailable"}
                    </td>

                    <td className="px-4 py-4">
                      {marketplace.available
                        ? "Available"
                        : "Unavailable"}
                    </td>

                    <td className="px-4 py-4">
                      {Boolean(
                        product.active
                      ) ===
                      Boolean(
                        marketplace.available
                      ) ? (
                        <span className="font-semibold text-green-600">
                          ✓ Match
                        </span>
                      ) : (
                        <span className="font-semibold text-red-600">
                          ✕ Mismatch
                        </span>
                      )}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Status Management */}
        <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Update Issue
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Move the issue through the workflow.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {statusOptions.map((status) => (
              <button
                key={status}
                disabled={
                  updating ||
                  issue.status === status
                }
                onClick={() =>
                  updateIssue(status)
                }
                className={`rounded-lg px-5 py-3 text-sm font-medium transition ${
                  issue.status === status
                    ? "cursor-default bg-black text-white"
                    : "border bg-white hover:bg-gray-50"
                } disabled:opacity-50`}
              >
                {formatStatus(status)}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium">
              Add Note
            </label>

            <textarea
              value={note}
              onChange={(e) =>
                setNote(e.target.value)
              }
              placeholder="Write what was fixed or what needs to be done..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap gap-3">
          <a
            href="/issues"
            className="rounded-lg border bg-white px-5 py-3 font-medium hover:bg-gray-50"
          >
            ← Back to Issues
          </a>

          {product && (
            <a
              href={`/products/${product._id}`}
              className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
            >
              View Product
            </a>
          )}
        </div>
      </div>
    </main>
  );
}