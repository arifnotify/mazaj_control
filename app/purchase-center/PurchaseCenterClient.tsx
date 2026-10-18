"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CategoryValue =
  | string
  | {
      _id?: string;
      name?: string;
      nameEn?: string;
      nameAr?: string;
    }
  | null;

type Product = {
  _id: string;
  sku?: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  nameBn?: string;
  image?: string;
  imageUrl?: string;
  stock?: number;
  active?: boolean;
  price?: number;
  outOfStock?: boolean;
  marketplaceInactive?: boolean;
  category?: CategoryValue;
  categoryName?: string;
  categoryEn?: string;
  categoryAr?: string;
};

type Supplier = {
  _id: string;
  name: string;
  type?: "regular" | "market";
  marketName?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  contactPerson?: string;
  supplierProducts?: { productId: string; sku?: string; nameEn?: string; nameAr?: string; image?: string; unitCost: number; notes?: string }[];
  active?: boolean;
};

type PurchaseItem = {
  productId: string;
  sku: string;
  name: string;
  nameEn?: string;
  nameAr?: string;
  image: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
};

type PurchaseOrder = {
  _id: string;
  orderNumber?: string;
  supplierName?: string;
  supplierType?: string;
  status?: string;
  items?: PurchaseItem[];
  subtotal?: number;
  notes?: string;
  createdAt?: string;
};

type FilterType = "all" | "stock" | "marketplace" | "catalog";

type SavedShoppingListItem = { productId: string; quantity: number };

type SavedShoppingList = {
  _id: string;
  name: string;
  productIds: string[];
  items?: SavedShoppingListItem[];
  createdAt?: string;
  updatedAt?: string;
};

function money(amount: number) {
  return `${Number(amount || 0).toFixed(2)} QAR`;
}

function productName(product: Product) {
  return (
    product.nameEn ||
    product.name ||
    product.nameBn ||
    product.nameAr ||
    "Unnamed product"
  );
}

function productNameArabic(product: Product) {
  return product.nameAr || product.nameEn || "اسم المنتج غير متوفر";
}

function productImage(product: Product) {
  return product.image || product.imageUrl || "";
}

function getCategoryNames(product: Product) {
  const category = product.category;

  const objectCategory =
    category && typeof category === "object" ? category : null;

  const english =
    product.categoryEn?.trim() ||
    (typeof category === "string" ? category.trim() : "") ||
    objectCategory?.nameEn ||
    objectCategory?.name ||
    product.categoryName ||
    "Uncategorized";

  const arabic =
    product.categoryAr?.trim() ||
    objectCategory?.nameAr ||
    objectCategory?.nameEn ||
    objectCategory?.name ||
    (typeof category === "string" ? category.trim() : "") ||
    "غير مصنف";

  return {
    key: english.trim().toLocaleLowerCase(),
    en: english,
    ar: arabic,
  };
}

