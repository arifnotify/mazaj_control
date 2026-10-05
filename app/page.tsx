"use client";

import { useEffect, useState } from "react";

type MarketplaceStatus = {
  total: number;
  available: number;
};

type DashboardData = {
  totalProducts: number;
  healthyProducts: number;
  problemProducts: number;
  openIssues: number;
  marketplaceStatus: {
    Talabat: MarketplaceStatus;
    Snoonu: MarketplaceStatus;
    Rafeeq: MarketplaceStatus;
    Keeta: MarketplaceStatus;
  };
};

const marketplaces = [
  "Talabat",
  "Snoonu",
  "Rafeeq",
  "Keeta",
] as const;

export default function Dashboard() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/dashboard",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to load dashboard"
        );
      }

      setData(result);
    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100">

      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Mazaj Control
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Product Management Dashboard
            </p>
          </div>

          <button
            onClick={loadDashboard}
            className="rounded-lg bg-black px-5 py-2.5 text-white font-medium hover:bg-gray-800"
          >
            Refresh
          </button>

        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8">

        {/* Navigation */}
        <div className="grid grid-cols-5 gap-4 mb-8">

          <a
            href="/"
            className="bg-black text-white rounded-xl p-4 font-medium"
          >
            Dashboard
          </a>

          <a
            href="/products"
            className="bg-white rounded-xl p-4 font-medium hover:bg-gray-50"
          >
            Products
          </a>

          <a
            href="/issues"
            className="bg-white rounded-xl p-4 font-medium hover:bg-gray-50"
          >
            Issues
          </a>

          <div className="bg-white rounded-xl p-4 font-medium text-gray-400">
            Categories
          </div>

          <div className="bg-white rounded-xl p-4 font-medium text-gray-400">
            Employees
          </div>

        </div>

        {/* Loading */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">
              Loading dashboard...
            </p>
          </div>
        ) : !data ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">

            <h2 className="text-xl font-bold text-red-600">
              Dashboard data could not be loaded
            </h2>

            <p className="text-gray-500 mt-2">
              Check your MongoDB connection and API.
            </p>

            <button
              onClick={loadDashboard}
              className="mt-5 bg-black text-white px-5 py-3 rounded-lg"
            >
              Try Again
            </button>

          </div>
        ) : (
          <>
            {/* Main Stats */}
            <div className="grid grid-cols-4 gap-5 mb-8">

              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-500">
                  Total Products
                </p>

                <p className="text-4xl font-bold mt-2">
                  {data.totalProducts}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-500">
                  Healthy Products
                </p>

                <p className="text-4xl font-bold text-green-600 mt-2">
                  {data.healthyProducts}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-500">
                  Problems
                </p>

                <p className="text-4xl font-bold text-red-600 mt-2">
                  {data.problemProducts}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-500">
                  Open Issues
                </p>

                <p className="text-4xl font-bold text-orange-500 mt-2">
                  {data.openIssues}
                </p>
              </div>

            </div>

            {/* Marketplace */}
            <div className="bg-white rounded-xl shadow-sm p-6">

              <div className="flex items-center justify-between mb-6">

                <div>
                  <h2 className="text-xl font-bold">
                    Marketplace Status
                  </h2>

                  <p className="text-gray-500 text-sm mt-1">
                    Product availability across marketplaces
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-4 gap-5">

                {marketplaces.map(
                  (marketplace) => {
                    const status =
                      data.marketplaceStatus[
                        marketplace
                      ];

                    const percentage =
                      status.total > 0
                        ? Math.round(
                            (status.available /
                              status.total) *
                              100
                          )
                        : 0;

                    return (
                      <div
                        key={marketplace}
                        className="border rounded-xl p-5"
                      >

                        <div className="flex items-center justify-between">

                          <h3 className="font-bold text-lg">
                            {marketplace}
                          </h3>

                          <span
                            className={`w-3 h-3 rounded-full ${
                              percentage === 100
                                ? "bg-green-500"
                                : percentage > 0
                                ? "bg-orange-500"
                                : "bg-red-500"
                            }`}
                          />

                        </div>

                        <p className="text-3xl font-bold mt-4">
                          {percentage}%
                        </p>

                        <p className="text-sm text-gray-500 mt-1">
                          {status.available} of{" "}
                          {status.total} products available
                        </p>

                        <div className="w-full h-2 bg-gray-100 rounded-full mt-4 overflow-hidden">

                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-3 gap-5">

              <a
                href="/products/new"
                className="bg-black text-white rounded-xl p-6 hover:bg-gray-800"
              >
                <p className="text-lg font-bold">
                  + Add Product
                </p>

                <p className="text-sm text-gray-300 mt-1">
                  Create a new master product
                </p>
              </a>

              <a
                href="/products"
                className="bg-white rounded-xl p-6 hover:bg-gray-50"
              >
                <p className="text-lg font-bold">
                  Manage Products
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  View and manage all products
                </p>
              </a>

              <a
                href="/issues"
                className="bg-white rounded-xl p-6 hover:bg-gray-50"
              >
                <p className="text-lg font-bold">
                  Manage Issues
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  Review and fix marketplace problems
                </p>
              </a>

            </div>
          </>
        )}

      </div>
    </main>
  );
}