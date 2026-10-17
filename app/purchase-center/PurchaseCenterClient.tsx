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

type SavedShoppingList = {
  _id: string;
  name: string;
  productIds: string[];
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
    // Group by normalized English category so the same category stays together.
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

  async function saveShoppingList() {
    setError(""); setSuccess("");
    const name = shoppingListName.trim();
    if (!name) { setError("Please enter a name for this shopping list."); return; }
    if (printSelected.length === 0) { setError("Select at least one product before saving a shopping list."); return; }
    setSavingShoppingList(true);
    try {
      const response = await fetch("/api/saved-shopping-lists", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, productIds: printSelected }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || data?.message || "Could not save shopping list.");
      setShoppingListName("");
      setSuccess("Shopping list saved to the database.");
      await loadSavedShoppingLists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save shopping list.");
    } finally { setSavingShoppingList(false); }
  }

  function openShoppingList(list: SavedShoppingList) {
    setPrintSelected(list.productIds || []);
    setSuccess(`Loaded shopping list: ${list.name}`);
    setError("");
  }

  async function editShoppingList(list: SavedShoppingList) {
    const nextName = window.prompt("Edit shopping list name:", list.name);
    if (nextName === null) return;
    if (!nextName.trim()) { setError("Shopping list name cannot be empty."); return; }
    setError(""); setSuccess("");
    try {
      const response = await fetch("/api/saved-shopping-lists", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: list._id, name: nextName.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || data?.message || "Could not update shopping list.");
      setSuccess("Shopping list updated.");
      await loadSavedShoppingLists();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update shopping list."); }
  }

  async function deleteShoppingList(list: SavedShoppingList) {
    if (!window.confirm(`Delete saved shopping list "${list.name}"?`)) return;
    setError(""); setSuccess("");
    try {
      const response = await fetch("/api/saved-shopping-lists", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: list._id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || data?.message || "Could not delete shopping list.");
      setSuccess("Shopping list deleted.");
      await loadSavedShoppingLists();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not delete shopping list."); }
  }

  useEffect(() => {
    const supplier = suppliers.find((item) => item._id === selectedSupplier);
    const saved = supplier?.supplierProducts || [];
    setCatalogSelected(saved.map((item) => item.productId));
    setCatalogPrices(Object.fromEntries(saved.map((item) => [item.productId, Number(item.unitCost || 0)])));
  }, [selectedSupplier, suppliers]);

  const disabledProducts = useMemo(
    () => products.filter((product) => product.active === false),
    [products]
  );

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

  // Print selection can include ANY product, even if it is active or in stock.
  const selectedPrintProducts = useMemo(
    () => products.filter((product) => printSelected.includes(product._id)),
    [products, printSelected]
  );

  const printPages = useMemo(() => {
    // Group all selected products by category FIRST, then flow the groups
    // sequentially over A4 pages. This prevents category products being
    // scattered between unrelated categories. Each page holds at most 12 cards.
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
      // Keep the category contiguous. If it spans pages, continue it on the
      // next page before starting another category.
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

  function togglePurchaseProduct(product: Product, checked: boolean) {
    setPurchaseItems((previous) => {
      const next = { ...previous };

      if (checked) {
        const selectedSupplierRecord = suppliers.find((item) => item._id === selectedSupplier);
        const savedSupplierProduct = selectedSupplierRecord?.supplierProducts?.find((item) => item.productId === product._id);
        next[product._id] = next[product._id] || {
          quantity: 1,
          unitCost: savedSupplierProduct ? Number(savedSupplierProduct.unitCost || 0) : Number(product.price || 0),
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

  function selectAllVisibleProducts() {
    // Select all products currently shown by the chosen filter/search.
    const visibleProductIds = filteredProducts.map((product) => product._id);

    setPrintSelected((previous) =>
      Array.from(new Set([...previous, ...visibleProductIds]))
    );
  }

  function printSelectedProducts() {
    if (selectedPrintProducts.length === 0) {
      setError("Please select at least one product to print.");
      return;
    }

    setError("");
    window.print();
  }

  function toggleCatalogProduct(productId: string, checked: boolean) {
    setCatalogSelected((previous) => checked
      ? (previous.includes(productId) ? previous : [...previous, productId])
      : previous.filter((id) => id !== productId));
    if (checked && catalogPrices[productId] == null) {
      const product = products.find((item) => item._id === productId);
      setCatalogPrices((previous) => ({ ...previous, [productId]: Number(product?.price || 0) }));
    }
  }

  async function saveSupplierCatalog() {
    setError("");
    setSuccess("");
    if (!selectedSupplier) {
      setError("Please select a supplier before saving its product list.");
      return;
    }
    setSavingCatalog(true);
    try {
      const response = await fetch("/api/purchase-center", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplier,
          supplierProducts: catalogSelected.map((productId) => ({
            productId,
            unitCost: Number(catalogPrices[productId] || 0),
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || data?.error || "Could not save supplier products.");
      setSuccess("Supplier product list and prices saved successfully.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save supplier product list.");
    } finally {
      setSavingCatalog(false);
    }
  }

  function printSupplierCatalog() {
    if (!selectedSupplier || catalogSelected.length === 0) {
      setError("Select a supplier and at least one product in its supplier list to print.");
      return;
    }
    setError("");
    setSupplierPrintMode(true);
    window.setTimeout(() => window.print(), 100);
    window.onafterprint = () => setSupplierPrintMode(false);
  }

  async function createSupplier() {
    setError("");
    setSuccess("");
    if (!supplierForm.name.trim()) {
      setError("Please enter the supplier name.");
      return;
    }
    setSavingSupplier(true);
    try {
      const response = await fetch("/api/purchase-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createSupplier", ...supplierForm }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || data?.error || "Could not create supplier.");
      const newId = String(data?.supplier?._id || "");
      setSuccess("Supplier created successfully. You can now add its products and prices.");
      setSupplierForm({ name: "", type: "regular", contactPerson: "", phone: "", whatsapp: "", email: "", marketName: "", address: "", notes: "" });
      setShowCreateSupplier(false);
      await loadData();
      if (newId) setSelectedSupplier(newId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create supplier.");
    } finally {
      setSavingSupplier(false);
    }
  }

  async function deleteSupplier() {
    const supplier = suppliers.find((item) => item._id === selectedSupplier);
    if (!supplier) {
      setError("Please select a supplier to delete.");
      return;
    }
    const confirmed = window.confirm(`Delete supplier "${supplier.name}"? It will be removed from active supplier lists, but past purchase orders will remain.`);
    if (!confirmed) return;
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/purchase-center", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId: selectedSupplier }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || data?.error || "Could not delete supplier.");
      setSelectedSupplier("");
      setCatalogSelected([]);
      setCatalogPrices({});
      setPurchaseItems({});
      setSuccess("Supplier deleted from active supplier list.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete supplier.");
    }
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
      {!supplierPrintMode && <section className="print-only" dir="ltr">
        <style jsx global>{`
          @media print {
            @page { size: A4 portrait; margin: 7mm; }
            .print-only { display: block !important; color: #111 !important; }
            .screen-only { display: none !important; }
            .print-page { break-after: page; page-break-after: always; width: 100%; }
            .print-page:last-child { break-after: auto; page-break-after: auto; }
            .print-header { margin: 0 0 5mm !important; padding: 0 0 3mm !important; }
            .print-header h1 { font-size: 16pt !important; margin: 0 0 2mm !important; }
            .print-header h2 { font-size: 13pt !important; margin: 0 0 2mm !important; }
            .print-meta { font-size: 8pt !important; margin: 1mm 0 !important; }
            .print-category { margin: 0 0 2mm !important; break-inside: auto; page-break-inside: auto; }
            .print-category-heading { margin: 1mm 0 !important; padding: 1mm 2mm !important; }
            .print-category-heading h2 { font-size: 9pt !important; margin: 0 !important; }
            .print-category-heading p { font-size: 7pt !important; margin: 0 !important; }
            .print-product-grid { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 2mm !important; }
            .print-product { display: flex !important; flex-direction: row !important; gap: 2mm !important; padding: 2mm !important; min-width: 0; break-inside: avoid; page-break-inside: avoid; }
            .print-product img, .print-no-image { width: 18mm !important; height: 18mm !important; min-width: 18mm !important; object-fit: contain !important; }
            .print-product-info { min-width: 0; font-size: 7pt !important; line-height: 1.2 !important; }
            .print-product-info strong { font-size: 7.5pt !important; overflow-wrap: anywhere; }
            .print-product-info p { margin: 1mm 0 !important; font-size: 6.5pt !important; }
            .quantity-blank { font-size: 7pt !important; margin: 1mm 0 !important; }
            .print-checkbox-line { font-size: 7pt !important; }
            .print-footer { margin-top: 3mm !important; font-size: 8pt !important; }
          }
        `}</style>
        {printPages.map((page, pageIndex) => (
          <div className="print-page" key={`print-page-${pageIndex}`}>
            <header className="print-header">
              <h1>MAZAJ — Purchase Shopping List</h1>
              <h2 lang="ar" dir="rtl">مجاز — قائمة المشتريات</h2>
              <div className="print-meta">
                <span>Date: {new Date().toLocaleDateString("en-GB")}</span>
                <span lang="ar" dir="rtl">التاريخ: {new Date().toLocaleDateString("ar-QA")}</span>
              </div>
              <div className="print-meta">
                <span>Products: {selectedPrintProducts.length} · Page {pageIndex + 1} of {printPages.length}</span>
                <span lang="ar" dir="rtl">عدد المنتجات: {selectedPrintProducts.length} · الصفحة {pageIndex + 1} من {printPages.length}</span>
              </div>
            </header>

            {page.groups.map((group) => (
              <section className="print-category" key={`${pageIndex}-${group.categoryEn}`}>
                <div className="print-category-heading">
                  <div><h2>{group.categoryEn}</h2><p>Category</p></div>
                  <div className="print-category-ar" lang="ar" dir="rtl"><h2>{group.categoryAr}</h2><p>الفئة</p></div>
                </div>
                <div className="print-product-grid">
                  {group.products.map((product) => (
                    <article className="print-product" key={product._id}>
                      {productImage(product) ? (
                        <img src={productImage(product)} alt={productName(product)} />
                      ) : (
                        <div className="print-no-image"><span>No image</span><span lang="ar" dir="rtl">لا توجد صورة</span></div>
                      )}
                      <div className="print-product-info">
                        <strong className="print-name-en" dir="ltr">{productName(product)}</strong>
                        <strong className="print-name-ar" dir="rtl" lang="ar">{productNameArabic(product)}</strong>
                        <p>SKU: {product.sku || "—"}</p>
                        <p className="print-bilingual-line"><span>Quantity to buy:</span><span lang="ar" dir="rtl">الكمية المطلوبة:</span></p>
                        <div className="quantity-blank">{purchaseItems[product._id]?.quantity != null ? `${purchaseItems[product._id].quantity} ${purchaseItems[product._id].quantity === 1 ? "unit" : "units"}` : "__________________"}</div>
                        <div className="quantity-blank quantity-blank-ar" lang="ar" dir="rtl">{purchaseItems[product._id]?.quantity != null ? `${purchaseItems[product._id].quantity} وحدة` : "__________________"}</div>
                        <p className="print-bilingual-line"><span>Purchased:</span><span lang="ar" dir="rtl">تم الشراء:</span></p>
                        <p className="print-checkbox-line">□ Yes / نعم　 □ No / لا</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
            <footer className="print-footer">
              <p>Checked by: ______________________________</p>
              <p lang="ar" dir="rtl">تم التحقق بواسطة: ______________________________</p>
            </footer>
          </div>
        ))}
      </section>}

      {supplierPrintMode && (() => {
        const supplier = suppliers.find((item) => item._id === selectedSupplier);
        const catalogProducts = products.filter((product) => catalogSelected.includes(product._id));
        return <section className="print-only supplier-catalog-print" dir="ltr">
          <style jsx global>{`@media print { .supplier-catalog-print { display:block !important; } .supplier-catalog-print table { width:100%; border-collapse:collapse; } .supplier-catalog-print th,.supplier-catalog-print td { border:1px solid #777; padding:6px; text-align:left; font-size:9pt; } .supplier-catalog-print img { width:48px;height:48px;object-fit:contain; } }`}</style>
          <header className="print-header">
            <h1>MAZAJ — Supplier Product Price List</h1>
            <h2 lang="ar" dir="rtl">مجاز — قائمة المنتجات وأسعار المورد</h2>
            <div className="print-meta">Supplier: {supplier?.name || "—"} · Date: {new Date().toLocaleDateString("en-GB")}</div>
            {supplier?.phone && <div className="print-meta">Phone: {supplier.phone}</div>}
            {supplier?.email && <div className="print-meta">Email: {supplier.email}</div>}
            {supplier?.address && <div className="print-meta">Address: {supplier.address}</div>}
          </header>
          <table><thead><tr><th>#</th><th>Image</th><th>SKU</th><th>Product (English)</th><th>اسم المنتج (العربية)</th><th>Supplier Price (QAR)</th></tr></thead>
            <tbody>{catalogProducts.map((product, index) => <tr key={product._id}><td>{index + 1}</td><td>{productImage(product) ? <img src={productImage(product)} alt={productName(product)} /> : "—"}</td><td>{product.sku || "—"}</td><td>{productName(product)}</td><td dir="rtl">{productNameArabic(product)}</td><td>{money(Number(catalogPrices[product._id] || 0))}</td></tr>)}</tbody>
          </table>
          <p className="print-footer">Total products: {catalogProducts.length}</p>
        </section>;
      })()}

      {/* NORMAL SCREEN CONTENT */}
      <div className="screen-only">
        <style jsx global>{`
          .collapsible-panel { padding: 0 !important; overflow: hidden; }
          .collapsible-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; cursor:pointer; list-style:none; padding:18px 20px; }
          .collapsible-heading::-webkit-details-marker { display:none; }
          .collapse-hint { white-space:nowrap; font-size:12px; opacity:.7; }
          .collapsible-panel[open] > .collapsible-heading { border-bottom:1px solid #e5e7eb; margin-bottom:16px; }
          .collapsible-panel:not([open]) > .collapsible-heading { margin-bottom:0; }
          @media print { .collapsible-heading { display:none !important; } }
        `}</style>

        <div className="page-heading">
          <div>
            <h1>Purchase Center</h1>
            <p>
              Find products to purchase from your regular supplier or a
              market.
            </p>
          </div>

          <div className="action-buttons">
            <button type="button" className="button button-primary" onClick={() => setShowCreateSupplier((value) => !value)}>
              {showCreateSupplier ? "Close Supplier Form" : "+ Create Supplier"}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void loadData()}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {showCreateSupplier && <section className="panel">
          <div className="panel-heading"><div><h2>Create New Supplier</h2><p>Enter supplier details. The new supplier will be available in the supplier selector.</p></div></div>
          <div className="order-form">
            <label>Supplier name *<input className="text-input" value={supplierForm.name} onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))} placeholder="Supplier or company name" /></label>
            <label>Supplier type<select className="text-input" value={supplierForm.type} onChange={(e) => setSupplierForm((p) => ({ ...p, type: e.target.value as "regular" | "market" }))}><option value="regular">Regular supplier</option><option value="market">Market</option></select></label>
            <label>Contact person<input className="text-input" value={supplierForm.contactPerson} onChange={(e) => setSupplierForm((p) => ({ ...p, contactPerson: e.target.value }))} placeholder="Contact person" /></label>
            <label>Phone<input className="text-input" value={supplierForm.phone} onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone number" /></label>
            <label>WhatsApp<input className="text-input" value={supplierForm.whatsapp} onChange={(e) => setSupplierForm((p) => ({ ...p, whatsapp: e.target.value }))} placeholder="WhatsApp number" /></label>
            <label>Email<input className="text-input" type="email" value={supplierForm.email} onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))} placeholder="supplier@example.com" /></label>
            {supplierForm.type === "market" && <label>Market name<input className="text-input" value={supplierForm.marketName} onChange={(e) => setSupplierForm((p) => ({ ...p, marketName: e.target.value }))} placeholder="Market name" /></label>}
            <label>Address<input className="text-input" value={supplierForm.address} onChange={(e) => setSupplierForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address / location" /></label>
            <label>Notes<textarea className="text-input notes-input" rows={2} value={supplierForm.notes} onChange={(e) => setSupplierForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" /></label>
          </div>
          <div className="action-buttons" style={{ marginTop: 16 }}>
            <button type="button" className="button button-primary" onClick={() => void createSupplier()} disabled={savingSupplier}>{savingSupplier ? "Saving Supplier..." : "Save Supplier"}</button>
            <button type="button" className="button button-light" onClick={() => setShowCreateSupplier(false)} disabled={savingSupplier}>Cancel</button>
          </div>
        </section>}

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


        <section className="panel saved-shopping-lists-panel">
          <div className="panel-heading">
            <div><h2>Saved Shopping Lists</h2><p>Save product selections in the database and reuse them whenever you need.</p></div>
          </div>
          <div className="order-form">
            <label>Shopping list name
              <input className="text-input" value={shoppingListName} onChange={(event) => setShoppingListName(event.target.value)} placeholder="e.g. Weekly Grocery Purchase" />
            </label>
            <div className="action-buttons">
              <button type="button" className="button button-primary" onClick={() => void saveShoppingList()} disabled={savingShoppingList}>
                {savingShoppingList ? "Saving..." : `Save Selected Products (${printSelected.length})`}
              </button>
              <button type="button" className="button button-secondary" onClick={() => void loadSavedShoppingLists()}>Refresh Lists</button>
            </div>
          </div>
          {savedShoppingLists.length === 0 ? (
            <div className="empty-state">No saved shopping lists yet. Select products below and save your first list.</div>
          ) : (
            <div className="orders-list saved-shopping-list-items">
              {savedShoppingLists.map((list) => {
                const count = (list.productIds || []).length;
                const updated = list.updatedAt ? new Date(list.updatedAt).toLocaleString() : list.createdAt ? new Date(list.createdAt).toLocaleString() : "Saved list";
                return (
                  <article className="order-card saved-shopping-list-card" key={list._id}>
                    <div className="order-card-top"><div><h3>{list.name}</h3><p>{count} product{count === 1 ? "" : "s"} · Updated {updated}</p></div></div>
                    <div className="action-buttons">
                      <button type="button" className="button button-primary" onClick={() => openShoppingList(list)}>Open</button>
                      <button type="button" className="button button-secondary" onClick={() => void editShoppingList(list)}>Edit</button>
                      <button type="button" className="button button-light" onClick={() => void deleteShoppingList(list)}>Delete</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <details className="panel collapsible-panel">
          <summary className="panel-heading collapsible-heading">
            <div><h2>Find Products</h2><p>Select products for an order or print a shopping list.</p></div>
            <span className="collapse-hint">Open / Minimize</span>
          </summary>

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

            <select
              className="text-input filter-select"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              aria-label="Filter products by category"
            >
              <option value="all">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div className="print-actions">
              <span>
                {filteredProducts.length} product(s) shown · {selectedPrintProducts.length} selected for print
              </span>

              <div className="action-buttons">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={selectAllVisibleProducts}
                >
                  Select All Visible Products
                </button>

                <button
                  type="button"
                  className="button button-primary"
                  onClick={printSelectedProducts}
                >
                  Print Shopping List ({selectedPrintProducts.length})
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
                    <label
                      className="selection-checkbox"
                      title="Select this product for the printed shopping list"
                    >
                      <input
                        type="checkbox"
                        checked={printChecked}
                        onChange={(event) =>
                          togglePrintProduct(product._id, event.target.checked)
                        }
                      />
                    </label>

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
                      <p className="product-name-ar" dir="rtl" lang="ar">
                        {productNameArabic(product)}
                      </p>
                      <p className="product-category" dir="ltr">
                        {getCategoryNames(product).en}
                        {getCategoryNames(product).ar ? ` / ${getCategoryNames(product).ar}` : ""}
                      </p>
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
        </details>

        <details className="panel collapsible-panel">
          <summary className="panel-heading collapsible-heading"><div>
            <h2>Supplier Product List & Prices</h2>
            <p>Choose a supplier, save the products it sells, and keep its own QAR prices.</p>
          </div><span className="collapse-hint">Open / Minimize</span></summary>
          <div className="order-form">
            <label>Supplier
              <select className="text-input" value={selectedSupplier} onChange={(event) => setSelectedSupplier(event.target.value)}>
                <option value="">Select supplier</option>
                {suppliers.filter((supplier) => supplier.active !== false).map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}{supplier.marketName ? ` — ${supplier.marketName}` : ""}</option>)}
              </select>
            </label>
            <div className="action-buttons">
              <button type="button" className="button button-primary" onClick={saveSupplierCatalog} disabled={savingCatalog || !selectedSupplier}>{savingCatalog ? "Saving..." : "Save Supplier Products & Prices"}</button>
              <button type="button" className="button button-secondary" onClick={printSupplierCatalog} disabled={!selectedSupplier || catalogSelected.length === 0}>Print Supplier Price List</button>
              <button type="button" className="button button-light" onClick={() => void deleteSupplier()} disabled={!selectedSupplier}>Delete Supplier</button>
            </div>
          </div>
          {!selectedSupplier ? <div className="empty-state">Select a supplier to manage its product list.</div> : <div className="product-list">
            {products.filter((product) => catalogSelected.includes(product._id) || search.trim() === "" || `${productName(product)} ${productNameArabic(product)} ${product.sku || ""}`.toLowerCase().includes(search.trim().toLowerCase())).map((product) => {
              const checked = catalogSelected.includes(product._id);
              return <article className="product-row" key={`supplier-catalog-${product._id}`}>
                <label className="selection-checkbox"><input type="checkbox" checked={checked} onChange={(event) => toggleCatalogProduct(product._id, event.target.checked)} /></label>
                <div className="product-image">{productImage(product) ? <img src={productImage(product)} alt={productName(product)} /> : <div className="no-image">No image</div>}</div>
                <div className="product-details"><h3>{productName(product)}</h3><p className="product-name-ar" dir="rtl" lang="ar">{productNameArabic(product)}</p><p>SKU: {product.sku || "—"}</p></div>
                <div className="purchase-controls"><label>Supplier price (QAR)<input type="number" min="0" step="0.01" disabled={!checked} value={catalogPrices[product._id] ?? Number(product.price || 0)} onChange={(event) => setCatalogPrices((previous) => ({ ...previous, [product._id]: Math.max(0, Number(event.target.value)) }))} /></label></div>
              </article>;
            })}
          </div>}
          <p>Products in this supplier list: <strong>{catalogSelected.length}</strong></p>
        </details>

        <details className="panel collapsible-panel">
          <summary className="panel-heading collapsible-heading">
            <div><h2>Create Purchase Order</h2><p>Save the selected products as a purchase order.</p></div>
            <span className="collapse-hint">Open / Minimize</span>
          </summary>

          <div className="order-form">
            <label>
              Supplier / Market
              <select
                className="text-input"
                value={selectedSupplier}
                onChange={(event) => {
                  const nextSupplierId = event.target.value;
                  setSelectedSupplier(nextSupplierId);
                  const nextSupplier = suppliers.find((item) => item._id === nextSupplierId);
                  const savedPrices = new Map((nextSupplier?.supplierProducts || []).map((item) => [item.productId, Number(item.unitCost || 0)]));
                  setPurchaseItems((previous) => {
                    const next = { ...previous };
                    Object.keys(next).forEach((productId) => {
                      if (savedPrices.has(productId)) next[productId] = { ...next[productId], unitCost: savedPrices.get(productId)! };
                    });
                    return next;
                  });
                }}
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
        </details>

        <details className="panel collapsible-panel">
          <summary className="panel-heading collapsible-heading">
            <div><h2>Purchase Order History</h2><p>Previously saved purchase orders.</p></div>
            <span className="collapse-hint">Open / Minimize</span>
          </summary>

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
                                item.quantity * item.unitCost
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
        </details>
      </div>
    </div>
  );
}
