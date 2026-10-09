
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

function getProductSku(
  product: ProductInfo | string | null | undefined
): string {
  if (!product || typeof product === "string") return "";
  return product.sku || "";
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
      return "bg-red-100 text-red-700";
    case "in_progress":
      return "bg-yellow-100 text-yellow-800";
    case "fixed":
      return "bg-blue-100 text-blue-700";
    case "verified":
      return "bg-green-100 text-green-700";
    case "closed":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function MarketplaceBadge({
  marketplace,
}: {
  marketplace: MarketplaceStatus;
}) {
  if (!marketplace.connected) {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
        Not Connected
      </span>
    );
  }

  if (marketplace.available === true) {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
        ON
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
      OFF
    </span>
  );
}

export default function IssuesPage() {
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

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.name?.toLowerCase().includes(term) ||
        product.nameEn?.toLowerCase().includes(term) ||
        product.nameAr?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term);

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

          if (availabilityFilter === "connected") {
            return item.connected;
          }

          if (availabilityFilter === "on") {
            return item.connected && item.available === true;
          }

          if (availabilityFilter === "off") {
            return item.connected && item.available === false;
          }

          if (availabilityFilter === "not_connected") {
            return !item.connected;
          }

          return true;
        });

      return (
        Boolean(matchesSearch) &&
        matchesMarketplace &&
        matchesAvailability
      );
    });
  }, [
    products,
    search,
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

      // Remove from the screen only after the server confirms deletion.
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
    <main className="min-h-screen space-y-6 bg-gray-50 p-4 text-gray-900 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Issues & Marketplace Status
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor product availability and manage reported issues.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh Data"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {/* Summary cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="mt-2 text-3xl font-bold">{products.length}</p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Marketplace ON</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {marketplaceCounts.on}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Marketplace OFF</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {marketplaceCounts.off}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Not Connected</p>
          <p className="mt-2 text-3xl font-bold text-gray-600">
            {marketplaceCounts.notConnected}
          </p>
        </div>
      </section>

      {/* Marketplace status table */}
      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b p-4 sm:p-5">
          <h2 className="text-xl font-bold">Product Marketplace Status</h2>
          <p className="mt-1 text-sm text-gray-500">
            ON means marked available in your database. OFF means marked
            unavailable. Not Connected means no marketplace record exists.
          </p>
        </div>

        <div className="grid gap-3 border-b p-4 md:grid-cols-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product name or SKU..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <select
            value={marketplaceFilter}
            onChange={(event) => setMarketplaceFilter(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Marketplaces</option>
            {MARKETPLACES.map((marketplace) => (
              <option key={marketplace} value={marketplace}>
                {marketplace}
              </option>
            ))}
          </select>

          <select
            value={availabilityFilter}
            onChange={(event) => setAvailabilityFilter(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Availability</option>
            <option value="on">ON only</option>
            <option value="off">OFF only</option>
            <option value="not_connected">Not Connected only</option>
            <option value="connected">Connected only</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">SKU</th>
                {MARKETPLACES.map((marketplace) => (
                  <th
                    key={marketplace}
                    className="px-4 py-3 text-center font-semibold"
                  >
                    {marketplace}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    Loading marketplace statuses...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/products/${product._id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {getProductName(product)}
                      </Link>
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      {product.sku || "—"}
                    </td>

                    {MARKETPLACES.map((marketplaceName) => {
                      const marketplace = (
                        product.marketplaces || []
                      ).find(
                        (item) => item.marketplace === marketplaceName
                      );

                      return (
                        <td
                          key={marketplaceName}
                          className="px-4 py-3 text-center"
                        >
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

        <div className="border-t px-4 py-3 text-xs text-gray-500">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      </section>

      {/* Reported issues */}
      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b p-4 sm:flex-row sm:items-center sm:p-5">
          <div>
            <h2 className="text-xl font-bold">Reported Issues</h2>
            <p className="mt-1 text-sm text-gray-500">
              Update issue status or permanently delete resolved reports.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-red-100 px-3 py-1.5 font-semibold text-red-700">
              Open: {openCount}
            </span>
            <span className="rounded-full bg-yellow-100 px-3 py-1.5 font-semibold text-yellow-800">
              In Progress: {inProgressCount}
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-1.5 font-semibold text-blue-700">
              Fixed: {fixedCount}
            </span>
            <span className="rounded-full bg-gray-200 px-3 py-1.5 font-semibold text-gray-700">
              Closed: {closedCount}
            </span>
          </div>
        </div>

        <div className="grid gap-3 border-b p-4 md:grid-cols-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product, SKU, employee, note..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <select
            value={marketplaceFilter}
            onChange={(event) => setMarketplaceFilter(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Marketplaces</option>
            {MARKETPLACES.map((marketplace) => (
              <option key={marketplace} value={marketplace}>
                {marketplace}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Issue Types</option>
            {ISSUE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            {ISSUE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Marketplace</th>
                <th className="px-4 py-3 font-semibold">Issue Type</th>
                <th className="px-4 py-3 font-semibold">Note</th>
                <th className="px-4 py-3 font-semibold">Reported By</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    Loading reported issues...
                  </td>
                </tr>
              ) : filteredIssues.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    No reported issues found.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr key={issue._id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/products/${
                          typeof issue.productId === "object" &&
                          issue.productId
                            ? issue.productId._id
                            : ""
                        }`}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {getProductName(issue.productId)}
                      </Link>

                      {getProductSku(issue.productId) && (
                        <p className="mt-1 text-xs text-gray-500">
                          SKU: {getProductSku(issue.productId)}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">{issue.marketplace}</td>

                    <td className="px-4 py-3 capitalize">{issue.type}</td>

                    <td className="max-w-[240px] whitespace-pre-wrap px-4 py-3 text-gray-600">
                      {issue.note || "—"}
                    </td>

                    <td className="px-4 py-3">
                      {issue.reporterName ||
                        getEmployeeName(issue.reporterEmployeeId) ||
                        "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {formatDate(issue.createdAt)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor(
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
                          className="block w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs disabled:opacity-50"
                          aria-label={`Update status for ${getProductName(
                            issue.productId
                          )}`}
                        >
                          {ISSUE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-2">
                        {typeof issue.productId === "object" &&
                          issue.productId && (
                            <Link
                              href={`/products/${issue.productId._id}`}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold hover:bg-gray-100"
                            >
                              View Product
                            </Link>
                          )}

                        <button
                          type="button"
                          onClick={() => void deleteIssue(issue._id)}
                          disabled={
                            deletingId === issue._id ||
                            updatingId === issue._id
                          }
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === issue._id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t px-4 py-3 text-xs text-gray-500">
          Showing {filteredIssues.length} of {issues.length} reported issues
        </div>
      </section>
    </main>
  );
}