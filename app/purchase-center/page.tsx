
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Marketplace = {
  name: string;
  connected: boolean;
  available: boolean;
  syncStatus: string;
};

type Product = {
  _id: string;
  sku: string;
  name: string;
  image: string;
  stock: number;
  active: boolean;
  outOfStock: boolean;
  marketplaceInactive: boolean;
  marketplaces: Marketplace[];
};

type Supplier = {
  _id: string;
  name: string;
  type: "regular" | "market";
  phone?: string;
  email?: string;
  marketName?: string;
};

type PurchaseItem = {
  productId: string;
  quantity: number;
  unitCost: number;
};

type PurchaseOrder = {
  _id: string;
  orderNumber: string;
  supplierName: string;
  supplierType: string;
  supplierPhone?: string;
  supplierEmail?: string;
  marketName?: string;
  items: {
    productId: string;
    sku: string;
    name: string;
    image?: string;
    quantity: number;
    unitCost: number;
    lineTotal: number;
  }[];
  subtotal: number;
  notes?: string;
  status: "draft" | "ordered" | "received" | "cancelled";
  createdAt: string;
};

const currency = (amount: number) =>
  new Intl.NumberFormat("en-QA", {
    style: "currency",
    currency: "QAR",
  }).format(amount);

const statusLabel: Record<string, string> = {
  draft: "Draft",
  ordered: "Ordered",
  received: "Received",
  cancelled: "Cancelled",
};

