
"use client";

import { useCallback, useEffect, useState } from "react";

type MarketplaceName = "Talabat" | "Snoonu" | "Rafeeq" | "Keeta";

type MarketplaceStatus = {
  marketplace: MarketplaceName;
  connected: boolean;
  available: boolean | null;
  syncStatus: string;
};

type StatusProduct = {
  _id: string;
  sku: string;
  name: string;
  nameEn?: string;
  nameAr?: string;
  marketplaces: MarketplaceStatus[];
};

type PopulatedProduct = {
  _id?: string;
  sku?: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
} | string | null;

type PopulatedEmployee = {
  _id?: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
} | string | null;

type Issue = {
  _id: string;
  productId: PopulatedProduct;
  marketplace: MarketplaceName;
  type: string;
  note?: string;
  reporterName?: string;
  reporterEmployeeId?: PopulatedEmployee;
  status: string;
  createdAt?: string;
};

const MARKETPLACES: MarketplaceName[] = [
  "Talabat",
  "Snoonu",
  "Rafeeq",
  "Keeta",
];

const ISSUE_TYPES = [
  "price",
  "name",
  "description",
  "image",
  "category",
  "availability",
  "other",
];

const ISSUE_STATUSES = [
  "open",
  "in_progress",
  "fixed",
  "verified",
  "closed",
];

function getProductName(product: PopulatedProduct) {
  if (!product || typeof product === "string") {
    return "Product details unavailable";
  }

  return (
    product.nameEn ||
    product.name ||
    product.nameAr ||
    product.sku ||
    "Unnamed product"
  );
}