export default function PurchaseCenterPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [savedShoppingLists, setSavedShoppingLists] = useState<SavedShoppingList[]>([]);
  const [shoppingListName, setShoppingListName] = useState("");
  const [savingShoppingList, setSavingShoppingList] = useState(false);
  const [activeSavedListId, setActiveSavedListId] = useState<string | null>(null);
  const [activeSavedListItems, setActiveSavedListItems] = useState<SavedShoppingListItem[]>([]);
  const [savingActiveSavedList, setSavingActiveSavedList] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [notes, setNotes] = useState("");

  const [purchaseItems, setPurchaseItems] = useState<
    Record<string, { quantity: number; unitCost: number }>
  >({});

  const [printSelected, setPrintSelected] = useState<string[]>([]);
  const [catalogSelected, setCatalogSelected] = useState<string[]>([]);
  const [catalogPrices, setCatalogPrices] = useState<Record<string, number>>({});
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [supplierPrintMode, setSupplierPrintMode] = useState(false);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: "", type: "regular" as "regular" | "market", contactPerson: "",
    phone: "", whatsapp: "", email: "", marketName: "", address: "", notes: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/purchase-center", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not load Purchase Center.");
      }

      setProducts(Array.isArray(data.products) ? data.products : []);
      setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Purchase Center data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadSavedShoppingLists = useCallback(async () => {
    try {
      const response = await fetch("/api/saved-shopping-lists", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not load saved shopping lists.");
      setSavedShoppingLists(Array.isArray(data.lists) ? data.lists : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load saved shopping lists.");
    }
  }, []);

  useEffect(() => {
    void loadSavedShoppingLists();
  }, [loadSavedShoppingLists]);

  useEffect(() => {
    const supplier = suppliers.find((item) => item._id === selectedSupplier);
    const saved = supplier?.supplierProducts || [];
    setCatalogSelected(saved.map((item) => item.productId));
    setCatalogPrices(Object.fromEntries(saved.map((item) => [item.productId, Number(item.unitCost || 0)])));
  }, [selectedSupplier, suppliers]);

  const categoryOptions = useMemo(() => {
    const categories = new Map<string, { value: string; label: string }>();
    products.forEach((product) => {
      const category = getCategoryNames(product);
      const value = category.key || category.en.toLocaleLowerCase();
      if (!categories.has(value)) {
        categories.set(value, {
          value,
          label: `${category.en}${category.ar ? ` / ${category.ar}` : ""}`,
        });
      }
    });
    return Array.from(categories.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products;

    if (filter === "catalog") {
      list = list.filter((product) => product.active === false);
    } else if (filter === "stock") {
      list = list.filter(
        (product) => Number(product.stock ?? 0) <= 0
      );
    } else if (filter === "marketplace") {
      list = list.filter(
        (product) => product.marketplaceInactive === true
      );
    }

    if (selectedCategory !== "all") {
      list = list.filter(
        (product) => getCategoryNames(product).key === selectedCategory
      );
    }

    const keyword = search.trim().toLowerCase();

    if (keyword) {
      list = list.filter((product) => {
        const searchableNames = [
          product.nameEn,
          product.name,
          product.nameAr,
          product.nameBn,
          getCategoryNames(product).en,
          getCategoryNames(product).ar,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const sku = String(product.sku || "").toLowerCase();

        return searchableNames.includes(keyword) || sku.includes(keyword);
      });
    }

    return list;
  }, [products, filter, search, selectedCategory]);

  const selectedPurchaseItems = useMemo(() => {
    return Object.entries(purchaseItems)
      .filter(([, value]) => value.quantity > 0)
      .map(([productId, value]) => {
        const product = products.find((item) => item._id === productId);

        if (!product) return null;

        return {
          productId,
          sku: String(product.sku || ""),
          name: productName(product),
          image: productImage(product),
          quantity: value.quantity,
          unitCost: value.unitCost,
          lineTotal: value.quantity * value.unitCost,
        };
      })
      .filter((item): item is PurchaseItem => item !== null);
  }, [purchaseItems, products]);

  const purchaseTotal = selectedPurchaseItems.reduce(
    (total, item) => total + item.lineTotal,
    0
  );

  const selectedPrintProducts = useMemo(
    () => products.filter((product) => printSelected.includes(product._id)),
    [products, printSelected]
  );

  const printPages = useMemo(() => {
    type PrintGroup = { key: string; categoryEn: string; categoryAr: string; products: Product[] };
    type PrintPage = { groups: PrintGroup[]; productCount: number };

    const grouped = new Map<string, PrintGroup>();
    selectedPrintProducts.forEach((product) => {
      const category = getCategoryNames(product);
      const key = String(category.key || category.en).trim().toLowerCase();
      if (!grouped.has(key)) {
        grouped.set(key, { key, categoryEn: category.en, categoryAr: category.ar, products: [] });
      }
      grouped.get(key)!.products.push(product);
    });

    const categoryGroups = Array.from(grouped.values()).sort((a, b) =>
      a.categoryEn.localeCompare(b.categoryEn)
    );
    const pages: PrintPage[] = [];
    let currentPage: PrintPage = { groups: [], productCount: 0 };

    categoryGroups.forEach((categoryGroup) => {
      let remaining = [...categoryGroup.products];
      while (remaining.length > 0) {
        if (currentPage.productCount === 12) {
          pages.push(currentPage);
          currentPage = { groups: [], productCount: 0 };
        }

        const room = 12 - currentPage.productCount;
        const chunk = remaining.slice(0, room);
        currentPage.groups.push({
          ...categoryGroup,
          products: chunk,
        });
        currentPage.productCount += chunk.length;
        remaining = remaining.slice(chunk.length);

        if (remaining.length > 0) {
          pages.push(currentPage);
          currentPage = { groups: [], productCount: 0 };
        }
      }
    });

    if (currentPage.productCount > 0) pages.push(currentPage);
    return pages;
  }, [selectedPrintProducts]);

  function getPrintQuantity(productId: string): number {
    const savedListItem = activeSavedListItems.find((item) => item.productId === productId);
    if (activeSavedListId && savedListItem) return savedListItem.quantity;
    return purchaseItems[productId]?.quantity ?? 1;
  }

  async function createPurchaseOrder() {
    setError("");
    setSuccess("");

    if (!selectedSupplier) {
      setError("Please select a supplier or market.");
      return;
    }

    if (selectedPurchaseItems.length === 0) {
      setError("Please select at least one product for the purchase order.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/purchase-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplier,
          items: selectedPurchaseItems,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not create purchase order.");
      }

      setSuccess("Purchase order created successfully.");
      setPurchaseItems({});
      setNotes("");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create purchase order."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 sm:p-6 font-sans">
      {/* PRINT-ONLY SECTION */}
      {!supplierPrintMode && (
        <section className="print-only hidden print:block" dir="ltr">
          <style jsx global>{`
            @media print {
              @page { size: A4 portrait; margin: 7mm; }
              .print-only { display: block !important; color: #111 !important; }
              .screen-only { display: none !important; }
              .print-page { break-after: page; page-break-after: always; width: 100%; }
              .print-page:last-child { break-after: auto; page-break-after: auto; }
            }
          `}</style>
          {printPages.map((page, pageIndex) => (
            <div className="print-page mb-8" key={`print-page-${pageIndex}`}>
              <header className="border-b-2 border-slate-800 pb-3 mb-4 flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold">MAZAJ — Purchase Shopping List</h1>
                  <h2 className="text-lg font-semibold" lang="ar" dir="rtl">مجاز — قائمة المشتريات</h2>
                </div>
                <div className="text-right text-xs">
                  <p>Date: {new Date().toLocaleDateString("en-GB")}</p>
                  <p>Page {pageIndex + 1} of {printPages.length}</p>
                </div>
              </header>

              {page.groups.map((group) => (
                <div key={`${pageIndex}-${group.categoryEn}`} className="mb-4">
                  <div className="bg-slate-200 px-3 py-1 flex justify-between font-semibold text-sm mb-2">
                    <span>{group.categoryEn}</span>
                    <span lang="ar" dir="rtl">{group.categoryAr}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {group.products.map((product) => (
                      <div key={product._id} className="border border-slate-300 p-2 rounded flex gap-2 items-center text-xs">
                        {productImage(product) ? (
                          <img src={productImage(product)} alt={productName(product)} className="w-12 h-12 object-contain" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">No img</div>
                        )}
                        <div>
                          <p className="font-bold line-clamp-1">{productName(product)}</p>
                          <p className="line-clamp-1 text-slate-600" lang="ar">{productNameArabic(product)}</p>
                          <p className="text-[10px] text-slate-500 mt-1">Qty: {getPrintQuantity(product._id)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {/* SCREEN DASHBOARD UI */}
      <div className="screen-only max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">🛍️ Purchase Center</h1>
            <p className="text-sm text-slate-500">Manage suppliers, purchase orders, catalog pricing, and inventory shopping lists.</p>
          </div>
          {success && <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-medium border border-emerald-200 w-full md:w-auto">{success}</div>}
          {error && <div className="bg-rose-50 text-rose-700 px-4 py-2 rounded-xl text-sm font-medium border border-rose-200 w-full md:w-auto">{error}</div>}
        </div>

        {/* Filters and Controls Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Search Products</label>
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Filter View</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Products</option>
              <option value="stock">Out of Stock</option>
              <option value="marketplace">Marketplace Inactive</option>
              <option value="catalog">Disabled in Catalog</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => window.print()}
              disabled={selectedPrintProducts.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium py-2 px-4 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <span>🖨️ Print Selected ({selectedPrintProducts.length})</span>
            </button>
          </div>
        </div>

        {/* Main Content Sections: Product Catalog Grid & Purchase Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products List Area */}
          <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-base">Product Inventory ({filteredProducts.length})</h2>
              <button
                onClick={() => setPrintSelected(filteredProducts.map((p) => p._id))}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Select All Visible
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400">Loading inventory...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No products found matching your filters.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredProducts.map((product) => {
                  const isPrinted = printSelected.includes(product._id);
                  const isPurchasing = !!purchaseItems[product._id];

                  return (
                    <div
                      key={product._id}
                      className={`border rounded-xl p-3 flex flex-col justify-between transition-all ${
                        isPrinted ? "border-indigo-500 bg-indigo-50/20" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex gap-3 items-start">
                        {productImage(product) ? (
                          <img src={productImage(product)} alt="" className="w-14 h-14 object-contain rounded-lg border border-slate-100 bg-slate-50 shrink-0" />
                        ) : (
                          <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] text-slate-400 shrink-0">No image</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-slate-900 truncate">{productName(product)}</p>
                          <p className="text-[11px] text-slate-500 truncate" lang="ar">{productNameArabic(product)}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">SKU: {product.sku || "—"} | Stock: {product.stock ?? 0}</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isPrinted}
                            onChange={(e) => {
                              setPrintSelected((prev) => e.target.checked ? [...prev, product._id] : prev.filter((id) => id !== product._id));
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          <span>Print list</span>
                        </label>

                        <button
                          onClick={() => {
                            const nextVal = !isPurchasing;
                            if (nextVal) {
                              setPurchaseItems((prev) => ({ ...prev, [product._id]: { quantity: 1, unitCost: Number(product.price || 0) } }));
                            } else {
                              setPurchaseItems((prev) => {
                                const copy = { ...prev };
                                delete copy[product._id];
                                return copy;
                              });
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                            isPurchasing ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {isPurchasing ? "Added to PO ✓" : "+ Add to PO"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Purchase Order Sidebar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <h2 className="font-bold text-slate-800 text-base mb-4 pb-3 border-b border-slate-100">Draft Purchase Order</h2>
              
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Select Supplier</label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Choose Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>{s.name} {s.marketName ? `(${s.marketName})` : ""}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Notes / Instructions</label>
                  <textarea
                    rows={2}
                    placeholder="Optional order notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* Selected Items summary */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-bold text-slate-600 mb-2">Selected Items ({selectedPurchaseItems.length})</p>
                {selectedPurchaseItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No products added to purchase order yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {selectedPurchaseItems.map((item) => (
                      <div key={item.productId} className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500">{money(item.lineTotal)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setPurchaseItems((prev) => ({
                                ...prev,
                                [item.productId]: { ...prev[item.productId], quantity: val }
                              }));
                            }}
                            className="w-12 px-1 py-1 border border-slate-300 rounded text-center text-xs bg-white"
                          />
                          <button
                            onClick={() => {
                              setPurchaseItems((prev) => {
                                const copy = { ...prev };
                                delete copy[item.productId];
                                return copy;
                              });
                            }}
                            className="text-rose-500 hover:text-rose-700 px-1 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Total and Submit */}
            <div className="border-t border-slate-100 pt-4 mt-4">
              <div className="flex justify-between items-center mb-3 text-sm font-bold">
                <span>Total Amount:</span>
                <span className="text-indigo-600">{money(purchaseTotal)}</span>
              </div>
              <button
                disabled={saving || selectedPurchaseItems.length === 0 || !selectedSupplier}
                onClick={createPurchaseOrder}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all shadow-sm"
              >
                {saving ? "Creating Order..." : "Submit Purchase Order"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}