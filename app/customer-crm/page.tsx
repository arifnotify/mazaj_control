"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/components/LanguageProvider";

type Customer = {
  _id: string;
  name: string;
  whatsapp: string;
  address?: string;
  area?: string;
  notes?: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderAt?: string;
};

type Product = {
  _id: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  sku?: string;
  price?: number;
  image?: string;
  imageUrl?: string;
  imageURL?: string;
  photo?: string;
  thumbnail?: string;
  active?: boolean;
};

type OrderItem = {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

type Order = {
  _id: string;
  orderDate: string;
  platform: string;
  status: string;
  orderTotal: number;
  items: {
    productId?: string;
    productName: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
};

const PLATFORMS = ["Talabat", "Snoonu", "Rafeeq", "Keeta", "Direct"];

const STATUSES = ["Pending", "Confirmed", "Delivered", "Cancelled"];

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function money(value: number) {
  return new Intl.NumberFormat("en-QA", {
    style: "currency",
    currency: "QAR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export default function CustomerCRMPage() {
  const { isArabic } = useLanguage();
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);
  const productName = (product: Product) => isArabic
    ? (product.nameAr || product.nameEn || product.name || "منتج بلا اسم")
    : (product.nameEn || product.name || product.nameAr || "Unnamed product");
  const productImage = (product: Product) => product.image || product.imageUrl || product.imageURL || product.photo || product.thumbnail || "";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const [customerForm, setCustomerForm] = useState({
    name: "",
    whatsapp: "",
    address: "",
    area: "",
    notes: "",
  });

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");

  const [items, setItems] = useState<OrderItem[]>([]);

  const [orderDate, setOrderDate] = useState(localDate());
  const [platform, setPlatform] = useState("Direct");
  const [status, setStatus] = useState("Pending");
  const [orderNotes, setOrderNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedProduct = products.find(
    (product) => product._id === productId
  );

  const orderTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) =>
      [
        customer.name,
        customer.whatsapp,
        customer.area,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();

    return products
      .filter((product) => product.active !== false)
      .filter((product) => {
        if (!query) return true;

        return [
          product.name,
          product.nameEn,
          product.nameAr,
          product.sku,
        ].some((value) =>
          String(value || "").toLowerCase().includes(query)
        );
      })
      .slice(0, 50);
  }, [products, productSearch]);

  const loadCustomers = useCallback(async () => {
    const response = await fetch("/api/customers", {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load customers.");
    }

    setCustomers(Array.isArray(data) ? data : []);
  }, []);

  const loadProducts = useCallback(async () => {
    const response = await fetch("/api/products", {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load products.");
    }

    setProducts(Array.isArray(data) ? data : []);
  }, []);

  const loadOrders = useCallback(async (customerId: string) => {
    const response = await fetch(
      `/api/customer-orders?customerId=${encodeURIComponent(customerId)}`,
      { cache: "no-store" }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load order history.");
    }

    setOrders(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    async function initialize() {
      setLoading(true);
      setError("");

      try {
        await Promise.all([loadCustomers(), loadProducts()]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load CRM."
        );
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, [loadCustomers, loadProducts]);

  function resetOrderForm() {
    setItems([]);
    setProductId("");
    setProductSearch("");
    setQuantity("1");
    setUnitPrice("0");
    setOrderDate(localDate());
    setPlatform("Direct");
    setStatus("Pending");
    setOrderNotes("");
  }

  function selectCustomer(customer: Customer) {
    setCustomerDetailsOpen(false);
    setSelectedCustomer(customer);

    setCustomerForm({
      name: customer.name || "",
      whatsapp: customer.whatsapp || "",
      address: customer.address || "",
      area: customer.area || "",
      notes: customer.notes || "",
    });

    setSuccess("");
    setError("");

    loadOrders(customer._id).catch((err) => {
      setError(err.message || "Could not load customer orders.");
    });
  }

  function startNewCustomer() {
    setCustomerDetailsOpen(true);
    setSelectedCustomer(null);
    setOrders([]);

    setCustomerForm({
      name: "",
      whatsapp: "",
      address: "",
      area: "",
      notes: "",
    });

    setCustomerSearch("");
    setSuccess("");
    setError("");
  }

  function selectProduct(product: Product) {
    setProductId(product._id);
    setUnitPrice(String(Number(product.price || 0)));
    setProductSearch("");
  }

  function addProduct() {
    if (!selectedProduct) {
      setError("Please select a product.");
      return;
    }

    const qty = Number(quantity);
    const price = Number(unitPrice);

    if (!Number.isInteger(qty) || qty < 1) {
      setError("Quantity must be a whole number greater than zero.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError("Please enter a valid price.");
      return;
    }

    const selectedProductName = productName(selectedProduct);

    setItems((current) => {
      const existing = current.find(
        (item) => item.productId === selectedProduct._id
      );

      if (existing) {
        return current.map((item) =>
          item.productId === selectedProduct._id
            ? { ...item, quantity: item.quantity + qty, unitPrice: price }
            : item
        );
      }

      return [
        ...current,
        {
          productId: selectedProduct._id,
          productName: selectedProductName,
          sku: selectedProduct.sku || "",
          quantity: qty,
          unitPrice: price,
        },
      ];
    });

    setProductId("");
    setQuantity("1");
    setUnitPrice("0");
    setError("");
  }

  function updateItemQuantity(productId: string, value: string) {
    const qty = Number(value);

    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, Math.floor(qty || 1)) }
          : item
      )
    );
  }

  function updateItemPrice(productId: string, value: string) {
    const price = Number(value);

    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              unitPrice: Number.isFinite(price) ? Math.max(0, price) : 0,
            }
          : item
      )
    );
  }

  function removeItem(productId: string) {
    setItems((current) =>
      current.filter((item) => item.productId !== productId)
    );
  }

  async function saveOrder() {
    setError("");
    setSuccess("");

    if (!customerForm.name.trim()) {
      setError("Please enter customer name.");
      return;
    }

    if (customerForm.whatsapp.replace(/\D/g, "").length < 7) {
      setError("Please enter a valid WhatsApp number.");
      return;
    }

    if (!items.length) {
      setError("Please add at least one product.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/customer-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: customerForm,
          language: isArabic ? "ar" : "en",
          orderDate,
          platform,
          status,
          notes: orderNotes,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save order.");
      }

      setSuccess("Order saved successfully.");

      resetOrderForm();

      await loadCustomers();

      const customerId = data.customerId;

      if (customerId) {
        const customerResponse = await fetch("/api/customers", {
          cache: "no-store",
        });

        const customerData = await customerResponse.json();

        const updatedCustomer = customerData.find(
          (customer: Customer) => customer._id === customerId
        );

        if (updatedCustomer) {
          setCustomerDetailsOpen(false);
          setSelectedCustomer(updatedCustomer);
          setCustomerForm({
            name: updatedCustomer.name || "",
            whatsapp: updatedCustomer.whatsapp || "",
            address: updatedCustomer.address || "",
            area: updatedCustomer.area || "",
            notes: updatedCustomer.notes || "",
          });

          await loadOrders(customerId);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100";

  const labelClass = "block text-sm font-semibold text-slate-700";

  if (loading) {
    return (
      <main dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="mt-6 h-64 rounded-2xl bg-slate-200" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              MAZAJ CONTROL
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Customer Intelligence CRM
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Customer profiles, purchase history and order management
            </p>
          </div>

          <button
            onClick={startNewCustomer}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            + New Customer
          </button>
        </header>

        {/* Alerts */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* Summary */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Customers</p>
            <p className="mt-2 text-3xl font-bold">{customers.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Selected Customer Orders</p>
            <p className="mt-2 text-3xl font-bold">
              {selectedCustomer?.totalOrders || 0}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Customer Lifetime Spend</p>
            <p className="mt-2 text-3xl font-bold">
              {money(selectedCustomer?.totalSpent || 0)}
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

          {/* Customer List */}
          <aside className="space-y-4 lg:col-span-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Customers</h2>
                <span className="text-xs text-slate-500">
                  {filteredCustomers.length} records
                </span>
              </div>

              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search name, WhatsApp or area..."
                className={inputClass}
              />

              <div className="mt-4 max-h-[600px] space-y-2 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer._id}
                    onClick={() => selectCustomer(customer)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedCustomer?._id === customer._id
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {customer.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {customer.totalOrders || 0} orders
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {customer.whatsapp}
                    </p>

                    <div className="mt-2 flex justify-between text-xs text-slate-500">
                      <span>{customer.area || "Area not added"}</span>
                      <span>{money(customer.totalSpent || 0)}</span>
                    </div>
                  </button>
                ))}

                {filteredCustomers.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-400">
                    No customers found.
                  </p>
                )}
              </div>
            </section>
          </aside>

          {/* Main Content */}
          <section className="space-y-6 lg:col-span-8">

            {/* New Order */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Record an order</h2>
                  <p className="text-xs text-slate-500">Record customer order · Customer is matched by WhatsApp; a new record is created only when no match exists.</p>
                </div>
                {selectedCustomer && <button type="button" onClick={() => setCustomerDetailsOpen((v) => !v)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{customerDetailsOpen ? "Close customer edit" : "✎ Edit customer"}</button>}
              </div>
              {(customerDetailsOpen || !selectedCustomer) && (
                <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">Customer details</h3>{selectedCustomer && <span className="text-xs text-slate-500">Editing existing customer</span>}</div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className={labelClass}>Customer name *<input className={inputClass} value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} placeholder="Customer full name" /></label>
                    <label className={labelClass}>WhatsApp *<input className={inputClass} value={customerForm.whatsapp} onChange={(e) => setCustomerForm({ ...customerForm, whatsapp: e.target.value })} placeholder="974XXXXXXXX" /></label>
                    <label className={labelClass}>Address<input className={inputClass} value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} placeholder="Customer address" /></label>
                    <label className={labelClass}>Area<input className={inputClass} value={customerForm.area} onChange={(e) => setCustomerForm({ ...customerForm, area: e.target.value })} placeholder="Doha, Lusail, etc." /></label>
                    <label className={`${labelClass} md:col-span-2`}>Customer notes<textarea className={inputClass} rows={2} value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} placeholder="Preferences or customer notes..." /></label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className={labelClass}>
                  Order Date *
                  <input
                    type="date"
                    className={inputClass}
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </label>

                <label className={labelClass}>
                  Platform *
                  <select
                    className={inputClass}
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                  >
                    {PLATFORMS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={labelClass}>
                  Order Status *
                  <select
                    className={inputClass}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Product Selector */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-bold">Add Products</h3>

                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search product name or SKU..."
                  className={inputClass}
                />

                {productSearch.trim() && (
                  <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    {filteredProducts.map((product) => (
                      <button
                        key={product._id}
                        onClick={() => selectProduct(product)}
                        type="button"
                        className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-start hover:bg-slate-50"
                      >
                        {productImage(product) ? <img src={productImage(product)} alt={productName(product)} className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 bg-white object-contain" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400">No image</div>}
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{productName(product)}</span><span className="text-xs text-slate-500">SKU: {product.sku || "-"}</span></span>
                        <span className="shrink-0 text-sm font-semibold">{money(Number(product.price || 0))}</span>
                      </button>
                    ))}

                    {filteredProducts.length === 0 && (
                      <p className="p-4 text-sm text-slate-400">
                        No matching products.
                      </p>
                    )}
                  </div>
                )}

                {selectedProduct && (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div className="flex items-center gap-3 rounded-lg bg-white p-3 md:col-span-2">
                      {productImage(selectedProduct) && <img src={productImage(selectedProduct)} alt={productName(selectedProduct)} className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-contain" />}
                      <div className="min-w-0"><p className="text-xs text-slate-500">Selected Product</p><p className="font-semibold">{productName(selectedProduct)}</p>
                      <p className="text-xs text-slate-500">{selectedProduct.sku || ""}</p></div>
                    </div>

                    <label className={labelClass}>
                      Quantity
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className={inputClass}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                    </label>

                    <label className={labelClass}>
                      Unit Price (QAR)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputClass}
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                      />
                    </label>

                    <button
                      onClick={addProduct}
                      className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 md:col-span-4"
                    >
                      + Add Product to Order
                    </button>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="mt-5">
                <h3 className="mb-3 font-bold">
                  Order Products ({items.length})
                </h3>

                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
                    No products added yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs text-slate-500">
                        <tr>
                          <th className="p-3">Product</th>
                          <th className="p-3">Qty</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">Total</th>
                          <th className="p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr
                            key={item.productId}
                            className="border-t border-slate-100"
                          >
                            <td className="p-3">
                              <p className="font-semibold">
                                {item.productId && products.find((product) => product._id === item.productId) ? productName(products.find((product) => product._id === item.productId)!) : item.productName}
                              </p>
                              <p className="text-xs text-slate-400">
                                {item.sku}
                              </p>
                            </td>

                            <td className="p-3">
                              <input
                                type="number"
                                min="1"
                                className="w-16 rounded-lg border border-slate-200 p-2"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItemQuantity(
                                    item.productId,
                                    e.target.value
                                  )
                                }
                              />
                            </td>

                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-24 rounded-lg border border-slate-200 p-2"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  updateItemPrice(
                                    item.productId,
                                    e.target.value
                                  )
                                }
                              />
                            </td>

                            <td className="p-3 font-semibold">
                              {money(item.quantity * item.unitPrice)}
                            </td>

                            <td className="p-3">
                              <button
                                onClick={() => removeItem(item.productId)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 p-4 text-white">
                  <span className="font-semibold">Order Total</span>
                  <span className="text-2xl font-bold">
                    {money(orderTotal)}
                  </span>
                </div>
              </div>

              <label className={`${labelClass} mt-5`}>
                Order Notes
                <textarea
                  rows={2}
                  className={inputClass}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Optional order notes..."
                />
              </label>

              <button
                onClick={saveOrder}
                disabled={saving}
                className="mt-5 w-full rounded-xl bg-emerald-600 px-5 py-3.5 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving Order..." : "Save Customer & Order"}
              </button>
            </section>

            {/* Order History */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Order History</h2>
                  <p className="text-xs text-slate-500">
                    {selectedCustomer
                      ? `Purchase records for ${selectedCustomer.name}`
                      : "Select a customer to view purchase history"}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                  {orders.length} orders
                </span>
              </div>

              {!selectedCustomer ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Select a customer from the customer list.
                </p>
              ) : orders.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  No order history yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order._id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {order.platform}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-bold">
                            {money(order.orderTotal)}
                          </p>
                          <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                            {order.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        {order.items.map((item, index) => (
                          <div
                            key={`${order._id}-${index}`}
                            className="flex justify-between gap-3 text-sm"
                          >
                            <span>
                              {item.productId && products.find((product) => product._id === item.productId) ? productName(products.find((product) => product._id === item.productId)!) : item.productName} × {item.quantity}
                            </span>
                            <span className="font-medium">
                              {money(item.lineTotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}