
"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  _id: string;
  sku: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
} | null;

type Reporter = {
  _id?: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
} | string | null;

type Issue = {
  _id: string;
  productId: Product;
  marketplace: "Talabat" | "Snoonu" | "Rafeeq" | "Keeta";
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
  note?: string;
  reporterName?: string;
  reporterEmployeeId?: Reporter;
  createdAt: string;
  updatedAt: string;
};

const marketplaces = [
  "All",
  "Talabat",
  "Snoonu",
  "Rafeeq",
  "Keeta",
];

const issueTypes = [
  "All",
  "price",
  "name",
  "description",
  "image",
  "category",
  "availability",
  "other",
];

const statuses = [
  "All",
  "open",
  "in_progress",
  "fixed",
  "verified",
  "closed",
];

function formatType(type: string) {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
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

function getReporterName(issue: Issue) {
  if (issue.reporterName?.trim()) {
    return issue.reporterName;
  }

  const reporter = issue.reporterEmployeeId;

  if (reporter && typeof reporter === "object") {
    return (
      reporter.nameEn?.trim() ||
      reporter.name?.trim() ||
      reporter.nameAr?.trim() ||
      "Unknown reporter"
    );
  }

  return "Unknown reporter";
}

function getProductName(product: Product) {
  if (!product) return "Product not found";

  return product.nameEn || product.name || product.nameAr || "Unnamed product";
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);

  const [marketplaceFilter, setMarketplaceFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadIssues() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/issues", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to load issues"
        );
      }

      setIssues(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load issues error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Issues load করা যায়নি"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIssues();
  }, []);

  async function updateStatus(
    issueId: string,
    status: Issue["status"]
  ) {
    try {
      setUpdatingId(issueId);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to update issue"
        );
      }

      setIssues((currentIssues) =>
        currentIssues.map((issue) =>
          issue._id === issueId ? { ...issue, status } : issue
        )
      );

      setSuccess("Issue status updated successfully.");
    } catch (error) {
      console.error("Update issue error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Issue update করা যায়নি"
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const marketplaceMatch =
        marketplaceFilter === "All" ||
        issue.marketplace === marketplaceFilter;

      const typeMatch =
        typeFilter === "All" || issue.type === typeFilter;

      const statusMatch =
        statusFilter === "All" || issue.status === statusFilter;

      return marketplaceMatch && typeMatch && statusMatch;
    });
  }, [issues, marketplaceFilter, typeFilter, statusFilter]);

  const openCount = issues.filter(
    (issue) => issue.status === "open"
  ).length;

  const progressCount = issues.filter(
    (issue) => issue.status === "in_progress"
  ).length;

  const fixedCount = issues.filter(
    (issue) =>
      issue.status === "fixed" || issue.status === "verified"
  ).length;

  const closedCount = issues.filter(
    (issue) => issue.status === "closed"
  ).length;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Issues</h1>
          <p className="mt-2 text-gray-500">
            Manage product and marketplace issues and see who reported them.
          </p>
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

        {/* Summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Open</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {openCount}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {progressCount}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Fixed / Verified</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {fixedCount}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Closed</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {closedCount}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Filters</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Marketplace
              </label>
              <select
                value={marketplaceFilter}
                onChange={(e) => setMarketplaceFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
              >
                {marketplaces.map((marketplace) => (
                  <option key={marketplace} value={marketplace}>
                    {marketplace}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Issue Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
              >
                {issueTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "All" ? "All" : formatType(type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status === "All" ? "All" : formatStatus(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Issues Table */}
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                All Issues
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Showing {filteredIssues.length} of {issues.length} issues
              </p>
            </div>

            <button
              onClick={loadIssues}
              disabled={loading}
              className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Loading issues...
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No issues found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-sm text-gray-600">
                  <tr>
                    <th className="px-5 py-4 font-medium">Product</th>
                    <th className="px-5 py-4 font-medium">Marketplace</th>
                    <th className="px-5 py-4 font-medium">Issue / Note</th>
                    <th className="px-5 py-4 font-medium">Reported By</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 font-medium">Created</th>
                    <th className="px-5 py-4 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredIssues.map((issue) => (
                    <tr key={issue._id} className="align-top hover:bg-gray-50">
                      {/* Product */}
                      <td className="px-5 py-5">
                        {issue.productId ? (
                          <>
                            <div className="font-semibold text-gray-900">
                              {getProductName(issue.productId)}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              SKU: {issue.productId.sku}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400">
                            Product not found
                          </span>
                        )}
                      </td>

                      {/* Marketplace */}
                      <td className="px-5 py-5">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                          {issue.marketplace}
                        </span>
                      </td>

                      {/* Issue and note */}
                      <td className="min-w-56 px-5 py-5">
                        <p className="font-medium text-gray-900">
                          {formatType(issue.type)}
                        </p>
                        {issue.note && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-500">
                            {issue.note}
                          </p>
                        )}
                      </td>

                      {/* Reporter */}
                      <td className="px-5 py-5">
                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                          {getReporterName(issue)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-5">
                        <span
                          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                            issue.status
                          )}`}
                        >
                          {formatStatus(issue.status)}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="whitespace-nowrap px-5 py-5 text-sm text-gray-500">
                        {issue.createdAt &&
                        !Number.isNaN(new Date(issue.createdAt).getTime())
                          ? new Date(issue.createdAt).toLocaleDateString()
                          : "-"}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-5">
                        <div className="flex flex-col items-start gap-2">
                          <a
                            href={`/issues/${issue._id}`}
                            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                          >
                            View
                          </a>

                          <select
                            value={issue.status}
                            disabled={updatingId === issue._id}
                            onChange={(e) =>
                              updateStatus(
                                issue._id,
                                e.target.value as Issue["status"]
                              )
                            }
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="fixed">Fixed</option>
                            <option value="verified">Verified</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}