export default function PurchaseCenterPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selected, setSelected] = useState<PurchaseItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [supplierType, setSupplierType] = useState<"regular" | "market">(
    "regular"
  );
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [marketName, setMarketName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/purchase-center", {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load purchase center");
      }

      setProducts(data.products || []);
      setSuppliers(data.suppliers || []);
      setOrders(data.orders || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const inactiveProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.outOfStock ||
          p.marketplaceInactive ||
          !p.active
      ),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return inactiveProducts.filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term);

      const matchesFilter =
        filter === "all" ||
        (filter === "stock" && product.outOfStock) ||
        (filter === "marketplace" && product.marketplaceInactive) ||
        (filter === "catalog" && !product.active);

      return matchesSearch && matchesFilter;
    });
  }, [inactiveProducts, search, filter]);

  const totalQuantity = selected.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const totalCost = selected.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );

  function addProduct(product: Product) {
    setSelected((current) => {
      if (current.some((item) => item.productId === product._id)) {
        return current;
      }

      return [
        ...current,
        { productId: product._id, quantity: 1, unitCost: 0 },
      ];
    });

    setMessage("");
  }

  function updateItem(
    productId: string,
    field: "quantity" | "unitCost",
    value: number
  ) {
    setSelected((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, [field]: value }
          : item
      )
    );
  }

  function removeItem(productId: string) {
    setSelected((current) =>
      current.filter((item) => item.productId !== productId)
    );
  }

  async function createOrder() {
    setError("");
    setMessage("");

    if (!selected.length) {
      setError("Please add at least one product.");
      return;
    }

    if (
      selected.some(
        (item) =>
          !Number.isSafeInteger(item.quantity) ||
          item.quantity < 1 ||
          !Number.isFinite(item.unitCost) ||
          item.unitCost < 0
      )
    ) {
      setError("Check product quantities and purchase prices.");
      return;
    }

    if (supplierType === "regular" && !supplierId) {
      setError("Please select a supplier.");
      return;
    }

    if (supplierType === "market" && !newSupplierName.trim()) {
      setError("Enter the market or supplier name.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/purchase-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierType,
          supplierId: supplierType === "regular" ? supplierId : "",
          newSupplierName:
            supplierType === "market" ? newSupplierName : "",
          newSupplierPhone,
          newSupplierEmail,
          marketName,
          notes,
          items: selected,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create purchase order");
      }

      setMessage(`Purchase order ${data.order.orderNumber} created.`);
      setSelected([]);
      setNotes("");
      setNewSupplierName("");
      setNewSupplierPhone("");
      setNewSupplierEmail("");
      setMarketName("");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create order"
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(orderId: string, status: string) {
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/purchase-center", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update order");
      }

      setMessage("Purchase order status updated.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update status"
      );
    }
  }

  async function saveNewSupplier() {
    setError("");
    setMessage("");

    if (!newSupplierName.trim()) {
      setError("Enter a supplier name first.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSupplierName.trim(),
          type: supplierType,
          phone: newSupplierPhone,
          email: newSupplierEmail,
          marketName,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save supplier");
      }

      setMessage("Supplier saved successfully.");
      await loadData();

      if (supplierType === "regular") {
        setSupplierId(data.supplier._id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save supplier"
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedProducts = selected
    .map((item) => ({
      ...item,
      product: products.find((p) => p._id === item.productId),
    }))
    .filter((item) => item.product);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Purchase Center</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage inactive products, suppliers and purchase orders.
          </p>
        </div>

        <button
          onClick={() => void loadData()}
          className="rounded-lg border px-4 py-2 hover:bg-gray-50"
        >
          Refresh
        </button>
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

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Inactive / stock issue"
          value={inactiveProducts.length}
        />
        <StatCard label="Products selected" value={selected.length} />
        <StatCard label="Estimated purchase cost" value={currency(totalCost)} />
      </section>

      <section className="rounded-xl border p-4 md:p-6">
        <h2 className="mb-4 text-xl font-semibold">
          1. Find products to purchase
        </h2>

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_240px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or SKU..."
            className="rounded-lg border p-3"
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border p-3"
          >
            <option value="all">All inactive / stock issues</option>
            <option value="stock">Out of stock</option>
            <option value="marketplace">Marketplace inactive</option>
            <option value="catalog">Product disabled in dashboard</option>
          </select>
        </div>

        {loading ? (
          <p className="py-8 text-gray-500">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="py-8 text-gray-500">
            No matching products found.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const alreadyAdded = selected.some(
                (item) => item.productId === product._id
              );

              return (
                <article
                  key={product._id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-16 w-16 rounded-md border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-500">
                      No image
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      SKU: {product.sku || "—"} · Stock: {product.stock}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.outOfStock && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
                          Out of stock
                        </span>
                      )}

                      {product.marketplaceInactive && (
                        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                          Marketplace inactive
                        </span>
                      )}

                      {!product.active && (
                        <span className="rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-800">
                          Dashboard inactive
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.marketplaces.map((marketplace) => (
                        <span
                          key={marketplace.name}
                          className={`rounded px-2 py-1 text-xs ${
                            marketplace.available
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {marketplace.name}:{" "}
                          {marketplace.available ? "Active" : "Inactive"}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => addProduct(product)}
                    disabled={alreadyAdded}
                    className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {alreadyAdded ? "Added" : "Add to purchase"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border p-4 md:p-6">
        <h2 className="mb-4 text-xl font-semibold">
          2. Purchase list ({selected.length})
        </h2>

        {selectedProducts.length === 0 ? (
          <p className="text-gray-500">
            Add products above to build a purchase order.
          </p>
        ) : (
          <div className="space-y-3">
            {selectedProducts.map((item) => (
              <div
                key={item.productId}
                className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_120px_160px_120px]"
              >
                <div className="flex items-center gap-3">
                  {item.product?.image && (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-12 w-12 rounded border object-cover"
                    />
                  )}

                  <div>
                    <p className="font-medium">{item.product?.name}</p>
                    <p className="text-sm text-gray-500">
                      SKU: {item.product?.sku}
                    </p>
                  </div>
                </div>

                <label className="text-sm">
                  Quantity
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        item.productId,
                        "quantity",
                        Number(e.target.value)
                      )
                    }
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>

                <label className="text-sm">
                  Unit cost (QAR)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitCost}
                    onChange={(e) =>
                      updateItem(
                        item.productId,
                        "unitCost",
                        Number(e.target.value)
                      )
                    }
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>

                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-500">Line total</p>
                    <p className="font-semibold">
                      {currency(item.quantity * item.unitCost)}
                    </p>
                  </div>

                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap justify-between gap-2 border-t pt-4">
          <p className="text-sm text-gray-500">
            Total quantity: {totalQuantity}
          </p>
          <p className="text-lg font-bold">
            Total: {currency(totalCost)}
          </p>
        </div>
      </section>

      <section className="rounded-xl border p-4 md:p-6">
        <h2 className="mb-4 text-xl font-semibold">
          3. Supplier and market
        </h2>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSupplierType("regular")}
            className={`rounded-lg border px-4 py-2 ${
              supplierType === "regular"
                ? "bg-black text-white"
                : "hover:bg-gray-50"
            }`}
          >
            Existing supplier
          </button>

          <button
            type="button"
            onClick={() => setSupplierType("market")}
            className={`rounded-lg border px-4 py-2 ${
              supplierType === "market"
                ? "bg-black text-white"
                : "hover:bg-gray-50"
            }`}
          >
            New market / supplier
          </button>
        </div>

        {supplierType === "regular" ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Select supplier
            </label>

            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-lg border p-3"
            >
              <option value="">Choose a supplier</option>
              {suppliers
                .filter((supplier) => supplier.type === "regular")
                .map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                    {supplier.phone ? ` — ${supplier.phone}` : ""}
                  </option>
                ))}
            </select>

            {suppliers.filter((s) => s.type === "regular").length === 0 && (
              <p className="text-sm text-gray-500">
                No existing suppliers yet. Choose New market / supplier to
                add your first supplier.
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Supplier / market name *"
              value={newSupplierName}
              onChange={setNewSupplierName}
              placeholder="Supplier or market name"
            />
            <Field
              label="Market name"
              value={marketName}
              onChange={setMarketName}
              placeholder="Wholesale market"
            />
            <Field
              label="Phone"
              value={newSupplierPhone}
              onChange={setNewSupplierPhone}
              placeholder="+974..."
            />
            <Field
              label="Email"
              value={newSupplierEmail}
              onChange={setNewSupplierEmail}
              placeholder="supplier@example.com"
            />

            <button
              type="button"
              onClick={saveNewSupplier}
              disabled={saving || !newSupplierName.trim()}
              className="rounded-lg border px-4 py-2 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save supplier for later"}
            </button>
          </div>
        )}

        <label className="mt-4 block text-sm font-medium">
          Purchase notes
        </label>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Delivery date, agreed price, packaging or other notes..."
          className="mt-1 w-full rounded-lg border p-3"
        />

        <button
          onClick={createOrder}
          disabled={saving || selected.length === 0}
          className="mt-4 rounded-lg bg-black px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {saving ? "Creating order..." : "Create Purchase Order"}
        </button>

        <p className="mt-2 text-xs text-gray-500">
          Creating an order saves it in this dashboard. It does not
          automatically send an order to the supplier.
        </p>
      </section>

      <section className="rounded-xl border p-4 md:p-6">
        <h2 className="mb-4 text-xl font-semibold">
          4. Purchase order history
        </h2>

        {orders.length === 0 ? (
          <p className="text-gray-500">No purchase orders yet.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article key={order._id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">
                      Supplier: {order.supplierName}
                    </p>
                    {order.marketName && (
                      <p className="text-sm text-gray-500">
                        Market: {order.marketName}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {currency(order.subtotal)}
                    </p>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                      {statusLabel[order.status] || order.status}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.productId}-${index}`}
                      className="flex items-center justify-between gap-3 border-t pt-2 text-sm"
                    >
                      <div>
                        <p>{item.name}</p>
                        <p className="text-xs text-gray-500">
                          SKU: {item.sku} · Qty: {item.quantity} ·{" "}
                          {currency(item.unitCost)} each
                        </p>
                      </div>
                      <p className="font-medium">
                        {currency(item.lineTotal)}
                      </p>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <p className="mt-3 text-sm text-gray-500">
                    Notes: {order.notes}
                  </p>
                )}

                {order.status !== "received" &&
                  order.status !== "cancelled" && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {order.status === "draft" && (
                        <button
                          onClick={() =>
                            updateStatus(order._id, "ordered")
                          }
                          className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white"
                        >
                          Mark as ordered
                        </button>
                      )}

                      <button
                        onClick={() =>
                          updateStatus(order._id, "received")
                        }
                        className="rounded-lg bg-green-700 px-3 py-2 text-sm text-white"
                      >
                        Mark as received
                      </button>

                      <button
                        onClick={() =>
                          updateStatus(order._id, "cancelled")
                        }
                        className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700"
                      >
                        Cancel order
                      </button>
                    </div>
                  )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border p-3 font-normal"
      />
    </label>
  );
}
