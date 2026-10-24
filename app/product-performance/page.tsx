"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/components/LanguageProvider";
import ExcelJS from "exceljs";

type Platform = "Snoonu" | "Talabat" | "Rafeeq" | "Keeta";
type SalesEntry = { date: string; platform: Platform; units: number };
type Product = {
  _id: string; sku?: string; barcode?: string; nameEn?: string; nameAr?: string;
  categoryEn?: string; categoryAr?: string; stock?: number; price?: number;
  active?: boolean; image?: string; imageUrl?: string; imageURL?: string; photo?: string;
  thumbnail?: string; productImage?: string; expiryDate?: string; expirationDate?: string; bestBefore?: string;
};
type ProductMeta = {
  expiryDate: string; salesEntries: SalesEntry[]; note: string; starred: boolean;
  promotions: Record<Platform, boolean>; promotionDiscount: Record<Platform, string>;
  promotionNote: Record<Platform, string>;
};
type SavedAnalysis = { _id: string; title: string; periodType: "daily" | "monthly"; period: string; createdAt: string; counts?: Record<string, number> };
type Tab = "all" | "starred" | "slow" | "best" | "expiry" | "promotion";
const PLATFORMS: Platform[] = ["Snoonu", "Talabat", "Rafeeq", "Keeta"];
const blankPlatformRecord = <T,>(value: T): Record<Platform, T> => ({ Snoonu: value, Talabat: value, Rafeeq: value, Keeta: value });
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const monthNow = () => today().slice(0, 7);
const blankMeta = (p?: Product): ProductMeta => ({
  expiryDate: (p?.expiryDate || p?.expirationDate || p?.bestBefore || "").slice(0,10),
  salesEntries: [], note: "", starred: false, promotions: blankPlatformRecord(false),
  promotionDiscount: blankPlatformRecord(""), promotionNote: blankPlatformRecord(""),
});
const imageOf = (p: Product) => p.imageUrl || p.imageURL || p.image || p.productImage || p.photo || p.thumbnail || "";
const safeNum = (v: unknown) => Math.max(0, Number(v) || 0);
const daysUntil = (value: string) => { if (!value) return null; const a = new Date(`${value}T00:00:00`); const b = new Date(`${today()}T00:00:00`); return Number.isNaN(a.getTime()) ? null : Math.ceil((a.getTime()-b.getTime())/86400000); };

