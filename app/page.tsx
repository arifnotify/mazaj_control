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

const defaultData: DashboardData = {
  totalProducts: 0,
  healthyProducts: 0,
  problemProducts: 0,
  openIssues: 0,

  marketplaceStatus: {
    Talabat: {
      total: 0,
      available: 0,
    },

    Snoonu: {
      total: 0,
      available: 0,
    },

    Rafeeq: {
      total: 0,
      available: 0,
    },

    Keeta: {
      total: 0,
      available: 0,
    },
  },
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(defaultData);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      setLoading(true);

      const response = await fetch("/api/dashboard", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load dashboard");
      }

      const result = await response.json();

      setData(result);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function getPercentage(
    available: number,
    total: number
  ) {
    if (!total) return 0;

    return Math.round((available / total) * 100);
  }

  const marketplaces = [
    {
      name: "Talabat",
      data: data.marketplaceStatus.Talabat,
    },
    {
      name: "Snoonu",
      data: data.marketplaceStatus.Snoonu,
    },
    {
      name: "Rafeeq",
      data: data.marketplaceStatus.Rafeeq,
    },
    {
      name: "Keeta",
      data: data.marketplaceStatus.Keeta,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-8 py-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Product management overview
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Refresh
        </button>
      </header>

      {/* Main */}
      <div className="p-8">

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">

          {/* Total Products */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Total Products
            </p>

            <p className="mt-3 text-3xl font-bold text-gray-900">
              {loading ? "..." : data.totalProducts}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              All master products
            </p>
          </div>

          {/* Healthy */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Healthy Products
            </p>

            <p className="mt-3 text-3xl font-bold text-green-600">
              {loading ? "..." : data.healthyProducts}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              No open problems
            </p>
          </div>

          {/* Problems */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Problems
            </p>

            <p className="mt-3 text-3xl font-bold text-red-600">
              {loading ? "..." : data.problemProducts}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Products with issues
            </p>
          </div>

          {/* Issues */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Open Issues
            </p>

            <p className="mt-3 text-3xl font-bold text-orange-600">
              {loading ? "..." : data.openIssues}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Need attention
            </p>
          </div>
        </div>

        {/* Marketplace */}
        <div className="mt-8 rounded-xl border bg-white shadow-sm">

          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold text-gray-900">
              Marketplace Status
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Product availability across marketplaces
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2 xl:grid-cols-4">

            {marketplaces.map((marketplace) => {
              const percentage = getPercentage(
                marketplace.data.available,
                marketplace.data.total
              );

              return (
                <div
                  key={marketplace.name}
                  className="rounded-xl border p-5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      {marketplace.name}
                    </h3>

                    <span className="text-sm font-bold text-gray-700">
                      {percentage}%
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-black transition-all"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex justify-between text-xs text-gray-500">
                    <span>
                      Available: {marketplace.data.available}
                    </span>

                    <span>
                      Total: {marketplace.data.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">

          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            <a
              href="/products/new"
              className="rounded-xl border bg-white p-6 shadow-sm transition hover:border-black"
            >
              <h3 className="font-semibold text-gray-900">
                Add Product
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Create a new master product
              </p>
            </a>

            <a
              href="/products"
              className="rounded-xl border bg-white p-6 shadow-sm transition hover:border-black"
            >
              <h3 className="font-semibold text-gray-900">
                Manage Products
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                View and manage all products
              </p>
            </a>

            <a
              href="/issues"
              className="rounded-xl border bg-white p-6 shadow-sm transition hover:border-black"
            >
              <h3 className="font-semibold text-gray-900">
                Manage Issues
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Find and fix marketplace problems
              </p>
            </a>

          </div>
        </div>

      </div>
    </div>
  );
}