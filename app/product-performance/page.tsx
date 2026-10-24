"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  _id: string;
  sku?: string;
  nameEn?: string;
  nameAr?: string;
  categoryEn?: string;
  categoryAr?: string;
  stock?: number;
  price?: number;
  active?: boolean;
  expiryDate?: string;
  expirationDate?: string;
  bestBefore?: string;
};

type Platform = "All" | "Snoonu" | "Talabat" | "Rafeeq" | "Keeta";
type ProductMeta = {
  expiryDate: string;
  salesByPlatform: Record<string, string>;
  note: string;
};

type SavedMeta = Record<string, ProductMeta>;
const PLATFORMS: Platform[] = ["All", "Snoonu", "Talabat", "Rafeeq", "Keeta"];
const LOW_SALES_DEFAULT = 5;
const HIGH_SALES_DEFAULT = 20;
const NEAR_EXPIRY_DAYS_DEFAULT = 45;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysUntil(dateText: string) {
  if (!dateText) return null;
  const target = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date(`${todayKey()}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}
function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}
function blankMeta(product?: Product): ProductMeta {
  const existingExpiry = product?.expiryDate || product?.expirationDate || product?.bestBefore || "";
  return { expiryDate: existingExpiry.slice(0, 10), salesByPlatform: {}, note: "" };
}

export default function ProductPerformancePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<SavedMeta>({});
  const [platform, setPlatform] = useState<Platform>("All");
  const [search, setSearch] = useState("");
  const [lowSalesLimit, setLowSalesLimit] = useState(String(LOW_SALES_DEFAULT));
  const [highSalesLimit, setHighSalesLimit] = useState(String(HIGH_SALES_DEFAULT));
  const [nearExpiryDays, setNearExpiryDays] = useState(String(NEAR_EXPIRY_DAYS_DEFAULT));
  const [activeTab, setActiveTab] = useState<"all" | "slow" | "expiry" | "best">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [metaReady, setMetaReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [productsResponse, metaResponse] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/product-performance", { cache: "no-store" }),
        ]);
        const data = await productsResponse.json();
        const savedMeta = await metaResponse.json();
        if (!productsResponse.ok) throw new Error(data?.error || "Could not load products.");
        if (!metaResponse.ok) throw new Error(savedMeta?.error || "Could not load product performance data.");
        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : []);
          let oldBrowserData: SavedMeta = {};
          try {
            const raw = localStorage.getItem("product-performance-meta-v1");
            if (raw) oldBrowserData = JSON.parse(raw) as SavedMeta;
          } catch { /* ignore unreadable legacy browser data */ }
          const databaseData = savedMeta?.data && typeof savedMeta.data === "object" ? savedMeta.data : {};
          // Keep existing browser-only entries as a one-time fallback; database values take priority.
          setMeta({ ...oldBrowserData, ...databaseData });
          setMetaReady(true);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load products.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!metaReady) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/product-performance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: Object.entries(meta).map(([productId, value]) => ({ productId, ...value })) }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || "Could not save product performance data.");
        setNotice("All changes saved to MongoDB.");
      } catch (e) {
        setNotice(e instanceof Error ? `Database save failed: ${e.message}` : "Database save failed. Please retry.");
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [meta, metaReady]);

  function getMeta(product: Product): ProductMeta {
    return meta[product._id] || blankMeta(product);
  }
  function updateMeta(product: Product, update: Partial<ProductMeta>) {
    setMeta(current => ({
      ...current,
      [product._id]: { ...blankMeta(product), ...current[product._id], ...update },
    }));
  }
  function salesFor(product: Product, p = platform) {
    const m = getMeta(product);
    if (p !== "All") return Number(m.salesByPlatform[p] || 0);
    return PLATFORMS.filter(x => x !== "All").reduce((sum, x) => sum + Number(m.salesByPlatform[x] || 0), 0);
  }
  function expiryFor(product: Product) {
    return getMeta(product).expiryDate;
  }
  function statusFor(product: Product) {
    const days = daysUntil(expiryFor(product));
    const sales = salesFor(product);
    const low = sales <= Number(lowSalesLimit || 0);
    const high = sales >= Number(highSalesLimit || 0);
    const near = days !== null && days <= Number(nearExpiryDays || 0);
    return { days, low, high, near, sales };
  }

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (p.active === false) return false;
      const name = `${p.nameEn || ""} ${p.nameAr || ""} ${p.sku || ""}`.toLowerCase();
      if (q && !name.includes(q)) return false;
      if (activeTab === "slow") return salesFor(p) <= Number(lowSalesLimit || 0);
      if (activeTab === "best") return salesFor(p) >= Number(highSalesLimit || 0);
      if (activeTab === "expiry") {
        const days = daysUntil(expiryFor(p));
        return days !== null && days <= Number(nearExpiryDays || 0);
      }
      return true;
    }).sort((a, b) => {
      if (activeTab === "slow") return salesFor(a) - salesFor(b);
      if (activeTab === "best") return salesFor(b) - salesFor(a);
      if (activeTab === "expiry") return (daysUntil(expiryFor(a)) ?? 99999) - (daysUntil(expiryFor(b)) ?? 99999);
      return (a.nameEn || a.nameAr || "").localeCompare(b.nameEn || b.nameAr || "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, meta, platform, search, activeTab, lowSalesLimit, highSalesLimit, nearExpiryDays]);

  function exportCsv() {
    const rows = visibleProducts.map(p => {
      const s = statusFor(p);
      const pName = p.nameEn || p.nameAr || "";
      return [platform, p.sku || "", pName, p.nameAr || "", p.categoryEn || p.categoryAr || "", p.stock ?? "", expiryFor(p), s.days === null ? "" : s.days, salesFor(p), s.near ? "Near expiry" : "", s.low ? "Slow moving" : "", s.high ? "Best seller" : "", getMeta(p).note];
    });
    const headers = ["Platform", "SKU", "Product Name", "Arabic Name", "Category", "Current Stock", "Expiry Date", "Days Until Expiry", "Sales Units (entered manually)", "Expiry Alert", "Sales Group", "Best Seller", "Notes"];
    const csv = "\uFEFF" + [headers, ...rows].map(row => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `product-list-${platform.toLowerCase()}-${activeTab}-${todayKey()}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  const counts = useMemo(() => ({
    all: products.filter(p => p.active !== false).length,
    slow: products.filter(p => p.active !== false && salesFor(p) <= Number(lowSalesLimit || 0)).length,
    best: products.filter(p => p.active !== false && salesFor(p) >= Number(highSalesLimit || 0)).length,
    expiry: products.filter(p => p.active !== false && (() => { const d = daysUntil(expiryFor(p)); return d !== null && d <= Number(nearExpiryDays || 0); })()).length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [products, meta, platform, lowSalesLimit, highSalesLimit, nearExpiryDays]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Inventory intelligence</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Product Performance & Expiry</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">Find slow-moving products, products close to expiry, and best sellers. Choose a delivery platform and export the visible list for Excel.</p>
          </div>
          <button onClick={exportCsv} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800">Export Excel-compatible CSV</button>
        </header>

        {notice && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{notice}</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error} Make sure the existing /api/products endpoint is available.</p>}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[{key:"all",label:"Active products",value:counts.all},{key:"slow",label:"Slow moving",value:counts.slow},{key:"expiry",label:"Expiry alerts",value:counts.expiry},{key:"best",label:"Best sellers",value:counts.best}].map(card => <button key={card.key} onClick={() => setActiveTab(card.key as typeof activeTab)} className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 ${activeTab === card.key ? "border-emerald-600 ring-2 ring-emerald-100" : "border-slate-200"}`}><p className="text-sm text-slate-500">{card.label}</p><p className="mt-2 text-3xl font-bold">{card.value}</p></button>)}
        </section>

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
          <label className="block text-sm font-semibold">Delivery platform<select value={platform} onChange={e => setPlatform(e.target.value as Platform)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"><option>All</option><option>Snoonu</option><option>Talabat</option><option>Rafeeq</option><option>Keeta</option></select></label>
          <label className="block text-sm font-semibold">Search product<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, Arabic name, SKU" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
          <label className="block text-sm font-semibold">Slow moving: sales units at or below<input type="number" min="0" value={lowSalesLimit} onChange={e => setLowSalesLimit(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
          <label className="block text-sm font-semibold">Best seller: sales units at or above<input type="number" min="0" value={highSalesLimit} onChange={e => setHighSalesLimit(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
          <label className="block text-sm font-semibold md:col-span-2 xl:col-span-1">Expiry alert within (days)<input type="number" min="0" value={nearExpiryDays} onChange={e => setNearExpiryDays(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
          <div className="flex items-end text-xs leading-5 text-slate-500 md:col-span-2 xl:col-span-3">Sales figures are entered manually per platform; they are not automatically fetched from Snoonu, Talabat, Rafeeq, or Keeta. Expiry dates, sales entries, and notes are saved to MongoDB.</div>
        </section>

        <div className="flex flex-wrap gap-2">
          {[{key:"all",label:"All products"},{key:"slow",label:"Slow moving"},{key:"expiry",label:"Near expiry"},{key:"best",label:"Best sellers"}].map(tab => <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)} className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === tab.key ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}>{tab.label}</button>)}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="font-bold">{activeTab === "slow" ? "Slow-moving products" : activeTab === "expiry" ? "Products near expiry" : activeTab === "best" ? "Best-selling products" : "Product list"}</h2><span className="text-sm text-slate-500">{visibleProducts.length} products</span></div>
          {loading ? <p className="p-8 text-center text-slate-500">Loading products…</p> : visibleProducts.length === 0 ? <p className="p-8 text-center text-slate-500">No products match this view. Add product expiry dates and sales units, or adjust the thresholds.</p> : <div className="overflow-x-auto"><table className="min-w-[1150px] w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU / Stock</th><th className="px-4 py-3">Expiry date</th><th className="px-4 py-3">Days left</th><th className="px-4 py-3">Sales on {platform === "All" ? "all platforms" : platform}</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Notes</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleProducts.map(p => { const s = statusFor(p); const m = getMeta(p); return <tr key={p._id} className="align-top hover:bg-slate-50"><td className="px-4 py-3"><div className="font-semibold">{p.nameEn || p.nameAr || "Unnamed product"}</div>{p.nameAr && <div className="mt-1 text-xs text-slate-500" dir="rtl">{p.nameAr}</div>}<div className="mt-1 text-xs text-slate-400">{p.categoryEn || p.categoryAr || ""}</div></td><td className="px-4 py-3"><div>{p.sku || "—"}</div><div className="mt-1 text-xs text-slate-500">Stock: {p.stock ?? "—"}</div></td><td className="px-4 py-3"><input aria-label={`Expiry date for ${p.nameEn || p.sku}`} type="date" value={m.expiryDate} onChange={e => updateMeta(p, { expiryDate: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5" /></td><td className="px-4 py-3">{s.days === null ? <span className="text-slate-400">Not set</span> : <span className={`font-bold ${s.days < 0 ? "text-red-700" : s.days <= Number(nearExpiryDays) ? "text-amber-700" : "text-slate-700"}`}>{s.days < 0 ? `${Math.abs(s.days)} days overdue` : `${s.days} days`}</span>}</td><td className="px-4 py-3"><input aria-label={`Sales for ${p.nameEn || p.sku}`} type="number" min="0" value={platform === "All" ? PLATFORMS.filter(x => x !== "All").reduce((sum, x) => sum + Number(m.salesByPlatform[x] || 0), 0) : (m.salesByPlatform[platform] || "")} disabled={platform === "All"} onChange={e => { if (platform !== "All") updateMeta(p, { salesByPlatform: { ...m.salesByPlatform, [platform]: e.target.value } }); }} placeholder={platform === "All" ? "Choose platform to edit" : "Units sold"} className="w-32 rounded-md border border-slate-300 px-2 py-1.5 disabled:bg-slate-100" />{platform === "All" && <div className="mt-1 text-xs text-slate-400">Select a platform to edit</div>}</td><td className="px-4 py-3"><div className="flex max-w-48 flex-wrap gap-1">{s.near && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Near expiry</span>}{s.low && <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800">Slow moving</span>}{s.high && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">Best seller</span>}{!s.near && !s.low && !s.high && <span className="text-slate-400">Normal</span>}</div></td><td className="px-4 py-3"><input value={m.note} onChange={e => updateMeta(p, { note: e.target.value })} placeholder="Optional note" className="w-40 rounded-md border border-slate-300 px-2 py-1.5" /></td></tr>; })}</tbody></table></div>}
        </section>
        <p className="text-xs leading-5 text-slate-500">Important: expiry dates, sales figures, and notes are saved in MongoDB and can be shared across devices using this same app. Sales figures are still entered manually; automatic platform sales require marketplace/order report integration. The export is UTF-8 CSV that opens in Microsoft Excel.</p>
      </div>
    </main>
  );
}
