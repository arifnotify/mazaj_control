
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
  active?: boolean;
};

type PurchaseItem = {
  productId: string;
  sku: string;
  name: string;
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

function productImage(product: Product) {
  return product.image || product.imageUrl || "";
}

function getCategoryNames(product: Product) {
  const category = product.category;

  if (category && typeof category === "object") {
    const english =
      category.nameEn ||
      category.name ||
      product.categoryEn ||
      product.categoryName ||
      "Uncategorized";

    return {
      key: category._id || english,
      en: english,
      ar:
        category.nameAr ||
        product.categoryAr ||
        category.nameEn ||
        category.name ||
        "غير مصنف",
    };
  }

  const english =
    (typeof category === "string" ? category : "") ||
    product.categoryEn ||
    product.categoryName ||
    "Uncategorized";

  return {
    key: english,
    en: english,
    ar: product.categoryAr || english,
  };
}

export default function PurchaseCenterPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [notes, setNotes] = useState("");

  const [purchaseItems, setPurchaseItems] = useState<
    Record<string, { quantity: number; unitCost: number }>
  >({});

  const [printSelected, setPrintSelected] = useState<string[]>([]);

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

  const disabledProducts = useMemo(
    () => products.filter((product) => product.active === false),
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = products;

    if (filter === "catalog") {
      // Show ONLY products disabled in the dashboard.
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

    const keyword = search.trim().toLowerCase();

    if (keyword) {
      list = list.filter((product) => {
        const name = productName(product).toLowerCase();
        const sku = String(product.sku || "").toLowerCase();

        return name.includes(keyword) || sku.includes(keyword);
      });
    }

    return list;
  }, [products, filter, search]);

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
    () =>
      disabledProducts.filter((product) =>
        printSelected.includes(product._id)
      ),
    [disabledProducts, printSelected]
  );

  const printGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        categoryEn: string;
        categoryAr: string;
        products: Product[];
      }
    >();

    selectedPrintProducts.forEach((product) => {
      const category = getCategoryNames(product);
      const key = String(category.key || category.en)
        .trim()
        .toLowerCase();

      if (!groups.has(key)) {
        groups.set(key, {
          categoryEn: category.en,
          categoryAr: category.ar,
          products: [],
        });
      }

      groups.get(key)!.products.push(product);
    });

    return Array.from(groups.values()).sort((a, b) =>
      a.categoryEn.localeCompare(b.categoryEn)
    );
  }, [selectedPrintProducts]);

  function togglePurchaseProduct(product: Product, checked: boolean) {
    setPurchaseItems((previous) => {
      const next = { ...previous };

      if (checked) {
        next[product._id] = next[product._id] || {
          quantity: 1,
          unitCost: Number(product.price || 0),
        };
      } else {
        delete next[product._id];
      }

      return next;
    });
  }

  function updatePurchaseField(
    productId: string,
    field: "quantity" | "unitCost",
    value: number
  ) {
    setPurchaseItems((previous) => ({
      ...previous,
      [productId]: {
        quantity: previous[productId]?.quantity ?? 1,
        unitCost: previous[productId]?.unitCost ?? 0,
        [field]: Math.max(0, value),
      },
    }));
  }

  function togglePrintProduct(productId: string, checked: boolean) {
    setPrintSelected((previous) => {
      if (checked) {
        return previous.includes(productId)
          ? previous
          : [...previous, productId];
      }

      return previous.filter((id) => id !== productId);
    });
  }

  function selectAllDisabledProducts() {
    const visibleDisabledIds = filteredProducts
      .filter((product) => product.active === false)
      .map((product) => product._id);

    setPrintSelected((previous) =>
      Array.from(new Set([...previous, ...visibleDisabledIds]))
    );
  }

  function printSelectedProducts() {
    if (selectedPrintProducts.length === 0) {
      setError("Please select disabled products to print.");
      return;
    }

    setError("");
    window.print();
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

  async function updateOrderStatus(
    orderId: string,
    status: "ordered" | "received" | "cancelled"
  ) {
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/purchase-center", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not update order status.");
      }

      setSuccess("Purchase order status updated.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update order."
      );
    }
  }

  return (
    <div className="purchase-page">
      {/* PRINT-ONLY BILINGUAL SHOPPING LIST */}
      <section className="print-only" dir="ltr">
        <header className="print-header">
          <h1>MAZAJ — Purchase Shopping List</h1>
          <h2 lang="ar" dir="rtl">
            مجاز — قائمة المشتريات
          </h2>

          <div className="print-meta">
            <span>
              Date: {new Date().toLocaleDateString("en-GB")}
            </span>
            <span lang="ar" dir="rtl">
              التاريخ: {new Date().toLocaleDateString("ar-QA")}
            </span>
          </div>

          <div className="print-meta">
            <span>Products: {selectedPrintProducts.length}</span>
            <span lang="ar" dir="rtl">
              عدد المنتجات: {selectedPrintProducts.length}
            </span>
          </div>
        </header>

        {printGroups.map((group) => (
          <section
            className="print-category"
            key={group.categoryEn}
          >
            <div className="print-category-heading">
              <div>
                <h2>{group.categoryEn}</h2>
                <p>Category</p>
              </div>

              <div className="print-category-ar" lang="ar" dir="rtl">
                <h2>{group.categoryAr}</h2>
                <p>الفئة</p>
              </div>
            </div>

            <div className="print-product-grid">
              {group.products.map((product) => (
                <article className="print-product" key={product._id}>
                  {productImage(product) ? (
                    <img
                      src={productImage(product)}
                      alt={productName(product)}
                    />
                  ) : (
                    <div className="print-no-image">
                      <span>No image</span>
                      <span lang="ar" dir="rtl">
                        لا توجد صورة
                      </span>
                    </div>
                  )}

                  <div className="print-product-info">
                    <strong>{productName(product)}</strong>

                    <p>SKU: {product.sku || "—"}</p>

                    <p className="print-bilingual-line">
                      <span>Quantity to buy:</span>
                      <span lang="ar" dir="rtl">
                        الكمية المطلوبة:
                      </span>
                    </p>

                    <div className="quantity-blank">
                      __________________
                    </div>

                    <p className="print-bilingual-line">
                      <span>Purchased:</span>
                      <span lang="ar" dir="rtl">
                        تم الشراء:
                      </span>
                    </p>

                    <p className="print-checkbox-line">
                      □ Yes / نعم　 □ No / لا
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        <footer className="print-footer">
          <p>Checked by: ______________________________</p>
          <p lang="ar" dir="rtl">
            تم التحقق بواسطة: ______________________________
          </p>
        </footer>
      </section>

      {/* NORMAL SCREEN CONTENT */}
      <div className="screen-only">
        <div className="page-heading">
          <div>
            <h1>Purchase Center</h1>
            <p>
              Find products to purchase from your regular supplier or a
              market.
            </p>
          </div>

          <button
            type="button"
            className="button button-secondary"
            onClick={() => void loadData()}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && <div className="notice notice-error">{error}</div>}
        {success && <div className="notice notice-success">{success}</div>}

        <div className="summary-grid">
          <div className="summary-card">
            <span>Total products</span>
            <strong>{products.length}</strong>
          </div>

          <div className="summary-card">
            <span>Dashboard-disabled products</span>
            <strong>{disabledProducts.length}</strong>
          </div>

          <div className="summary-card">
            <span>Selected for purchase</span>
            <strong>{selectedPurchaseItems.length}</strong>
          </div>

          <div className="summary-card">
            <span>Estimated total</span>
            <strong>{money(purchaseTotal)}</strong>
          </div>
        </div>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Find Products</h2>
              <p>
                Select products for an order or print a shopping list.
              </p>
            </div>
          </div>

          <div className="filter-row">
            <input
              className="text-input search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product name or SKU..."
            />

            <select
              className="text-input filter-select"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as FilterType)
              }
            >
              <option value="all">All products</option>
              <option value="stock">Out of stock</option>
              <option value="marketplace">
                Unavailable on marketplace
              </option>
              <option value="catalog">
                Product disabled in dashboard
              </option>
            </select>
          </div>

          {filter === "catalog" && (
            <div className="print-actions">
              <span>
                {filteredProducts.length} disabled product(s) found
              </span>

              <div className="action-buttons">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={selectAllDisabledProducts}
                >
                  Select All Disabled Products
                </button>

                <button
                  type="button"
                  className="button button-primary"
                  onClick={printSelectedProducts}
                >
                  Print Selected ({selectedPrintProducts.length})
                </button>

                <button
                  type="button"
                  className="button button-light"
                  onClick={() => setPrintSelected([])}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="empty-state">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              No products found for this filter.
            </div>
          ) : (
            <div className="product-list">
              {filteredProducts.map((product) => {
                const purchaseSelected = Boolean(
                  purchaseItems[product._id]
                );
                const printChecked = printSelected.includes(product._id);

                return (
                  <article className="product-row" key={product._id}>
                    {filter === "catalog" && (
                      <label
                        className="selection-checkbox"
                        title="Select for printed shopping list"
                      >
                        <input
                          type="checkbox"
                          checked={printChecked}
                          onChange={(event) =>
                            togglePrintProduct(
                              product._id,
                              event.target.checked
                            )
                          }
                        />
                      </label>
                    )}

                    <div className="product-image">
                      {productImage(product) ? (
                        <img
                          src={productImage(product)}
                          alt={productName(product)}
                        />
                      ) : (
                        <div className="no-image">No image</div>
                      )}
                    </div>

                    <div className="product-details">
                      <h3>{productName(product)}</h3>
                      <p>SKU: {product.sku || "—"}</p>
                      <p>Stock: {Number(product.stock ?? 0)}</p>

                      {product.active === false ? (
                        <span className="status-tag status-disabled">
                          Disabled in dashboard
                        </span>
                      ) : (
                        <span className="status-tag status-active">
                          Dashboard active
                        </span>
                      )}
                    </div>

                    <div className="product-price">
                      <span>Current price</span>
                      <strong>
                        {money(Number(product.price || 0))}
                      </strong>
                    </div>

                    <div className="purchase-controls">
                      <label className="purchase-check">
                        <input
                          type="checkbox"
                          checked={purchaseSelected}
                          onChange={(event) =>
                            togglePurchaseProduct(
                              product,
                              event.target.checked
                            )
                          }
                        />
                        Add to order
                      </label>

                      {purchaseSelected && (
                        <div className="quantity-fields">
                          <label>
                            Qty
                            <input
                              type="number"
                              min="1"
                              value={
                                purchaseItems[product._id]?.quantity ?? 1
                              }
                              onChange={(event) =>
                                updatePurchaseField(
                                  product._id,
                                  "quantity",
                                  Number(event.target.value)
                                )
                              }
                            />
                          </label>

                          <label>
                            Unit cost (QAR)
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                purchaseItems[product._id]?.unitCost ?? 0
                              }
                              onChange={(event) =>
                                updatePurchaseField(
                                  product._id,
                                  "unitCost",
                                  Number(event.target.value)
                                )
                              }
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Create Purchase Order</h2>
              <p>
                Save the selected products as a purchase order.
              </p>
            </div>
          </div>

          <div className="order-form">
            <label>
              Supplier / Market
              <select
                className="text-input"
                value={selectedSupplier}
                onChange={(event) =>
                  setSelectedSupplier(event.target.value)
                }
              >
                <option value="">Select supplier or market</option>
                {suppliers
                  .filter((supplier) => supplier.active !== false)
                  .map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name}
                      {supplier.type === "market" && supplier.marketName
                        ? ` — ${supplier.marketName}`
                        : ""}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Notes
              <textarea
                className="text-input notes-input"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional purchase notes..."
                rows={3}
              />
            </label>
          </div>

          <div className="order-summary">
            <div>
              <span>Selected products</span>
              <strong>{selectedPurchaseItems.length}</strong>
            </div>

            <div>
              <span>Total quantity</span>
              <strong>
                {selectedPurchaseItems.reduce(
                  (total, item) => total + item.quantity,
                  0
                )}
              </strong>
            </div>

            <div>
              <span>Estimated subtotal</span>
              <strong>{money(purchaseTotal)}</strong>
            </div>
          </div>

          {selectedPurchaseItems.length > 0 && (
            <div className="selected-items">
              {selectedPurchaseItems.map((item) => (
                <div className="selected-item" key={item.productId}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} />
                  ) : (
                    <div className="selected-no-image">—</div>
                  )}

                  <div>
                    <strong>{item.name}</strong>
                    <span>SKU: {item.sku || "—"}</span>
                    <span>
                      Qty: {item.quantity} × {money(item.unitCost)}
                    </span>
                  </div>

                  <strong>{money(item.lineTotal)}</strong>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="button button-primary create-order-button"
            onClick={createPurchaseOrder}
            disabled={saving || loading}
          >
            {saving ? "Creating order..." : "Create Purchase Order"}
          </button>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Purchase Order History</h2>
              <p>Previously saved purchase orders.</p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="empty-state">No purchase orders yet.</div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <article className="order-card" key={order._id}>
                  <div className="order-card-top">
                    <div>
                      <h3>{order.orderNumber || "Purchase Order"}</h3>
                      <p>{order.supplierName || "Supplier not specified"}</p>
                      <span className="order-date">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString()
                          : ""}
                      </span>
                    </div>

                    <span className="status-tag">
                      {order.status || "draft"}
                    </span>
                  </div>

                  <div className="order-card-items">
                    {(order.items || []).map((item, index) => (
                      <div
                        className="order-history-item"
                        key={`${order._id}-${item.productId || index}`}
                      >
                        {item.image ? (
                          <img src={item.image} alt={item.name} />
                        ) : (
                          <div className="selected-no-image">—</div>
                        )}

                        <div>
                          <strong>{item.name}</strong>
                          <span>SKU: {item.sku || "—"}</span>
                          <span>Quantity: {item.quantity}</span>
                        </div>

                        <strong>
                          {money(
                            Number(
                              item.lineTotal ??
                                item.quantity * item.unitCost ??
                                0
                            )
                          )}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div className="order-card-bottom">
                    <strong>
                      Total: {money(Number(order.subtotal || 0))}
                    </strong>

                    <div className="action-buttons">
                      {order.status !== "ordered" &&
                        order.status !== "received" &&
                        order.status !== "cancelled" && (
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() =>
                              void updateOrderStatus(order._id, "ordered")
                            }
                          >
                            Mark Ordered
                          </button>
                        )}

                      {order.status !== "received" &&
                        order.status !== "cancelled" && (
                          <button
                            type="button"
                            className="button button-primary"
                            onClick={() =>
                              void updateOrderStatus(order._id, "received")
                            }
                          >
                            Mark Received
                          </button>
                        )}

                      {order.status !== "received" &&
                        order.status !== "cancelled" && (
                          <button
                            type="button"
                            className="button button-light"
                            onClick={() =>
                              void updateOrderStatus(order._id, "cancelled")
                            }
                          >
                            Cancel
                          </button>
                        )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
