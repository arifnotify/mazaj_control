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
  unit: string;
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

type SavedShoppingListItem = { productId: string; quantity: number | string; unit?: string };

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

  // New state for searching products inside the active list modal
  const [modalProductSearch, setModalProductSearch] = useState("");

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
    Record<string, { quantity: string | number; unit: string; unitCost: number }>
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
        body: JSON.stringify({ 
          name, 
          items: printSelected.map((productId) => ({ 
            productId, 
            quantity: purchaseItems[productId]?.quantity ?? "", 
            unit: purchaseItems[productId]?.unit ?? "kg" 
          })), 
          productIds: printSelected 
        }),
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
    const items = Array.isArray(list.items) && list.items.length
      ? list.items.map((item) => ({ productId: item.productId, quantity: item.quantity ?? "", unit: item.unit || "kg" }))
      : (list.productIds || []).map((productId) => ({ productId, quantity: "", unit: "kg" }));
    setActiveSavedListId(list._id);
    setActiveSavedListItems(items);
    setPrintSelected(items.map((item) => item.productId));
    setModalProductSearch("");
    setSuccess(`Opened shopping list: ${list.name}. Edit quantities below and save changes.`);
    setError("");
  }

  function printSavedShoppingList(list: SavedShoppingList) {
    const items = Array.isArray(list.items) && list.items.length
      ? list.items.map((item) => ({ productId: item.productId, quantity: item.quantity ?? "", unit: item.unit || "kg" }))
      : (list.productIds || []).map((productId) => ({ productId, quantity: "", unit: "kg" }));
    if (items.length === 0) {
      setError("This saved shopping list has no products to print.");
      return;
    }

    setActiveSavedListId(list._id);
    setActiveSavedListItems(items);
    setPrintSelected(items.map((item) => item.productId));
    setError("");
    setSuccess("");
    window.setTimeout(() => window.print(), 150);
  }

  function updateSavedListQuantity(productId: string, quantity: string | number) {
    setActiveSavedListItems((previous) => previous.map((item) => item.productId === productId
      ? { ...item, quantity }
      : item));
  }

  function updateSavedListUnit(productId: string, unit: string) {
    setActiveSavedListItems((previous) => previous.map((item) => item.productId === productId
      ? { ...item, unit }
      : item));
  }

  function removeSavedListProduct(productId: string) {
    setActiveSavedListItems((previous) => previous.filter((item) => item.productId !== productId));
  }

  function addSelectedProductsToSavedList() {
    setActiveSavedListItems((previous) => {
      const existing = new Set(previous.map((item) => item.productId));
      return [...previous, ...printSelected.filter((id) => !existing.has(id)).map((productId) => ({ productId, quantity: "", unit: "kg" }))];
    });
    setSuccess("Selected products added to the open list. Save changes to keep them in the database.");
    setError("");
  }

  async function saveActiveShoppingList() {
    if (!activeSavedListId) return;
    if (activeSavedListItems.length === 0) { setError("A saved shopping list must contain at least one product."); return; }
    setSavingActiveSavedList(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/saved-shopping-lists", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: activeSavedListId, items: activeSavedListItems }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || data?.message || "Could not save shopping list changes.");
      setSuccess("Shopping list products and quantities saved to the database.");
      await loadSavedShoppingLists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save shopping list changes.");
    } finally { setSavingActiveSavedList(false); }
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
      .filter(([, value]) => value.quantity !== "" && value.quantity != null)
      .map(([productId, value]) => {
        const product = products.find((item) => item._id === productId);

        if (!product) return null;

        const qtyNum = Number(value.quantity) || 0;

        return {
          productId,
          sku: String(product.sku || ""),
          name: productName(product),
          image: productImage(product),
          quantity: qtyNum,
          unit: value.unit,
          unitCost: value.unitCost,
          lineTotal: qtyNum * value.unitCost,
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

  function togglePurchaseProduct(product: Product, checked: boolean) {
    setPurchaseItems((previous) => {
      const next = { ...previous };

      if (checked) {
        const selectedSupplierRecord = suppliers.find((item) => item._id === selectedSupplier);
        const savedSupplierProduct = selectedSupplierRecord?.supplierProducts?.find((item) => item.productId === product._id);
        next[product._id] = next[product._id] || {
          quantity: "",
          unit: "kg",
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
    field: "quantity" | "unit" | "unitCost",
    value: string | number
  ) {
    setPurchaseItems((previous) => ({
      ...previous,
      [productId]: {
        quantity: previous[productId]?.quantity ?? "",
        unit: previous[productId]?.unit ?? "kg",
        unitCost: previous[productId]?.unitCost ?? 0,
        [field]: value,
      },
    }));
  }

  function togglePrintProduct(productId: string, checked: boolean) {
    setPrintSelected((previous) => {
      if (checked) {
        if (!printSelected.includes(productId) && !purchaseItems[productId]) {
          setPurchaseItems((p) => ({
            ...p,
            [productId]: { quantity: "", unit: "kg", unitCost: Number(products.find(x => x._id === productId)?.price || 0) }
          }));
        }
        return previous.includes(productId)
          ? previous
          : [...previous, productId];
      }

      return previous.filter((id) => id !== productId);
    });
  }

  function selectAllVisibleProducts() {
    const visibleProductIds = filteredProducts.map((product) => product._id);
    visibleProductIds.forEach((id) => {
      if (!purchaseItems[id]) {
        setPurchaseItems((p) => ({
          ...p,
          [id]: { quantity: "", unit: "kg", unitCost: Number(products.find(x => x._id === id)?.price || 0) }
        }));
      }
    });

    setPrintSelected((previous) =>
      Array.from(new Set([...previous, ...visibleProductIds]))
    );
  }

  function getPrintQuantityDisplay(productId: string): string {
    const savedListItem = activeSavedListItems.find((item) => item.productId === productId);
    let qty = "";
    let unit = "kg";

    if (activeSavedListId && savedListItem) {
      qty = savedListItem.quantity !== "" && savedListItem.quantity != null ? String(savedListItem.quantity) : "";
      unit = savedListItem.unit || "kg";
    } else {
      const item = purchaseItems[productId];
      if (item && item.quantity !== "" && item.quantity != null) {
        qty = String(item.quantity);
        unit = item.unit || "kg";
      }
    }

    if (!qty || qty.trim() === "") {
      return "__________________";
    }
    return `${qty} ${unit}`;
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
      setError("Please select at least one product with a valid quantity for the purchase order.");
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
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 sm:p-6 font-sans">
      {/* PRINT-ONLY BILINGUAL SHOPPING LIST */}
      {!supplierPrintMode && <section className="print-only hidden print:block" dir="ltr">
        <style jsx global>{`
          @media print {
            @page { size: A4 portrait; margin: 5mm; }
            .print-only { display: block !important; color: #111 !important; }
            .screen-only { display: none !important; }
            .print-page { 
              break-after: page; 
              page-break-after: always; 
              width: 100%; 
              height: 287mm; 
              display: flex; 
              flex-direction: column; 
              justify-content: space-between; 
            }
            .print-page:last-child { break-after: auto; page-break-after: auto; }
            .print-header { margin: 0 0 2mm !important; padding: 0 0 2mm !important; border-bottom: 2px solid #111 !important; }
            .print-header-top { display: flex; justify-content: space-between; align-items: center; }
            .print-header h1 { font-size: 14pt !important; margin: 0 !important; font-weight: bold; }
            .print-header h2 { font-size: 11pt !important; margin: 0 !important; font-weight: bold; }
            .print-meta { font-size: 8pt !important; margin: 1mm 0 0 0 !important; display: flex; justify-content: space-between; }
            .print-category { margin: 0 0 2mm !important; flex: 1; display: flex; flex-direction: column; }
            .print-category-heading { margin: 1.5mm 0 !important; padding: 2mm 3mm !important; background: #e2e8f0 !important; display: flex; justify-content: space-between; font-weight: bold; border-radius: 3px; }
            .print-category-heading h2 { font-size: 10pt !important; margin: 0 !important; }
            .print-product-grid { 
              display: grid !important; 
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important; 
              grid-auto-rows: 1fr; 
              gap: 2.5mm !important; 
              flex: 1;
            }
            .print-product { 
              display: flex !important; 
              flex-direction: row !important; 
              gap: 3mm !important; 
              padding: 3mm !important; 
              border: 1.5px solid #475569 !important; 
              border-radius: 6px !important; 
              align-items: center;
              background: #fff !important; 
              height: 100%;
            }
            .print-product img, .print-no-image { width: 22mm !important; height: 22mm !important; min-width: 22mm !important; object-fit: contain !important; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; }
            .print-product-info { min-width: 0; font-size: 8pt !important; line-height: 1.3 !important; width: 100%; }
            .print-product-info strong { font-size: 9pt !important; overflow-wrap: anywhere; display: block; font-weight: 700; color: #020617; }
            .print-product-info p { margin: 1mm 0 !important; font-size: 7.5pt !important; color: #334155; }
            .quantity-blank { font-size: 8.5pt !important; margin: 1mm 0 !important; font-weight: bold; color: #0f172a; background: #f8fafc; padding: 1mm 1.5mm; border-radius: 4px; border: 1px dashed #94a3b8; text-align: center; }
            .print-footer { margin-top: 2mm !important; font-size: 8pt !important; border-top: 1px solid #64748b; padding-top: 2mm; display: flex; justify-content: space-between; font-weight: 600; }
          }
        `}</style>
        {printPages.map((page, pageIndex) => (
          <div className="print-page" key={`print-page-${pageIndex}`}>
            <header className="print-header">
              <div className="print-header-top">
                <h1>Mazaj Nuts Roastery</h1>
                <h2 lang="ar" dir="rtl">محمص مزاج للمكسرات</h2>
              </div>
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
                  <div><h2>{group.categoryEn}</h2></div>
                  <div className="print-category-ar" lang="ar" dir="rtl"><h2>{group.categoryAr}</h2></div>
                </div>
                <div className="print-product-grid">
                  {group.products.map((product) => (
                    <article className="print-product" key={product._id}>
                      {productImage(product) ? (
                        <img src={productImage(product)} alt={productName(product)} />
                      ) : (
                        <div className="print-no-image flex items-center justify-center bg-slate-100 text-[8px]"><span>No image</span></div>
                      )}
                      <div className="print-product-info">
                        <strong className="print-name-en truncate" dir="ltr">{productName(product)}</strong>
                        <strong className="print-name-ar truncate" dir="rtl" lang="ar">{productNameArabic(product)}</strong>
                        <p>SKU: {product.sku || "—"}</p>
                        <p className="print-bilingual-line flex justify-between font-semibold"><span>Qty:</span><span lang="ar" dir="rtl">الكمية:</span></p>
                        <div className="quantity-blank">
                          {getPrintQuantityDisplay(product._id)}
                        </div>
                        <p className="print-checkbox-line">□ Checked / تم</p>
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
        return <section className="print-only supplier-catalog-print hidden print:block" dir="ltr">
          <style jsx global>{`@media print { .supplier-catalog-print { display:block !important; } .supplier-catalog-print table { width:100%; border-collapse:collapse; margin-top: 15px; } .supplier-catalog-print th,.supplier-catalog-print td { border:1px solid #777; padding:6px; text-align:left; font-size:9pt; } .supplier-catalog-print img { width:40px;height:40px;object-fit:contain; } }`}</style>
          <header className="print-header">
            <div className="print-header-top" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h1 className="text-lg font-bold">Mazaj Nuts Roastery</h1>
              <h2 className="text-md font-bold" lang="ar" dir="rtl">محمص مزاج للمكسرات</h2>
            </div>
            <div className="print-meta flex justify-between text-xs mt-2"><span>Supplier: {supplier?.name || "—"}</span><span>Date: {new Date().toLocaleDateString("en-GB")}</span></div>
            {supplier?.phone && <div className="text-xs">Phone: {supplier.phone}</div>}
          </header>
          <table>
            <thead>
              <tr className="bg-slate-100"><th>#</th><th>Image</th><th>SKU</th><th>Product (English)</th><th>اسم المنتج (العربية)</th><th>Supplier Price (QAR)</th></tr>
            </thead>
            <tbody>
              {catalogProducts.map((product, index) => (
                <tr key={product._id}>
                  <td>{index + 1}</td>
                  <td>{productImage(product) ? <img src={productImage(product)} alt={productName(product)} /> : "—"}</td>
                  <td>{product.sku || "—"}</td>
                  <td>{productName(product)}</td>
                  <td dir="rtl">{productNameArabic(product)}</td>
                  <td>{money(Number(catalogPrices[product._id] || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="print-footer mt-4 text-xs">Total products: {catalogProducts.length}</p>
        </section>;
      })()}

      {/* NORMAL SCREEN DASHBOARD UI */}
      <div className="screen-only max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">🛍️ Purchase Center</h1>
            <p className="text-sm text-slate-500">Find products to purchase from your regular supplier or a market.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button type="button" className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm" onClick={() => setShowCreateSupplier((value) => !value)}>
              {showCreateSupplier ? "Close Supplier Form" : "+ Create Supplier"}
            </button>
            <button
              type="button"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2.5 rounded-xl text-sm transition-all"
              onClick={() => void loadData()}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Notices */}
        {error && <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-sm font-medium border border-rose-200">{error}</div>}
        {success && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-medium border border-emerald-200">{success}</div>}

        {/* Create Supplier Panel */}
        {showCreateSupplier && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create New Supplier</h2>
              <p className="text-xs text-slate-500">Enter supplier details. The new supplier will be available in the supplier selector.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Supplier name *</label>
                <input className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" value={supplierForm.name} onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))} placeholder="Supplier or company name" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Supplier type</label>
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" value={supplierForm.type} onChange={(e) => setSupplierForm((p) => ({ ...p, type: e.target.value as "regular" | "market" }))}>
                  <option value="regular">Regular supplier</option>
                  <option value="market">Market</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Contact person</label>
                <input className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" value={supplierForm.contactPerson} onChange={(e) => setSupplierForm((p) => ({ ...p, contactPerson: e.target.value }))} placeholder="Contact person" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Phone</label>
                <input className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" value={supplierForm.phone} onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone number" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">WhatsApp</label>
                <input className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" value={supplierForm.whatsapp} onChange={(e) => setSupplierForm((p) => ({ ...p, whatsapp: e.target.value }))} placeholder="WhatsApp number" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Email</label>
                <input className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" type="email" value={supplierForm.email} onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))} placeholder="supplier@example.com" />
              </div>
              {supplierForm.type === "market" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Market name</label>
                  <input className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" value={supplierForm.marketName} onChange={(e) => setSupplierForm((p) => ({ ...p, marketName: e.target.value }))} placeholder="Market name" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Address</label>
                <input className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" value={supplierForm.address} onChange={(e) => setSupplierForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address / location" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Notes</label>
                <textarea className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 resize-none" rows={2} value={supplierForm.notes} onChange={(e) => setSupplierForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-sm" onClick={() => void createSupplier()} disabled={savingSupplier}>{savingSupplier ? "Saving Supplier..." : "Save Supplier"}</button>
              <button type="button" className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-all" onClick={() => setShowCreateSupplier(false)} disabled={savingSupplier}>Cancel</button>
            </div>
          </div>
        )}

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total products</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{products.length}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dashboard-disabled</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{disabledProducts.length}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Selected for purchase</span>
            <div className="text-2xl font-black text-indigo-600 mt-1">{selectedPurchaseItems.length}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Estimated total</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{money(purchaseTotal)}</div>
          </div>
        </div>

        {/* Saved Shopping Lists Panel */}
        <details className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group">
          <summary className="p-5 flex items-center justify-between cursor-pointer select-none bg-white hover:bg-slate-50 transition-colors">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Saved Shopping Lists</h2>
              <p className="text-xs text-slate-500">Save product selections in the database and reuse them whenever you need.</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">Open / Minimize</span>
          </summary>
          <div className="p-5 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Shopping list name</label>
                <input className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" value={shoppingListName} onChange={(event) => setShoppingListName(event.target.value)} placeholder="e.g. Weekly Grocery Purchase" />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm flex-1 sm:flex-none" onClick={() => void saveShoppingList()} disabled={savingShoppingList}>
                  {savingShoppingList ? "Saving..." : `Save Selected (${printSelected.length})`}
                </button>
                <button type="button" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-all" onClick={() => void loadSavedShoppingLists()}>Refresh Lists</button>
              </div>
            </div>

            {savedShoppingLists.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">No saved shopping lists yet. Select products below and save your first list.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedShoppingLists.map((list) => {
                  const count = list.items ? list.items.length : (list.productIds || []).length;
                  const updated = list.updatedAt ? new Date(list.updatedAt).toLocaleString() : list.createdAt ? new Date(list.createdAt).toLocaleString() : "Saved list";
                  return (
                    <article className="border border-slate-200 p-4 rounded-xl bg-slate-50 flex flex-col justify-between gap-3" key={list._id}>
                      <div>
                        <h3 className="font-bold text-slate-900">{list.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{count} product{count === 1 ? "" : "s"} · Updated {updated}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all" onClick={() => openShoppingList(list)}>Open</button>
                        <button type="button" className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" onClick={() => printSavedShoppingList(list)}>🖨 Print</button>
                        <button type="button" className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" onClick={() => void editShoppingList(list)}>Edit</button>
                        <button type="button" className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ml-auto" onClick={() => void deleteShoppingList(list)}>Delete</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {activeSavedListId && (() => {
              const activeList = savedShoppingLists.find((list) => list._id === activeSavedListId);
              if (!activeList) return null;
              return (
                <div className="mt-4 p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-indigo-900 text-base">Edit products: {activeList.name}</h3>
                      <p className="text-xs text-indigo-700">Change the quantity & unit for each product, remove items, or add new products with photo search.</p>
                    </div>
                    <button type="button" className="bg-white hover:bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-xs font-semibold border border-slate-200" onClick={() => { setActiveSavedListId(null); setActiveSavedListItems([]); }}>Close</button>
                  </div>

                  {/* SEARCH PRODUCT WITH PHOTO & ADD SECTION */}
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">🔍 Search & Add New Product (with photo)</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                      placeholder="Type product name or SKU to search..."
                      value={modalProductSearch}
                      onChange={(e) => setModalProductSearch(e.target.value)}
                    />

                    {modalProductSearch.trim().length > 0 && (
                      <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
                        {products
                          .filter((p) => {
                            const nameText = `${productName(p)} ${productNameArabic(p)} ${p.sku || ""}`.toLowerCase();
                            return nameText.includes(modalProductSearch.trim().toLowerCase());
                          })
                          .slice(0, 10) // Limit display to 10 for performance
                          .map((prod) => {
                            const isAlreadyInList = activeSavedListItems.some((item) => item.productId === prod._id);
                            return (
                              <div key={prod._id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-9 h-9 bg-slate-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border">
                                    {productImage(prod) ? (
                                      <img src={productImage(prod)} alt={productName(prod)} className="w-full h-full object-contain" />
                                    ) : (
                                      <span className="text-[8px] text-slate-400">No img</span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <strong className="block truncate text-slate-900">{productName(prod)}</strong>
                                    <span className="text-[10px] text-slate-400">SKU: {prod.sku || "—"}</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled={isAlreadyInList}
                                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all shrink-0 ${isAlreadyInList ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'}`}
                                  onClick={() => {
                                    if (!isAlreadyInList) {
                                      setActiveSavedListItems((previous) => [
                                        ...previous,
                                        { productId: prod._id, quantity: "", unit: "kg" }
                                      ]);
                                      setError("");
                                      setSuccess(`Added "${productName(prod)}" to the list.`);
                                    }
                                  }}
                                >
                                  {isAlreadyInList ? "Added" : "+ Add"}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {activeSavedListItems.length === 0 ? <div className="text-center py-6 text-slate-400 text-sm">No products in this list.</div> : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {activeSavedListItems.map((item) => {
                        const product = products.find((entry) => entry._id === item.productId);
                        return (
                          <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200 text-xs" key={item.productId}>
                            <div className="w-10 h-10 shrink-0 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border">
                              {product && productImage(product) ? <img src={productImage(product)} alt={productName(product)} className="w-full h-full object-contain" /> : <span className="text-[9px] text-slate-400">No img</span>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <strong className="block truncate text-slate-900">{product ? productName(product) : "Product no longer available"}</strong>
                              {product?.sku ? <span className="text-slate-400">SKU: {product.sku}</span> : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Qty</label>
                              <input className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold text-xs" type="text" placeholder="Blank" value={item.quantity ?? ""} onChange={(event) => updateSavedListQuantity(item.productId, event.target.value)} />
                              <select className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold" value={item.unit || "kg"} onChange={(event) => updateSavedListUnit(item.productId, event.target.value)}>
                                <option value="kg">kg</option>
                                <option value="gm">gm</option>
                                <option value="pcs">pcs</option>
                              </select>
                            </div>
                            <button type="button" className="text-rose-500 hover:text-rose-700 font-bold px-2 py-1" onClick={() => removeSavedListProduct(item.productId)}>✕</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button type="button" className="bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl text-xs font-medium transition-all" onClick={addSelectedProductsToSavedList}>Add Selected Products from Find Products</button>
                    <button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all ml-auto shadow-sm" onClick={() => void saveActiveShoppingList()} disabled={savingActiveSavedList || activeSavedListItems.length === 0}>{savingActiveSavedList ? "Saving..." : "Save Product & Quantity Changes"}</button>
                  </div>
                </div>
              );
            })()}
          </div>
        </details>

        {/* Find Products Panel */}
        <details className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group">
          <summary className="p-5 flex items-center justify-between cursor-pointer select-none bg-white hover:bg-slate-50 transition-colors">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Find Products</h2>
              <p className="text-xs text-slate-500">Select products for an order or print a shopping list.</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">Open / Minimize</span>
          </summary>
          <div className="p-5 border-t border-slate-100 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search product name or SKU..."
              />

              <select
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as FilterType)
                }
              >
                <option value="all">All products</option>
                <option value="stock">Out of stock</option>
                <option value="marketplace">Unavailable on marketplace</option>
                <option value="catalog">Product disabled in dashboard</option>
              </select>

              <select
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
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

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-600">
                {filteredProducts.length} product(s) shown · <strong className="text-indigo-600">{selectedPrintProducts.length}</strong> selected for print
              </span>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                  onClick={selectAllVisibleProducts}
                >
                  Select All Visible
                </button>

                <button
                  type="button"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm"
                  onClick={printSelectedProducts}
                >
                  Print Shopping List ({selectedPrintProducts.length})
                </button>

                <button
                  type="button"
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                  onClick={() => setPrintSelected([])}
                >
                  Clear
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No products found for this filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredProducts.map((product) => {
                  const printChecked = printSelected.includes(product._id);
                  const itemData = purchaseItems[product._id];

                  return (
                    <article className={`border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all ${printChecked ? 'border-indigo-500 bg-indigo-50/10' : 'border-slate-200 bg-white hover:border-slate-300'}`} key={product._id}>
                      <div className="flex gap-3 items-start">
                        <label
                          className="mt-1 cursor-pointer shrink-0"
                          title="Select this product for the printed shopping list"
                        >
                          <input
                            type="checkbox"
                            checked={printChecked}
                            onChange={(event) =>
                              togglePrintProduct(product._id, event.target.checked)
                            }
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                        </label>

                        <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                          {productImage(product) ? (
                            <img
                              src={productImage(product)}
                              alt={productName(product)}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-[9px] text-slate-400">No image</div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-900 text-xs truncate">{productName(product)}</h3>
                          <p className="text-[11px] text-slate-500 truncate" dir="rtl" lang="ar">
                            {productNameArabic(product)}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            SKU: {product.sku || "—"} | Stock: {Number(product.stock ?? 0)}
                          </p>
                          <div className="mt-1">
                            {product.active === false ? (
                              <span className="inline-block bg-rose-50 text-rose-600 text-[9px] font-bold px-2 py-0.5 rounded">
                                Disabled in dashboard
                              </span>
                            ) : (
                              <span className="inline-block bg-emerald-50 text-emerald-600 text-[9px] font-bold px-2 py-0.5 rounded">
                                Dashboard active
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 block uppercase">Price</span>
                          <strong className="text-xs font-bold text-slate-900">
                            {money(Number(product.price || 0))}
                          </strong>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-600">Print Quantity & Unit:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Blank"
                            value={itemData?.quantity ?? ""}
                            onChange={(event) =>
                              updatePurchaseField(
                                product._id,
                                "quantity",
                                event.target.value
                              )
                            }
                            className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-bold"
                          />
                          <select
                            value={itemData?.unit ?? "kg"}
                            onChange={(event) =>
                              updatePurchaseField(
                                product._id,
                                "unit",
                                event.target.value
                              )
                            }
                            className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold text-slate-700"
                          >
                            <option value="kg">kg</option>
                            <option value="gm">gm</option>
                            <option value="pcs">pcs</option>
                          </select>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </details>

        {/* Supplier Product List & Prices Panel */}
        <details className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group">
          <summary className="p-5 flex items-center justify-between cursor-pointer select-none bg-white hover:bg-slate-50 transition-colors">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Supplier Product List & Prices</h2>
              <p className="text-xs text-slate-500">Choose a supplier, save the products it sells, and keep its own QAR prices.</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">Open / Minimize</span>
          </summary>
          <div className="p-5 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Supplier</label>
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" value={selectedSupplier} onChange={(event) => setSelectedSupplier(event.target.value)}>
                  <option value="">Select supplier</option>
                  {suppliers.filter((supplier) => supplier.active !== false).map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}{supplier.marketName ? ` — ${supplier.marketName}` : ""}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all shadow-sm" onClick={saveSupplierCatalog} disabled={savingCatalog || !selectedSupplier}>{savingCatalog ? "Saving..." : "Save Supplier Products & Prices"}</button>
                <button type="button" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-medium transition-all" onClick={printSupplierCatalog} disabled={!selectedSupplier || catalogSelected.length === 0}>Print List</button>
                <button type="button" className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-xs font-medium transition-all" onClick={() => void deleteSupplier()} disabled={!selectedSupplier}>Delete</button>
              </div>
            </div>

            {!selectedSupplier ? (
              <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">Select a supplier to manage its product list.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {products.filter((product) => catalogSelected.includes(product._id) || search.trim() === "" || `${productName(product)} ${productNameArabic(product)} ${product.sku || ""}`.toLowerCase().includes(search.trim().toLowerCase())).map((product) => {
                  const checked = catalogSelected.includes(product._id);
                  return (
                    <article className={`border rounded-2xl p-3 flex items-center justify-between gap-3 transition-all ${checked ? 'border-indigo-500 bg-indigo-50/10' : 'border-slate-200 bg-white'}`} key={`supplier-catalog-${product._id}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <label className="cursor-pointer shrink-0">
                          <input type="checkbox" checked={checked} onChange={(event) => toggleCatalogProduct(product._id, event.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                        </label>
                        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                          {productImage(product) ? <img src={productImage(product)} alt={productName(product)} className="w-full h-full object-contain" /> : <div className="text-[9px] text-slate-400">No image</div>}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-xs truncate">{productName(product)}</h3>
                          <p className="text-[10px] text-slate-400">SKU: {product.sku || "—"}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Supplier price (QAR)</label>
                        <input type="number" min="0" step="0.01" disabled={!checked} value={catalogPrices[product._id] ?? Number(product.price || 0)} onChange={(event) => setCatalogPrices((previous) => ({ ...previous, [product._id]: Math.max(0, Number(event.target.value)) }))} className="w-24 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-center text-xs font-bold disabled:opacity-50" />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-slate-500 font-medium">Products in this supplier list: <strong className="text-indigo-600">{catalogSelected.length}</strong></p>
          </div>
        </details>

        {/* Create Purchase Order Panel */}
        <details className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group">
          <summary className="p-5 flex items-center justify-between cursor-pointer select-none bg-white hover:bg-slate-50 transition-colors">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create Purchase Order</h2>
              <p className="text-xs text-slate-500">Save the selected products as a purchase order.</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">Open / Minimize</span>
          </summary>
          <div className="p-5 border-t border-slate-100 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Supplier / Market</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
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
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Notes</label>
                <textarea
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional purchase notes..."
                  rows={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Selected products</span>
                <strong className="text-lg font-black text-slate-900">{selectedPurchaseItems.length}</strong>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Total quantity</span>
                <strong className="text-lg font-black text-slate-900">
                  {selectedPurchaseItems.reduce(
                    (total, item) => total + item.quantity,
                    0
                  )}
                </strong>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Estimated subtotal</span>
                <strong className="text-lg font-black text-indigo-600">{money(purchaseTotal)}</strong>
              </div>
            </div>

            {selectedPurchaseItems.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedPurchaseItems.link?.length ?? selectedPurchaseItems.map((item) => (
                  <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs" key={item.productId}>
                    <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-[9px] text-slate-400">—</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-slate-900">{item.name}</strong>
                      <span className="text-[10px] text-slate-400">SKU: {item.sku || "—"} | Qty: {item.quantity} {item.unit} × {money(item.unitCost)}</span>
                    </div>
                    <strong className="text-slate-900">{money(item.lineTotal)}</strong>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-sm"
              onClick={createPurchaseOrder}
              disabled={saving || loading}
            >
              {saving ? "Creating order..." : "Create Purchase Order"}
            </button>
          </div>
        </details>

        {/* Purchase Order History Panel */}
        <details className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group">
          <summary className="p-5 flex items-center justify-between cursor-pointer select-none bg-white hover:bg-slate-50 transition-colors">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Purchase Order History</h2>
              <p className="text-xs text-slate-500">Previously saved purchase orders.</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">Open / Minimize</span>
          </summary>
          <div className="p-5 border-t border-slate-100">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No purchase orders yet.</div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <article className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3" key={order._id}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-200">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{order.orderNumber || "Purchase Order"}</h3>
                        <p className="text-xs text-slate-600">{order.supplierName || "Supplier not specified"}</p>
                        <span className="text-[10px] text-slate-400">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleString()
                            : ""}
                        </span>
                      </div>

                      <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        {order.status || "draft"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(order.items || []).map((item, index) => (
                        <div
                          className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 text-xs"
                          key={`${order._id}-${item.productId || index}`}
                        >
                          <div className="w-8 h-8 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                            ) : (
                              <div className="text-[8px] text-slate-450">—</div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <strong className="block truncate text-slate-900">{item.name}</strong>
                            <span className="text-[10px] text-slate-400">SKU: {item.sku || "—"} · Qty: {item.quantity} {item.unit || "kg"}</span>
                          </div>

                          <strong className="text-slate-900">
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

                    <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <strong className="text-sm font-black text-slate-900">
                        Total: {money(Number(order.subtotal || 0))}
                      </strong>

                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        {order.status !== "ordered" &&
                          order.status !== "received" &&
                          order.status !== "cancelled" && (
                            <button
                              type="button"
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
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
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm"
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
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
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
          </div>
        </details>
      </div>
    </div>
  );
}
