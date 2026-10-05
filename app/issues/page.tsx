"use client";

import { useEffect, useState } from "react";

type Product = {
  _id: string;
  name: string;
  sku: string;
};

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
  status: "open" | "in_progress" | "fixed" | "verified" | "closed";
  note: string;
  createdAt: string;
};

const issueLabels: Record<string, string> = {
  price: "Price",
  name: "Name",
  description: "Description",
  image: "Image",
  category: "Category",
  availability: "Availability",
  other: "Other",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  fixed: "Fixed",
  verified: "Verified",
  closed: "Closed",
};

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  async function loadIssues() {
    try {
      setLoading(true);

      const response = await fetch("/api/issues");
      const data = await response.json();

      setIssues(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load issues:", error);
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
      setUpdating(issueId);

      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to update issue");
        return;
      }

      setIssues((currentIssues) =>
        currentIssues.map((issue) =>
          issue._id === issueId ? data : issue
        )
      );
    } catch (error) {
      console.error("Update issue error:", error);
      alert("Failed to update issue");
    } finally {
      setUpdating(null);
    }
  }

  const filteredIssues =
    filter === "all"
      ? issues
      : issues.filter((issue) => issue.status === filter);

  const openCount = issues.filter(
    (issue) => issue.status === "open"
  ).length;

  const progressCount = issues.filter(
    (issue) => issue.status === "in_progress"
  ).length;

  const fixedCount = issues.filter(
    (issue) =>
      issue.status === "fixed" ||
      issue.status === "verified" ||
      issue.status === "closed"
  ).length;

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <a
              href="/"
              className="text-sm text-gray-500 hover:text-black"
            >
              ← Dashboard
            </a>

            <h1 className="text-3xl font-bold text-gray-900 mt-3">
              Issues
            </h1>

            <p className="text-gray-500 mt-1">
              Manage product problems reported by employees
            </p>
          </div>

          <button
            onClick={loadIssues}
            className="rounded-lg border bg-white px-5 py-3 font-medium hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-5 mb-8">

          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-500">Total Issues</p>
            <p className="text-3xl font-bold mt-2">
              {issues.length}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-500">Open</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {openCount}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-500">In Progress</p>
            <p className="text-3xl font-bold text-orange-500 mt-2">
              {progressCount}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-500">Fixed</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {fixedCount}
            </p>
          </div>

        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-3 flex-wrap">

            {[
              ["all", "All"],
              ["open", "Open"],
              ["in_progress", "In Progress"],
              ["fixed", "Fixed"],
              ["verified", "Verified"],
              ["closed", "Closed"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-4 py-2 rounded-lg ${
                  filter === value
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}

          </div>
        </div>

        {/* Issues */}
        <div className="space-y-4">

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-500">
              Loading issues...
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <h2 className="text-xl font-semibold">
                No issues found
              </h2>

              <p className="text-gray-500 mt-2">
                There are no reported problems in this category.
              </p>
            </div>
          ) : (
            filteredIssues.map((issue) => (

              <div
                key={issue._id}
                className="bg-white rounded-xl shadow-sm p-6"
              >

                {/* Top */}
                <div className="flex items-start justify-between">

                  <div>
                    <h2 className="text-xl font-bold">
                      {issue.productId?.name || "Unknown Product"}
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                      SKU: {issue.productId?.sku || "-"}
                    </p>
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      issue.status === "open"
                        ? "bg-red-100 text-red-700"
                        : issue.status === "in_progress"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {statusLabels[issue.status]}
                  </div>

                </div>

                {/* Details */}
                <div className="grid grid-cols-3 gap-4 mt-6">

                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500">
                      Marketplace
                    </p>

                    <p className="font-semibold mt-1">
                      {issue.marketplace}
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500">
                      Problem
                    </p>

                    <p className="font-semibold mt-1">
                      {issueLabels[issue.type] || issue.type}
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500">
                      Reported
                    </p>

                    <p className="font-semibold mt-1">
                      {new Date(
                        issue.createdAt
                      ).toLocaleString()}
                    </p>
                  </div>

                </div>

                {/* Note */}
                {issue.note && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">
                      Note
                    </p>

                    <p className="mt-1">
                      {issue.note}
                    </p>
                  </div>
                )}

                {/* Status Actions */}
                <div className="mt-6 border-t pt-5">

                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Update Status
                  </p>

                  <div className="flex gap-3 flex-wrap">

                    {issue.status === "open" && (
                      <button
                        disabled={updating === issue._id}
                        onClick={() =>
                          updateStatus(
                            issue._id,
                            "in_progress"
                          )
                        }
                        className="rounded-lg bg-orange-500 px-4 py-2 text-white font-medium hover:bg-orange-600 disabled:opacity-50"
                      >
                        {updating === issue._id
                          ? "Updating..."
                          : "Start Work"}
                      </button>
                    )}

                    {issue.status === "in_progress" && (
                      <button
                        disabled={updating === issue._id}
                        onClick={() =>
                          updateStatus(
                            issue._id,
                            "fixed"
                          )
                        }
                        className="rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        {updating === issue._id
                          ? "Updating..."
                          : "Mark Fixed"}
                      </button>
                    )}

                    {issue.status === "fixed" && (
                      <button
                        disabled={updating === issue._id}
                        onClick={() =>
                          updateStatus(
                            issue._id,
                            "verified"
                          )
                        }
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updating === issue._id
                          ? "Updating..."
                          : "Verify"}
                      </button>
                    )}

                    {issue.status === "verified" && (
                      <button
                        disabled={updating === issue._id}
                        onClick={() =>
                          updateStatus(
                            issue._id,
                            "closed"
                          )
                        }
                        className="rounded-lg bg-gray-800 px-4 py-2 text-white font-medium hover:bg-black disabled:opacity-50"
                      >
                        {updating === issue._id
                          ? "Updating..."
                          : "Close Issue"}
                      </button>
                    )}

                  </div>
                </div>

              </div>
            ))
          )}

        </div>
      </div>
    </main>
  );
}