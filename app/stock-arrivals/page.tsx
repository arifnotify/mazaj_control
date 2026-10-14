"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  _id: string;
  sku: string;
  name: string;
  image?: string;
};

type Employee = {
  _id: string;
  name: string;
  active?: boolean;
};

type Arrival = {
  _id: string;
  products: {
    productId: string;
    sku: string;
    name: string;
    image?: string;
  }[];
  status: "pending" | "completed";
  confirmedByName?: string;
  confirmedAt?: string;
  createdAt: string;
};

export default function StockArrivalsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [activeArrival, setActiveArrival] = useState("");
  const [marketplaces, setMarketplaces] = useState({
    talabat: false,
    snoonu: false,
    rafeeq: false,
    keeta: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);

    try {
      const [stockRes, employeeRes] = await Promise.all([
        fetch("/api/stock-arrivals", { cache: "no-store" }),
        fetch("/api/employees", { cache: "no-store" }),
      ]);

      const stockData = await stockRes.json();
      const employeeData = await employeeRes.json();

      if (!stockRes.ok || !stockData.success) {
        throw new Error(stockData.message || "Failed to load products");
      }

      setProducts(stockData.products || []);
      setArrivals(stockData.arrivals || []);

      const employeeList = Array.isArray(employeeData)
        ? employeeData
        : employeeData.employees || [];

      setEmployees(
        employeeList.filter(
          (employee: Employee) => employee.active !== false
        )
      );
    } catch (e: any) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return products;

    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
    );
  }, [products, search]);

  function toggleProduct(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  async function createArrival() {
    setError("");
    setMessage("");

    if (!selected.length) {
      setError("Please select at least one product.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/stock-arrivals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selected }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Could not create arrival");
      }

      setMessage("Stock arrival created successfully.");
      setSelected([]);
      setSearch("");
      await loadData();
    } catch (e: any) {
      setError(e.message || "Failed to create arrival");
    } finally {
      setSaving(false);
    }
  }

  async function confirmArrival() {
    setError("");
    setMessage("");

    if (!activeArrival) {
      setError("Please select a pending stock arrival.");
      return;
    }

    if (!employeeId || !pin) {
      setError("Select your employee account and enter your PIN.");
      return;
    }

    if (!Object.values(marketplaces).every(Boolean)) {
      setError("Confirm all four marketplaces before submitting.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/stock-arrivals/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arrivalId: activeArrival,
          employeeId,
          pin,
          marketplaces,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Confirmation failed");
      }

      setMessage("Stock arrival marked as completed.");
      setPin("");
      setActiveArrival("");
      setMarketplaces({
        talabat: false,
        snoonu: false,
        rafeeq: false,
        keeta: false,
      });

      await loadData();
    } catch (e: any) {
      setError(e.message || "Confirmation failed");
    } finally {
      setSaving(false);
    }
  }

  const pending = arrivals.filter((a) => a.status === "pending");
  const completed = arrivals.filter((a) => a.status === "completed");

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <header>
        <h1 className="text-3xl font-bold">Stock Arrivals</h1>
        <p className="mt-2 text-sm text-gray-500">
          Select newly arrived products and record marketplace activation.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-green-800">
          {message}
        </div>
      )}

      <section className="rounded-xl border p-4 md:p-6">
        <h2 className="mb-4 text-xl font-semibold">
          1. Select products back in stock
        </h2>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product name or SKU..."
          className="mb-4 w-full rounded-lg border p-3"
        />

        <div className="mb-3 text-sm text-gray-500">
          Selected: {selected.length}
        </div>

        {loading ? (
          <p>Loading products...</p>
        ) : (
          <div className="max-h-[480px] space-y-2 overflow-y-auto">
            {filteredProducts.map((product) => (
              <label
                key={product._id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(product._id)}
                  onChange={() => toggleProduct(product._id)}
                  className="h-4 w-4"
                />

                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-14 w-14 rounded-md border object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
                    No image
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">
                    SKU: {product.sku}
                  </p>
                </div>
              </label>
            ))}

            {!filteredProducts.length && (
              <p className="p-4 text-gray-500">No products found.</p>
            )}
          </div>
        )}

        <button
          onClick={createArrival}
          disabled={saving || !selected.length}
          className="mt-4 rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Stock Arrival"}
        </button>
      </section>

      <section className="rounded-xl border p-4 md:p-6">
        <h2 className="mb-4 text-xl font-semibold">
          2. Confirm marketplace activation
        </h2>

        <label className="mb-2 block text-sm font-medium">
          Pending stock arrival
        </label>

        <select
          value={activeArrival}
          onChange={(e) => setActiveArrival(e.target.value)}
          className="mb-4 w-full rounded-lg border p-3"
        >
          <option value="">Select stock arrival</option>
          {pending.map((arrival) => (
            <option key={arrival._id} value={arrival._id}>
              {new Date(arrival.createdAt).toLocaleString()} —{" "}
              {arrival.products.length} product(s)
            </option>
          ))}
        </select>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["talabat", "Talabat"],
              ["snoonu", "Snoonu"],
              ["rafeeq", "Rafeeq"],
              ["keeta", "Keeta"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <input
                type="checkbox"
                checked={marketplaces[key]}
                onChange={(e) =>
                  setMarketplaces((current) => ({
                    ...current,
                    [key]: e.target.checked,
                  }))
                }
              />
              <span>{label} — products are active</span>
            </label>
          ))}
        </div>

        <label className="mb-2 block text-sm font-medium">
          Your employee account
        </label>

        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="mb-4 w-full rounded-lg border p-3"
        >
          <option value="">Select your name</option>
          {employees.map((employee) => (
            <option key={employee._id} value={employee._id}>
              {employee.name}
            </option>
          ))}
        </select>

        <label className="mb-2 block text-sm font-medium">
          Your PIN
        </label>

        <input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter your personal PIN"
          className="mb-4 w-full rounded-lg border p-3"
        />

        <button
          onClick={confirmArrival}
          disabled={saving || !activeArrival}
          className="rounded-lg bg-green-700 px-5 py-3 text-white disabled:opacity-50"
        >
          {saving ? "Verifying..." : "Verify PIN & Complete Arrival"}
        </button>

        <p className="mt-3 text-xs text-gray-500">
          Only confirm after checking all four marketplace apps. This records
          your confirmation; it does not activate products in external apps
          automatically.
        </p>
      </section>

      <section className="rounded-xl border p-4 md:p-6">
        <h2 className="mb-4 text-xl font-semibold">
          Pending Arrivals ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <p className="text-gray-500">No pending arrivals.</p>
        ) : (
          <div className="space-y-4">
            {pending.map((arrival) => (
              <ArrivalCard key={arrival._id} arrival={arrival} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border p-4 md:p-6">
        <h2 className="mb-4 text-xl font-semibold">
          Completed Arrivals ({completed.length})
        </h2>

        {completed.length === 0 ? (
          <p className="text-gray-500">No completed arrivals yet.</p>
        ) : (
          <div className="space-y-4">
            {completed.map((arrival) => (
              <ArrivalCard key={arrival._id} arrival={arrival} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function ArrivalCard({ arrival }: { arrival: Arrival }) {
  return (
    <article className="rounded-lg border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-gray-500">
          Created: {new Date(arrival.createdAt).toLocaleString()}
        </span>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            arrival.status === "completed"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {arrival.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-3">
        {arrival.products.map((product, index) => (
          <div
            key={`${product.productId}-${index}`}
            className="flex items-center gap-3"
          >
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-12 w-12 rounded border object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded bg-gray-100" />
            )}

            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
            </div>
          </div>
        ))}
      </div>

      {arrival.status === "completed" && (
        <div className="mt-4 border-t pt-3 text-sm text-gray-600">
          <p>Confirmed by: {arrival.confirmedByName || "Employee"}</p>
          <p>
            Confirmed at:{" "}
            {arrival.confirmedAt
              ? new Date(arrival.confirmedAt).toLocaleString()
              : "—"}
          </p>
        </div>
      )}
    </article>
  );
}