export default function ProductPerformancePage() {
  const { isArabic } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<Record<string, ProductMeta>>({});
  const [tab, setTab] = useState<Tab>("all");
  const [platform, setPlatform] = useState<Platform | "All">("All");
  const [periodType, setPeriodType] = useState<"daily" | "monthly">("daily");
  const [period, setPeriod] = useState(today());
  const [salesDate, setSalesDate] = useState(today());
  const [search, setSearch] = useState("");
  const [lowLimit, setLowLimit] = useState("5");
  const [bestLimit, setBestLimit] = useState("20");
  const [expiryDays, setExpiryDays] = useState("45");
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const tx = useCallback((en: string, ar: string) => isArabic ? ar : en, [isArabic]);
  const activePeriod = periodType === "daily" ? period : period.slice(0,7);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pr, mr] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/product-performance", { cache: "no-store" }),
        ]);
        const pd = await pr.json(); const md = await mr.json();
        if (!pr.ok) throw new Error(pd?.error || "Could not load products");
        if (!mr.ok) throw new Error(md?.error || "Could not load performance data");
        if (cancelled) return;
        const rows = Array.isArray(pd) ? pd : Array.isArray(pd?.products) ? pd.products : Array.isArray(pd?.data) ? pd.data : [];
        setProducts(rows);
        const saved = md?.data && typeof md.data === "object" ? md.data : {};
        const normalized: Record<string, ProductMeta> = {};
        for (const p of rows as Product[]) {
          const old = saved[p._id] || {};
          normalized[p._id] = {
            ...blankMeta(p), ...old,
            salesEntries: Array.isArray(old.salesEntries) ? old.salesEntries : legacySales(old.salesByPlatform),
            promotions: { ...blankPlatformRecord(false), ...(old.promotions || {}) },
            promotionDiscount: { ...blankPlatformRecord(""), ...(old.promotionDiscount || {}) },
            promotionNote: { ...blankPlatformRecord(""), ...(old.promotionNote || {}) },
          };
        }
        setMeta(normalized);
        setAnalyses(Array.isArray(md?.analyses) ? md.analyses : []);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load data"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  function legacySales(value: Record<string, string> | undefined): SalesEntry[] {
    if (!value) return [];
    return PLATFORMS.filter(p => safeNum(value[p]) > 0).map(p => ({ date: today(), platform: p, units: safeNum(value[p]) }));
  }
  const getMeta = (p: Product) => meta[p._id] || blankMeta(p);
  const updateMeta = (p: Product, patch: Partial<ProductMeta>) => setMeta(cur => ({ ...cur, [p._id]: { ...blankMeta(p), ...cur[p._id], ...patch } }));
  const unitsFor = (p: Product, selectedPlatform: Platform | "All" = platform) => getMeta(p).salesEntries
    .filter(s => (periodType === "daily" ? s.date === activePeriod : s.date.startsWith(activePeriod)) && (selectedPlatform === "All" || s.platform === selectedPlatform))
    .reduce((sum, s) => sum + safeNum(s.units), 0);
  const status = (p: Product) => {
    const m = getMeta(p); const days = daysUntil(m.expiryDate); const units = unitsFor(p);
    return { days, units, slow: units <= safeNum(lowLimit), best: units >= safeNum(bestLimit), expiry: days !== null && days >= 0 && days <= safeNum(expiryDays), expired: days !== null && days < 0 };
  };
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (p.active === false) return false;
      const m = meta[p._id] || blankMeta(p); const s = status(p);
      if (q && !`${p.nameEn || ""} ${p.nameAr || ""} ${p.sku || ""} ${p.barcode || ""}`.toLowerCase().includes(q)) return false;
      if (tab === "starred") return m.starred;
      if (tab === "slow") return s.slow;
      if (tab === "best") return s.best;
      if (tab === "expiry") return s.expiry || s.expired;
      if (tab === "promotion") return platform === "All" ? PLATFORMS.some(k => m.promotions[k]) : m.promotions[platform];
      return true;
    }).sort((a,b) => tab === "slow" ? unitsFor(a)-unitsFor(b) : tab === "best" ? unitsFor(b)-unitsFor(a) : (a.nameEn || a.nameAr || "").localeCompare(b.nameEn || b.nameAr || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, meta, tab, platform, periodType, activePeriod, search, lowLimit, bestLimit, expiryDays]);

  async function saveAll() {
    setSaving(true); setMessage(""); setError("");
    try {
      const items = Object.entries(meta).map(([productId, m]) => ({ productId, ...m }));
      const response = await fetch("/api/product-performance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
      const result = await response.json(); if (!response.ok) throw new Error(result?.error || "Save failed");
      setMessage(tx("All changes saved to database.", "تم حفظ جميع التغييرات في قاعدة البيانات."));
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }
  async function saveAnalysis() {
    setSaving(true); setMessage(""); setError("");
    try {
      const counts = { all: products.filter(p=>p.active!==false).length, starred: products.filter(p=>p.active!==false&&getMeta(p).starred).length, slow: products.filter(p=>p.active!==false&&status(p).slow).length, best: products.filter(p=>p.active!==false&&status(p).best).length, expiry: products.filter(p=>p.active!==false&&(status(p).expiry||status(p).expired)).length, promotion: products.filter(p=>p.active!==false&&PLATFORMS.some(k=>getMeta(p).promotions[k])).length };
      const response = await fetch("/api/product-performance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-analysis", title: `${periodType === "daily" ? tx("Daily", "يومي") : tx("Monthly", "شهري")} ${activePeriod}`, periodType, period: activePeriod, counts }) });
      const result = await response.json(); if (!response.ok) throw new Error(result?.error || "Could not save analysis");
      setAnalyses(current => [result.analysis, ...current]); setMessage(tx("Analysis snapshot saved.", "تم حفظ نسخة التحليل."));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save analysis"); }
    finally { setSaving(false); }
  }

  async function exportExcel() {
    const workbook = new ExcelJS.Workbook(); workbook.creator = "MAZAJ CONTROL";
    const ws = workbook.addWorksheet(tabName(tab), { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [ {header: tx("Image", "الصورة"), key:"image", width:14}, {header:tx("Product (English)","المنتج (إنجليزي)"),key:"nameEn",width:28}, {header:tx("Product (Arabic)","المنتج (عربي)"),key:"nameAr",width:28}, {header:tx("SKU / Barcode","رمز المنتج / باركود"),key:"sku",width:20}, {header:tx("Category","الفئة"),key:"category",width:22}, {header:tx("Stock","المخزون"),key:"stock",width:12}, {header:tx("Expiry date","تاريخ الانتهاء"),key:"expiry",width:16}, {header:tx("Units sold in selected period","الوحدات المباعة في الفترة"),key:"units",width:18}, {header:tx("Promotion platforms","منصات الترويج"),key:"promotions",width:28}, {header:tx("Discount %","الخصم %"),key:"discount",width:14}, {header:tx("Notes","ملاحظات"),key:"note",width:30} ];
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; ws.getRow(1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF0F766E"} }; ws.getRow(1).height = 24;
    for (const p of visible) {
      const m = getMeta(p); const promoted = PLATFORMS.filter(k=>m.promotions[k]);
      const discounts = promoted.map(k=>`${k}: ${m.promotionDiscount[k] || "—"}`).join(" | ");
      const row = ws.addRow({ nameEn:p.nameEn || "", nameAr:p.nameAr || "", sku:p.sku || p.barcode || "", category:p.categoryEn || p.categoryAr || "", stock:p.stock ?? "", expiry:m.expiryDate, units:unitsFor(p), promotions:promoted.join(", "), discount:discounts, note:m.note });
      row.height = 58; row.alignment = { vertical:"middle", wrapText:true };
      const src = imageOf(p);
      if (src) { try { const response = await fetch(src); if (response.ok) { const blob = await response.blob(); const dataUrl = await blobToDataUrl(blob); const ext = blob.type.includes("png") ? "png" : "jpeg"; const imageId = workbook.addImage({ base64:dataUrl, extension:ext }); const imageAnchor = { tl: { col:0, row:row.number-1, nativeCol:0, nativeColOff:0, nativeRow:0, nativeRowOff:0, nativeX:0, nativeY:0 }, br: { col:1, row:row.number, nativeCol:1, nativeColOff:0, nativeRow:row.number, nativeRowOff:0, nativeX:0, nativeY:0 } } as any; ws.addImage(imageId, imageAnchor); } } catch { /* image may be blocked by cross-origin policy; row data still exports */ } }
    }
    ws.autoFilter = { from: "A1", to: `K${Math.max(1, visible.length+1)}` };
    const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=`mazaj-${tab}-${platform.toLowerCase()}-${activePeriod}.xlsx`; a.click(); URL.revokeObjectURL(url);
  }
  function tabName(t: Tab) { return ({ all:tx("All Products","كل المنتجات"), starred:tx("Star Products","المنتجات المميزة"), slow:tx("Low Running","الأصناف بطيئة الحركة"), best:tx("Best Running","الأصناف الأكثر مبيعاً"), expiry:tx("Expiry List","قائمة الصلاحية"), promotion:tx("Promotions","العروض الترويجية") } as Record<Tab,string>)[t]; }
  async function printList() { window.print(); }
  function changeSales(p: Product, value: string) {
    const m = getMeta(p); const date = periodType === "daily" ? activePeriod : salesDate;
    const salesPlatform = platform === "All" ? "Snoonu" : platform;
    const rest = m.salesEntries.filter(s => !(s.date === date && s.platform === salesPlatform));
    if (value !== "") rest.push({ date, platform:salesPlatform, units:safeNum(value) });
    updateMeta(p, { salesEntries:rest });
  }
  const tabDefs: {key:Tab;en:string;ar:string}[] = [ {key:"all",en:"All products",ar:"كل المنتجات"}, {key:"starred",en:"Star / Steady products",ar:"المنتجات المميزة / الثابتة"}, {key:"slow",en:"Low running",ar:"الأصناف بطيئة الحركة"}, {key:"best",en:"Best running",ar:"الأصناف الأكثر مبيعاً"}, {key:"expiry",en:"Near expiry",ar:"قريبة الانتهاء"}, {key:"promotion",en:"Promotion list",ar:"قائمة العروض"} ];

  return <main dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6">
    <div className="mx-auto max-w-[1600px] space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">MAZAJ CONTROL</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{tx("Product Performance", "أداء المنتجات")}</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">{tx("Daily and monthly product analysis, separate lists, promotion planning, Excel export and printing.", "تحليل يومي وشهري للمنتجات، وقوائم منفصلة، وتخطيط العروض، وتصدير Excel والطباعة.")}</p></div>
        <div className="flex flex-wrap gap-2 print:hidden"><button onClick={saveAll} disabled={saving} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? tx("Saving…","جارٍ الحفظ…") : tx("Save changes","حفظ التغييرات")}</button><button onClick={saveAnalysis} disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{tx("Save analysis snapshot","حفظ التحليل")}</button><button onClick={exportExcel} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">{tx("Export Excel (.xlsx)","تصدير Excel (.xlsx)")}</button><button onClick={printList} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">{tx("Print list","طباعة القائمة")}</button></div>
      </header>
      {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 print:hidden">{message}</p>}{error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 print:hidden">{error}</p>}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{tabDefs.map(d=>{const count=products.filter(p=>p.active!==false&&((d.key==="all")||(d.key==="starred"&&getMeta(p).starred)||(d.key==="slow"&&status(p).slow)||(d.key==="best"&&status(p).best)||(d.key==="expiry"&&(status(p).expiry||status(p).expired))||(d.key==="promotion"&&PLATFORMS.some(k=>getMeta(p).promotions[k])))).length; return <button key={d.key} onClick={()=>setTab(d.key)} className={`rounded-2xl border p-4 text-start shadow-sm ${tab===d.key?"border-teal-600 bg-teal-50 ring-2 ring-teal-100":"border-slate-200 bg-white"}`}><p className="text-xs font-semibold text-slate-500">{tx(d.en,d.ar)}</p><p className="mt-2 text-3xl font-black">{count}</p></button>;})}</section>
      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5 print:hidden">
        <label className="text-sm font-bold">{tx("Analysis period","فترة التحليل")}<select value={periodType} onChange={e=>{const v=e.target.value as "daily"|"monthly";setPeriodType(v);setPeriod(v==="daily"?today():monthNow());setSalesDate(today());}} className="mt-2 w-full rounded-lg border border-slate-300 p-2.5 font-normal"><option value="daily">{tx("Daily","يومي")}</option><option value="monthly">{tx("Monthly","شهري")}</option></select></label>
        <label className="text-sm font-bold">{tx("Date / Month","التاريخ / الشهر")}<input type={periodType==="daily"?"date":"month"} value={periodType==="daily"?period:period.slice(0,7)} onChange={e=>{setPeriod(e.target.value);if(periodType==="daily")setSalesDate(e.target.value);else setSalesDate(`${e.target.value}-${today().slice(8,10)}`);}} className="mt-2 w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
        {periodType==="monthly" && <label className="text-sm font-bold">{tx("Sales entry date","تاريخ إدخال المبيعات")}<input type="date" min={`${activePeriod}-01`} max={`${activePeriod}-31`} value={salesDate} onChange={e=>setSalesDate(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>}
        <label className="text-sm font-bold">{tx("Platform","المنصة")}<select value={platform} onChange={e=>setPlatform(e.target.value as Platform|"All")} className="mt-2 w-full rounded-lg border border-slate-300 p-2.5 font-normal"><option value="All">{tx("All platforms","جميع المنصات")}</option>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></label>
        <label className="text-sm font-bold">{tx("Search product","البحث عن منتج")}<input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tx("Name, Arabic name, SKU","الاسم أو الرمز")} className="mt-2 w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
        <div className="grid grid-cols-3 gap-2"><label className="text-xs font-bold">{tx("Low ≤","ضعيف ≤")}<input type="number" min="0" value={lowLimit} onChange={e=>setLowLimit(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-2 font-normal" /></label><label className="text-xs font-bold">{tx("Best ≥","ممتاز ≥")}<input type="number" min="0" value={bestLimit} onChange={e=>setBestLimit(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-2 font-normal" /></label><label className="text-xs font-bold">{tx("Expiry days","أيام الصلاحية")}<input type="number" min="0" value={expiryDays} onChange={e=>setExpiryDays(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-2 font-normal" /></label></div>
      </section>
      <div className="flex flex-wrap gap-2 print:hidden">{tabDefs.map(d=><button key={d.key} onClick={()=>setTab(d.key)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab===d.key?"bg-slate-900 text-white":"border border-slate-300 bg-white"}`}>{tx(d.en,d.ar)}</button>)}</div>
      {tab==="promotion" && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden"><h2 className="font-black">{tx("Promotion planning by app","تخطيط العروض حسب التطبيق")}</h2><p className="mt-1 text-sm text-slate-500">{tx("Tick the apps where each product should be promoted. Filter by platform above, then export or print that separate list.","حدد التطبيقات التي تريد الترويج فيها لكل منتج. اختر المنصة أعلاه ثم صدّر أو اطبع القائمة المنفصلة.")}</p></section>}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="font-black">{tabName(tab)} — {activePeriod}</h2><span className="text-sm text-slate-500">{visible.length} {tx("products","منتج")}</span></div>
        {loading ? <p className="p-10 text-center">{tx("Loading products…","جارٍ تحميل المنتجات…")}</p> : visible.length===0 ? <p className="p-10 text-center text-slate-500">{tx("No products in this list for the selected period.","لا توجد منتجات في هذه القائمة خلال الفترة المحددة.")}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1450px] text-sm"><thead className="bg-slate-100 text-xs text-slate-600"><tr>{[tx("Product","المنتج"),tx("SKU / Stock","الرمز / المخزون"),tx("Expiry","الصلاحية"),tx("Units sold","الوحدات المباعة"),tx("Sales entry","إدخال المبيعات"),tx("Star","مميز"),tx("Promote on apps","الترويج عبر التطبيقات"),tx("Discount %","الخصم %"),tx("Promotion note","ملاحظة العرض"),tx("Notes","ملاحظات")].map(h=><th key={h} className="px-3 py-3 text-start">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visible.map(p=>{const m=getMeta(p);const s=status(p);const src=imageOf(p);const activeSalesDate=periodType==="daily"?activePeriod:salesDate;const selectedSales=m.salesEntries.find(e=>e.date===activeSalesDate&&e.platform===(platform==="All"?"Snoonu":platform));return <tr key={p._id} className="align-top hover:bg-slate-50"><td className="px-3 py-3"><div className="flex items-start gap-3">{src?<img src={src} alt={p.nameEn||p.nameAr||"Product"} className="h-16 w-16 rounded-lg border border-slate-200 bg-white object-contain" onError={e=>{e.currentTarget.style.display="none";}}/>:<div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400">{tx("No image","لا صورة")}</div>}<div className="min-w-48"><p className="font-bold">{p.nameEn||p.nameAr||tx("Unnamed product","منتج بلا اسم")}</p>{p.nameAr&&<p className="mt-1 text-xs text-slate-500" dir="rtl">{p.nameAr}</p>}<p className="mt-1 text-xs text-slate-400">{p.categoryEn||p.categoryAr||""}</p><p className={`mt-1 text-xs font-bold ${s.expired?"text-rose-700":s.expiry?"text-amber-700":s.slow?"text-orange-700":s.best?"text-emerald-700":"text-slate-400"}`}>{s.expired?tx("Expired","منتهي الصلاحية"):s.expiry?tx("Near expiry","قريب الانتهاء"):s.slow?tx("Low running","بطيء الحركة"):s.best?tx("Best running","الأكثر مبيعاً"):""}</p></div></div></td>
          <td className="px-3 py-3">{p.sku||p.barcode||"—"}<p className="mt-1 text-xs text-slate-500">{tx("Stock","المخزون")}: {p.stock??"—"}</p></td>
          <td className="px-3 py-3"><input type="date" value={m.expiryDate} onChange={e=>updateMeta(p,{expiryDate:e.target.value})} className="rounded-md border border-slate-300 p-1.5"/><p className="mt-1 text-xs text-slate-500">{s.days===null?"—":`${s.days} ${tx("days","يوم")}`}</p></td>
          <td className="px-3 py-3 font-black">{s.units}</td>
          <td className="px-3 py-3"><div className="text-xs text-slate-500">{tx("Date","التاريخ")}: {activeSalesDate}</div><input aria-label="Units sold" type="number" min="0" value={selectedSales?.units??""} disabled={platform==="All"} onChange={e=>changeSales(p,e.target.value)} className="mt-1 w-28 rounded-md border border-slate-300 p-1.5 disabled:bg-slate-100"/><p className="mt-1 text-[11px] text-slate-500">{tx("Platform","المنصة")}: {platform==="All"?"Snoonu":platform}</p>{platform==="All"&&<p className="text-[10px] text-amber-700">{tx("Select a platform to enter other app sales.","اختر منصة لإدخال مبيعات التطبيقات الأخرى.")}</p>}</td>
          <td className="px-3 py-3"><label className="flex items-center gap-2"><input type="checkbox" checked={m.starred} onChange={e=>updateMeta(p,{starred:e.target.checked})}/><span>{tx("Star","مميز")}</span></label></td>
          <td className="px-3 py-3"><div className="space-y-1.5">{PLATFORMS.map(k=><label key={k} className="flex items-center gap-2"><input type="checkbox" checked={m.promotions[k]} onChange={e=>updateMeta(p,{promotions:{...m.promotions,[k]:e.target.checked}})}/><span>{k}</span></label>)}</div></td>
          <td className="px-3 py-3"><div className="space-y-1">{PLATFORMS.filter(k=>platform==="All"||platform===k).map(k=><label key={k} className="flex items-center gap-1 text-xs"><span>{k}</span><input type="number" min="0" max="100" value={m.promotionDiscount[k]} onChange={e=>updateMeta(p,{promotionDiscount:{...m.promotionDiscount,[k]:e.target.value}})} className="w-16 rounded border border-slate-300 p-1"/></label>)}</div></td>
          <td className="px-3 py-3"><div className="space-y-1">{PLATFORMS.filter(k=>m.promotions[k]&&(platform==="All"||platform===k)).map(k=><label key={k} className="block text-xs">{k}<input value={m.promotionNote[k]} onChange={e=>updateMeta(p,{promotionNote:{...m.promotionNote,[k]:e.target.value}})} placeholder={tx("Campaign / offer note","ملاحظة الحملة / العرض")} className="mt-1 w-44 rounded border border-slate-300 p-1.5"/></label>)}</div></td>
          <td className="px-3 py-3"><textarea value={m.note} onChange={e=>updateMeta(p,{note:e.target.value})} rows={2} className="w-44 rounded-md border border-slate-300 p-2" placeholder={tx("Notes","ملاحظات")}/></td>
        </tr>;})}</tbody></table></div>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden"><h2 className="font-black">{tx("Saved daily / monthly analyses","التحليلات اليومية / الشهرية المحفوظة")}</h2>{analyses.length===0?<p className="mt-2 text-sm text-slate-500">{tx("No saved snapshots yet. Click Save analysis snapshot to save this period's summary.","لا توجد تحليلات محفوظة بعد. اضغط حفظ التحليل لحفظ ملخص هذه الفترة.")}</p>:<div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-start text-slate-500"><th className="p-2 text-start">{tx("Period","الفترة")}</th><th className="p-2 text-start">{tx("Type","النوع")}</th><th className="p-2 text-start">{tx("Saved at","وقت الحفظ")}</th><th className="p-2 text-start">{tx("Products","المنتجات")}</th></tr></thead><tbody>{analyses.map(a=><tr key={a._id} className="border-t border-slate-100"><td className="p-2">{a.period}</td><td className="p-2">{a.periodType==="daily"?tx("Daily","يومي"):tx("Monthly","شهري")}</td><td className="p-2">{a.createdAt?new Date(a.createdAt).toLocaleString(isArabic?"ar-QA":"en-GB"):"—"}</td><td className="p-2">{a.counts?.all??"—"}</td></tr>)}</tbody></table></div>}</section>
      <p className="text-xs leading-5 text-slate-500 print:hidden">{tx("Sales are entered manually per date and app unless an existing marketplace integration is added. Save changes to persist product data in MongoDB. Excel export creates a real .xlsx workbook; product images are embedded when the image server permits browser access.","يتم إدخال المبيعات يدوياً حسب التاريخ والتطبيق ما لم تتم إضافة تكامل مع منصة البيع. احفظ التغييرات لتخزين البيانات في MongoDB. يصدر Excel ملف .xlsx حقيقياً وتُضمّن الصور إذا سمح خادم الصور بالوصول من المتصفح.")}</p>
    </div>
    <style jsx global>{`@media print { body { background:white!important; } aside, nav, button, input, select, textarea, .print\\:hidden { display:none!important; } main { padding:0!important; background:white!important; } section { break-inside:avoid; box-shadow:none!important; } table { min-width:0!important; font-size:9px!important; } img { max-width:48px!important; max-height:48px!important; } th,td { padding:4px!important; } }`}</style>
  </main>;
}

function blobToDataUrl(blob: Blob): Promise<string> { return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(String(reader.result)); reader.onerror=reject; reader.readAsDataURL(blob); }); }