function getEmployeeName(issue: Issue) {
  if (issue.reporterName?.trim()) {
    return issue.reporterName;
  }

  const employee = issue.reporterEmployeeId;

  if (employee && typeof employee !== "string") {
    return (
      employee.name ||
      employee.nameEn ||
      employee.nameAr ||
      "Unknown employee"
    );
  }

  return "Unknown employee";
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function AvailabilityBadge({
  status,
}: {
  status: MarketplaceStatus;
}) {
  if (!status.connected || status.available === null) {
    return (
      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
        Not Connected
      </span>
    );
  }

  if (status.available) {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
        ON
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
      OFF
    </span>
  );
}

export default function IssuesPage() {
  const [products, setProducts] = useState<StatusProduct[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] =
    useState("all");
  const [availabilityFilter, setAvailabilityFilter] =
    useState("all");
  const [issueFilter, setIssueFilter] = useState("all");
  const [savingIssueId, setSavingIssueId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [statusResponse, issueResponse] = await Promise.all([
        fetch("/api/marketplaces/status", { cache: "no-store" }),
        fetch("/api/issues", { cache: "no-store" }),
      ]);

      if (!statusResponse.ok) {
        throw new Error("Failed to load marketplace statuses.");
      }

      if (!issueResponse.ok) {
        throw new Error("Failed to load issues.");
      }

      const statusData = await statusResponse.json();
      const issueData = await issueResponse.json();

      setProducts(
        Array.isArray(statusData)
          ? statusData
          : statusData.products || []
      );

      setIssues(
        Array.isArray(issueData)
          ? issueData
          : issueData.issues || []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function updateIssueStatus(
    issueId: string,
    status: string
  ) {
    setSavingIssueId(issueId);
    setError("");

    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update issue status."
        );
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update issue."
      );
    } finally {
      setSavingIssueId("");
    }
  }

  const filteredProducts = products.filter((product) => {
    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      !searchText ||
      product.name?.toLowerCase().includes(searchText) ||
      product.sku?.toLowerCase().includes(searchText);

    const matchesMarketplace =
      marketplaceFilter === "all" ||
      product.marketplaces.some(
        (item) => item.marketplace === marketplaceFilter
      );

    const matchesAvailability =
      availabilityFilter === "all" ||
      product.marketplaces.some((item) => {
        if (availabilityFilter === "not_connected") {
          return !item.connected;
        }

        if (availabilityFilter === "on") {
          return item.connected && item.available === true;
        }

        if (availabilityFilter === "off") {
          return item.connected && item.available === false;
        }

        return true;
      });

    return (
      matchesSearch &&
      matchesMarketplace &&
      matchesAvailability
    );
  });

  const filteredIssues = issues.filter((issue) => {
    const productName = getProductName(issue.productId);
    const employeeName = getEmployeeName(issue);
    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      !searchText ||
      productName.toLowerCase().includes(searchText) ||
      employeeName.toLowerCase().includes(searchText) ||
      (issue.note || "").toLowerCase().includes(searchText);

    const matchesMarketplace =
      marketplaceFilter === "all" ||
      issue.marketplace === marketplaceFilter;

    const matchesIssue =
      issueFilter === "all" || issue.type === issueFilter;

    return matchesSearch && matchesMarketplace && matchesIssue;
  });

  const onCount = products.reduce(
    (total, product) =>
      total +
      product.marketplaces.filter(
        (item) => item.connected && item.available === true
      ).length,
    0
  );

  const offCount = products.reduce(
    (total, product) =>
      total +
      product.marketplaces.filter(
        (item) => item.connected && item.available === false
      ).length,
    0
  );

  const notConnectedCount = products.reduce(
    (total, product) =>
      total +
      product.marketplaces.filter((item) => !item.connected).length,
    0
  );

  const availabilityIssueCount = issues.filter(
    (issue) => issue.type === "availability"
  ).length;

  return (
    <main className="space-y-8 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Issues & Marketplace Status
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Check ON/OFF availability and manage employee-reported issues.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="mt-2 text-3xl font-bold">{products.length}</p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Marketplace ON records
          </p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {onCount}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Marketplace OFF records
          </p>
          <p className="mt-2 text-3xl font-bold text-red-700">
            {offCount}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Not Connected / Availability Issues
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-700">
            {notConnectedCount} / {availabilityIssueCount}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Automatic Marketplace Availability
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            The status below comes from ProductMarketplace.available.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product name or SKU..."
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <select
            value={marketplaceFilter}
            onChange={(event) =>
              setMarketplaceFilter(event.target.value)
            }
            className="rounded-lg border px-3 py-2 text-sm"
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
            onChange={(event) =>
              setAvailabilityFilter(event.target.value)
            }
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="all">All Availability</option>
            <option value="on">ON only</option>
            <option value="off">OFF only</option>
            <option value="not_connected">Not Connected only</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                {MARKETPLACES.map((marketplace) => (
                  <th key={marketplace} className="px-4 py-3">
                    {marketplace}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Loading marketplace statuses...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900">
                        {product.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        SKU: {product.sku || "—"}
                      </p>
                    </td>

                    {MARKETPLACES.map((marketplace) => {
                      const status = product.marketplaces.find(
                        (item) => item.marketplace === marketplace
                      );

                      return (
                        <td key={marketplace} className="px-4 py-4">
                          {status ? (
                            <div className="space-y-2">
                              <AvailabilityBadge status={status} />
                              {status.connected && (
                                <p className="text-xs text-gray-500">
                                  Sync: {formatLabel(status.syncStatus)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">
                              Not Connected
                            </span>
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
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Employee Reported Issues
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Employees can report problems from the Product Details page.
            Manage each report below.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <select
            value={issueFilter}
            onChange={(event) => setIssueFilter(event.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="all">All Issue Types</option>
            {ISSUE_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatLabel(type)}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Marketplace</th>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Reported By</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Loading issues...
                  </td>
                </tr>
              ) : filteredIssues.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No issues found.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr key={issue._id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-gray-900">
                      {getProductName(issue.productId)}
                    </td>

                    <td className="px-4 py-4">
                      {issue.marketplace}
                    </td>

                    <td className="px-4 py-4">
                      {formatLabel(issue.type)}
                    </td>

                    <td className="max-w-xs whitespace-pre-wrap break-words px-4 py-4">
                      {issue.note?.trim() || "—"}
                    </td>

                    <td className="px-4 py-4">
                      {getEmployeeName(issue)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-gray-500">
                      {formatDate(issue.createdAt)}
                    </td>

                    <td className="px-4 py-4">
                      <select
                        value={issue.status}
                        disabled={savingIssueId === issue._id}
                        onChange={(event) =>
                          void updateIssueStatus(
                            issue._id,
                            event.target.value
                          )
                        }
                        className="rounded-lg border px-2 py-2 text-xs disabled:opacity-50"
                      >
                        {ISSUE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {formatLabel(status)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}