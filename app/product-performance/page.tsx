"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/components/LanguageProvider";
import ExcelJS from "exceljs";

type Platform = "Snoonu" | "Talabat" | "Rafeeq" | "Keeta";
type Product = {
  _id: string; sku?: string; barcode?: string; nameEn?: string; nameAr?: string;
  categoryEn?: string; categoryAr?: string; category?: string; active?: boolean;
  image?: string; imageUrl?: string; imageURL?: string; photo?: string;
  thumbnail?: string; productImage?: string; expiryDate?: string;
  expirationDate?: string; bestBefore?: string;
};
type ProductMeta = {
  expiryDate: string; rating: number; note: string;
  promotions: Record<Platform, boolean>;
  promotionDiscount: Record<Platform, string>;
  promotionNote: Record<Platform, string>;
};
type SavedAnalysis = { _id: string; title: string; periodType: "daily" | "monthly"; period: string; createdAt: string; counts?: Record<string, number> };
type Tab = "all" | "starred" | "slow" | "steady" | "best" | "expiry" | "promotion";
const PLATFORMS: Platform[] = ["Snoonu", "Talabat", "Rafeeq", "Keeta"];
const blankPlatforms = <T,>(value: T): Record<Platform, T> => ({ Snoonu: value, Talabat: value, Rafeeq: value, Keeta: value });
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const blankMeta = (p?: Product): ProductMeta => ({
  expiryDate: (p?.expiryDate || p?.expirationDate || p?.bestBefore || "").slice(0,10),
  rating: 0, note: "", promotions: blankPlatforms(false),
  promotionDiscount: blankPlatforms(""), promotionNote: blankPlatforms(""),
});
const imageOf = (p: Product) => p.imageUrl || p.imageURL || p.image || p.productImage || p.photo || p.thumbnail || "";
const daysUntil = (value: string) => {
  if (!value) return null;
  const a = new Date(`${value}T00:00:00`), b = new Date(`${today()}T00:00:00`);
  return Number.isNaN(a.getTime()) ? null : Math.ceil((a.getTime()-b.getTime())/86400000);
};
const categoryOf = (p: Product, arabic: boolean) => arabic
  ? (p.categoryAr || p.categoryEn || p.category || "")
  : (p.categoryEn || p.category || p.categoryAr || "");
const tabLabel = (tab: Tab, tx: (en:string,ar:string)=>string) => ({
  all: tx("All products","كل المنتجات"), starred: tx("Starred","المميزة"),
  slow: tx("Low running (1–2★)","ضعيفة الحركة (١–٢★)"),
  steady: tx("Steady (3★)","متوسطة الحركة (٣★)"),
  best: tx("Best running (4–5★)","الأفضل حركة (٤–٥★)"),
  expiry: tx("Near expiry / expired","قريبة / منتهية الصلاحية"),
  promotion: tx("Promotions","العروض"),
}[tab]);
const stars = (rating: number) => "★".repeat(Math.max(0, Math.min(5, rating))) + "☆".repeat(5 - Math.max(0, Math.min(5, rating)));

export default function ProductPerformancePage() {
  const { isArabic } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<Record<string, ProductMeta>>({});
  const [tab, setTab] = useState<Tab>("all");
  const [platform, setPlatform] = useState<Platform | "All">("All");
  const [periodType, setPeriodType] = useState<"daily" | "monthly">("daily");
  const [period, setPeriod] = useState(today());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
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
        const pd = await pr.json(), md = await mr.json();
        if (!pr.ok) throw new Error(pd?.error || "Could not load products");
        if (!mr.ok) throw new Error(md?.error || "Could not load product performance");
        if (cancelled) return;
        const rows: Product[] = Array.isArray(pd) ? pd : Array.isArray(pd?.products) ? pd.products : Array.isArray(pd?.data) ? pd.data : [];
        setProducts(rows);
        const saved = md?.data && typeof md.data === "object" ? md.data : {};
        const normalized: Record<string, ProductMeta> = {};
        for (const p of rows) {
          const old = saved[p._id] || {};
          normalized[p._id] = {
            ...blankMeta(p), ...old,
            rating: Math.max(0, Math.min(5, Number(old.rating ?? (old.starred ? 5 : 0)) || 0)),
            promotions: { ...blankPlatforms(false), ...(old.promotions || {}) },
            promotionDiscount: { ...blankPlatforms(""), ...(old.promotionDiscount || {}) },
            promotionNote: { ...blankPlatforms(""), ...(old.promotionNote || {}) },
          };
        }
        setMeta(normalized);
        setAnalyses(Array.isArray(md?.analyses) ? md.analyses : []);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load data"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const getMeta = (p: Product) => meta[p._id] || blankMeta(p);
  const updateMeta = (p: Product, patch: Partial<ProductMeta>) =>
    setMeta(cur => ({ ...cur, [p._id]: { ...blankMeta(p), ...cur[p._id], ...patch } }));
  const expiryStatus = (p: Product) => {
    const days = daysUntil(getMeta(p).expiryDate);
    return { days, near: days !== null && days >= 0 && days <= Number(expiryDays || 0), expired: days !== null && days < 0 };
  };

  const categories = useMemo(() => {
    const vals = products.map(p => categoryOf(p, isArabic).trim()).filter(Boolean);
    return [...new Set(vals)].sort((a,b)=>a.localeCompare(b));
  }, [products, isArabic]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (p.active === false) return false;
      const m = meta[p._id] || blankMeta(p), rating = Number(m.rating || 0), ex = expiryStatus(p);
      const name = `${p.nameEn || ""} ${p.nameAr || ""} ${p.sku || ""} ${p.barcode || ""}`.toLowerCase();
      if (q && !name.includes(q)) return false;
      if (category !== "All" && categoryOf(p, isArabic).trim() !== category) return false;
      if (tab === "starred") return rating > 0;
      if (tab === "slow") return rating >= 1 && rating <= 2;
      if (tab === "steady") return rating === 3;
      if (tab === "best") return rating >= 4 && rating <= 5;
      if (tab === "expiry") return ex.near || ex.expired;
      if (tab === "promotion") return platform === "All" ? PLATFORMS.some(k => m.promotions[k]) : m.promotions[platform];
      return true;
    }).sort((a,b) => {
      if (tab === "slow") return (meta[a._id]?.rating || 0) - (meta[b._id]?.rating || 0);
      if (tab === "best") return (meta[b._id]?.rating || 0) - (meta[a._id]?.rating || 0);
      if (tab === "expiry") return (daysUntil(meta[a._id]?.expiryDate || "") ?? 99999) - (daysUntil(meta[b._id]?.expiryDate || "") ?? 99999);
      return (a.nameEn || a.nameAr || "").localeCompare(b.nameEn || b.nameAr || "");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, meta, tab, platform, search, category, isArabic, expiryDays]);

  async function saveAll() {
    setSaving(true); setMessage(""); setError("");
    try {
      const items = Object.entries(meta).map(([productId, m]) => ({ productId, ...m }));
      const response = await fetch("/api/product-performance", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({items}) });
      const result = await response.json(); if (!response.ok) throw new Error(result?.error || "Save failed");
      setMessage(tx("All changes saved to MongoDB.","تم حفظ جميع التغييرات في قاعدة البيانات."));
    } catch(e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function saveAnalysis() {
    setSaving(true); setMessage(""); setError("");
    try {
      const active = products.filter(p => p.active !== false);
      const counts = {
        all: active.length,
        starred: active.filter(p => (meta[p._id]?.rating || 0) > 0).length,
        slow: active.filter(p => [1,2].includes(meta[p._id]?.rating || 0)).length,
        steady: active.filter(p => (meta[p._id]?.rating || 0) === 3).length,
        best: active.filter(p => (meta[p._id]?.rating || 0) >= 4).length,
        expiry: active.filter(p => { const d = daysUntil(meta[p._id]?.expiryDate || ""); return d !== null && d <= Number(expiryDays || 0); }).length,
        promotion: active.filter(p => PLATFORMS.some(k => meta[p._id]?.promotions?.[k])).length,
      };
      const response = await fetch("/api/product-performance", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"save-analysis", title:`${periodType === "daily" ? tx("Daily","يومي") : tx("Monthly","شهري")} ${activePeriod}`, periodType, period:activePeriod, counts}) });
      const result = await response.json(); if (!response.ok) throw new Error(result?.error || "Could not save analysis");
      setAnalyses(current => [result.analysis, ...current]);
      setMessage(tx("Analysis snapshot saved.","تم حفظ نسخة التحليل."));
    } catch(e) { setError(e instanceof Error ? e.message : "Could not save analysis"); }
    finally { setSaving(false); }
  }

  async function exportExcel() {
    setError(""); setMessage("");
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "MAZAJ CONTROL";
      const ws = workbook.addWorksheet(tabLabel(tab, tx).slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
      ws.columns = [
        { header: tx("Product (English)", "المنتج (إنجليزي)"), key: "nameEn", width: 28 },
        { header: tx("Product (Arabic)", "المنتج (عربي)"), key: "nameAr", width: 28 },
        { header: tx("SKU / Barcode", "رمز المنتج / باركود"), key: "sku", width: 20 },
        { header: tx("Category", "الفئة"), key: "category", width: 22 },
        { header: tx("Employer rating (1–5 stars)", "تقييم الموظف (١–٥ نجوم)"), key: "rating", width: 24 },
        { header: tx("Expiry date", "تاريخ الانتهاء"), key: "expiry", width: 16 },
        { header: tx("Promotion platforms", "منصات العروض"), key: "platforms", width: 30 },
        { header: tx("Notes", "ملاحظات"), key: "note", width: 32 },
      ];
      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14532D" } };
      for (const p of visible) {
        const m = getMeta(p);
        ws.addRow({
          nameEn: p.nameEn || "", nameAr: p.nameAr || "", sku: p.sku || p.barcode || "",
          category: categoryOf(p, isArabic), rating: m.rating ? `${m.rating}/5 ${stars(m.rating)}` : "",
          expiry: m.expiryDate || "", platforms: PLATFORMS.filter(k => m.promotions[k]).join(", "), note: m.note || "",
        });
      }
      if (visible.length === 0) {
        ws.addRow({ nameEn: tx("No products in this list", "لا توجد منتجات في هذه القائمة") });
      }
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `product-performance-${tab}-${activePeriod}.xlsx`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Do not revoke the object URL immediately; some browsers cancel the download.
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setMessage(tx("Excel file is being downloaded.", "جارٍ تنزيل ملف Excel."));
    } catch (e) {
      console.error("Excel export failed:", e);
      setError(tx("Excel export failed. Make sure exceljs is installed (npm install exceljs), then restart the dev server.", "فشل تصدير Excel. تأكد من تثبيت exceljs عبر npm install exceljs ثم أعد تشغيل الخادم."));
    }
  }

  return <main dir={isArabic?"rtl":"ltr"} className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6">
    <div className="mx-auto max-w-[1600px] space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div><p className="text-sm font-bold uppercase tracking-wide text-emerald-700">MAZAJ CONTROL</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{tx("Product Performance","أداء المنتجات")}</h1><p className="mt-2 text-sm text-slate-600">{tx("Rate products yourself from 1 to 5 stars. Low / best running lists are based on your rating, not sales or stock figures.","قيّم المنتجات بنفسك من نجمة إلى خمس نجوم. قوائم الحركة تعتمد على تقييمك وليس على المبيعات أو المخزون.")}</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={saveAll} disabled={saving} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving?tx("Saving…","جارٍ الحفظ…"):tx("Save changes","حفظ التغييرات")}</button><button onClick={saveAnalysis} disabled={saving} className="rounded-xl border border-emerald-700 px-4 py-2.5 text-sm font-bold text-emerald-800 disabled:opacity-50">{tx("Save analysis snapshot","حفظ نسخة التحليل")}</button><button onClick={exportExcel} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">{tx("Export Excel (.xlsx)","تصدير Excel (.xlsx)")}</button><button onClick={()=>window.print()} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">{tx("Print list","طباعة القائمة")}</button></div>
      </header>
      {message&&<p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 print:hidden">{message}</p>}
      {error&&<p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800 print:hidden">{error}</p>}
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5 print:hidden">
        <label className="text-sm font-bold">{tx("Analysis type","نوع التحليل")}<select value={periodType} onChange={e=>{const v=e.target.value as "daily"|"monthly";setPeriodType(v);setPeriod(v==="daily"?today():today().slice(0,7));}} className="mt-2 w-full rounded-lg border border-slate-300 p-2.5 font-normal"><option value="daily">{tx("Daily","يومي")}</option><option value="monthly">{tx("Monthly","شهري")}</option></select></label>
        <label className="text-sm font-bold">{tx("Date / month","التاريخ / الشهر")}<input type={periodType==="daily"?"date":"month"} value={periodType==="daily"?period:period.slice(0,7)} onChange={e=>setPeriod(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-2.5 font-normal"/></label>
        <label className="text-sm font-bold">{tx("Promotion platform","منصة العرض")}<select value={platform} onChange={e=>setPlatform(e.target.value as Platform|"All")} className="mt-2 w-full rounded-lg border border-slate-300 p-2.5 font-normal"><option value="All">{tx("All platforms","كل المنصات")}</option>{PLATFORMS.map(p=><option key={p} value={p}>{p}</option>)}</select></label>
        <label className="text-sm font-bold">{tx("Category","الفئة")}<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-2.5 font-normal"><option value="All">{tx("All categories","كل الفئات")}</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
        <label className="text-sm font-bold">{tx("Search product","البحث عن منتج")}<input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tx("Name, Arabic name, SKU","الاسم أو الرمز")} className="mt-2 w-full rounded-lg border border-slate-300 p-2.5 font-normal"/></label>
        <label className="text-sm font-bold">{tx("Near expiry alert (days)","تنبيه قرب الانتهاء (أيام)")}<input type="number" min="0" value={expiryDays} onChange={e=>setExpiryDays(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-2.5 font-normal"/></label>
      </section>
      <div className="flex flex-wrap gap-2 print:hidden">{(["all","starred","slow","steady","best","expiry","promotion"] as Tab[]).map(t=><button key={t} onClick={()=>setTab(t)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab===t?"bg-slate-900 text-white":"border border-slate-300 bg-white"}`}>{tabLabel(t,tx)}</button>)}</div>
      {tab==="promotion"&&<section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 print:hidden">{tx("Tick each delivery app for products you want to promote. Select one app above to create a separate app-specific list.","حدد تطبيق التوصيل الذي تريد الترويج للمنتج فيه. اختر تطبيقاً واحداً أعلاه لعرض قائمة منفصلة له.")}</section>}
      <div className="hidden print:block print-title"><h1>MAZAJ CONTROL — {tx("Product Performance", "أداء المنتجات")}</h1><p>{tabLabel(tab,tx)} — {activePeriod}{category !== "All" ? ` · ${category}` : ""}</p></div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="font-black">{tabLabel(tab,tx)} — {activePeriod}</h2><span className="text-sm text-slate-500">{visible.length} {tx("products","منتجات")}</span></div>
        {loading?<p className="p-10 text-center">{tx("Loading products…","جارٍ تحميل المنتجات…")}</p>:visible.length===0?<p className="p-10 text-center text-slate-500">{tx("No products match this list and category.","لا توجد منتجات مطابقة لهذه القائمة والفئة.")}</p>:<div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-sm"><thead className="bg-slate-100 text-xs text-slate-600"><tr>{[tx("Product","المنتج"),tx("SKU / Barcode","رمز المنتج / باركود"),tx("Employer rating (1–5)","تقييم الموظف (١–٥)"),tx("Expiry date","تاريخ الانتهاء"),tx("Promote on apps","الترويج عبر التطبيقات"),tx("Discount %","الخصم %"),tx("Promotion note","ملاحظة العرض"),tx("Notes","ملاحظات")].map(h=><th key={h} className="px-3 py-3 text-start">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visible.map(p=>{const m=getMeta(p), ex=expiryStatus(p), src=imageOf(p);return <tr key={p._id} className="align-top hover:bg-slate-50">
          <td className="px-3 py-3"><div className="flex items-start gap-3">{src?<img src={src} alt={p.nameEn||p.nameAr||"Product"} className="h-16 w-16 rounded-lg border border-slate-200 bg-white object-contain" onError={e=>{e.currentTarget.style.display="none";}}/>:<div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400">{tx("No image","لا صورة")}</div>}<div className="min-w-44"><p className="font-bold">{isArabic?(p.nameAr||p.nameEn||"منتج بلا اسم"):(p.nameEn||p.nameAr||"Unnamed product")}</p>{p.nameAr&&p.nameEn&&<p className="mt-1 text-xs text-slate-500" dir={isArabic?"ltr":"rtl"}>{isArabic?p.nameEn:p.nameAr}</p>}<p className="mt-1 text-xs text-slate-400">{categoryOf(p,isArabic)}</p><p className={`mt-1 text-xs font-bold ${ex.expired?"text-rose-700":ex.near?"text-amber-700":m.rating<=2&&m.rating>0?"text-orange-700":m.rating>=4?"text-emerald-700":"text-slate-500"}`}>{ex.expired?tx("Expired","منتهي الصلاحية"):ex.near?tx("Near expiry","قريب الانتهاء"):m.rating>0?`${m.rating}/5 — ${m.rating<=2?tx("Low running","ضعيف الحركة"):m.rating===3?tx("Steady","متوسط الحركة"):tx("Best running","أفضل حركة")}`:tx("Not rated","لم يتم التقييم")}</p></div></div></td>
          <td className="px-3 py-3">{p.sku||p.barcode||"—"}</td>
          <td className="px-3 py-3"><div className="flex flex-col gap-2"><div className="flex gap-0.5" role="group" aria-label={tx("Set product rating","تقييم المنتج")}>{[1,2,3,4,5].map(n=><button key={n} type="button" title={`${n}/5`} onClick={()=>updateMeta(p,{rating:n})} className={`text-xl leading-7 ${m.rating>=n?"text-amber-500":"text-slate-300"} hover:scale-110`} aria-label={`${n} ${tx("stars","نجوم")}`}>★</button>)}<button type="button" title={tx("Clear rating","مسح التقييم")} onClick={()=>updateMeta(p,{rating:0})} className="ms-2 text-xs text-slate-500">{tx("Clear","مسح")}</button></div><span className="text-xs text-slate-500">{m.rating?`${m.rating}/5 ${stars(m.rating)}`:tx("Choose 1–5 stars","اختر من ١ إلى ٥ نجوم")}</span></div></td>
          <td className="px-3 py-3"><input type="date" value={m.expiryDate} onChange={e=>updateMeta(p,{expiryDate:e.target.value})} className="rounded-md border border-slate-300 p-1.5"/><p className="mt-1 text-xs text-slate-500">{ex.days===null?"—":ex.days<0?`${Math.abs(ex.days)} ${tx("days overdue","أيام بعد الانتهاء")}`:`${ex.days} ${tx("days left","يوم متبقٍ")}`}</p></td>
          <td className="px-3 py-3"><div className="space-y-1.5">{PLATFORMS.map(k=><label key={k} className="flex items-center gap-2"><input type="checkbox" checked={m.promotions[k]} onChange={e=>updateMeta(p,{promotions:{...m.promotions,[k]:e.target.checked}})}/><span>{k}</span></label>)}</div></td>
          <td className="px-3 py-3"><div className="space-y-1">{PLATFORMS.filter(k=>platform==="All"||platform===k).map(k=><label key={k} className="flex items-center gap-1 text-xs"><span>{k}</span><input type="number" min="0" max="100" value={m.promotionDiscount[k]} onChange={e=>updateMeta(p,{promotionDiscount:{...m.promotionDiscount,[k]:e.target.value}})} className="w-16 rounded border border-slate-300 p-1"/></label>)}</div></td>
          <td className="px-3 py-3"><div className="space-y-1">{PLATFORMS.filter(k=>m.promotions[k]&&(platform==="All"||platform===k)).map(k=><label key={k} className="block text-xs">{k}<input value={m.promotionNote[k]} onChange={e=>updateMeta(p,{promotionNote:{...m.promotionNote,[k]:e.target.value}})} placeholder={tx("Campaign / offer note","ملاحظة الحملة / العرض")} className="mt-1 w-44 rounded border border-slate-300 p-1.5"/></label>)}</div></td>
          <td className="px-3 py-3"><textarea value={m.note} onChange={e=>updateMeta(p,{note:e.target.value})} rows={2} className="w-44 rounded-md border border-slate-300 p-2" placeholder={tx("Notes","ملاحظات")}/></td>
        </tr>})}</tbody></table></div>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden"><h2 className="font-black">{tx("Saved daily / monthly analyses","التحليلات اليومية / الشهرية المحفوظة")}</h2>{analyses.length===0?<p className="mt-2 text-sm text-slate-500">{tx("No saved snapshots yet. Click Save analysis snapshot to save this summary.","لا توجد تحليلات محفوظة بعد. اضغط حفظ نسخة التحليل لحفظ الملخص.")}</p>:<div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-slate-500"><th className="p-2 text-start">{tx("Period","الفترة")}</th><th className="p-2 text-start">{tx("Type","النوع")}</th><th className="p-2 text-start">{tx("Saved at","وقت الحفظ")}</th><th className="p-2 text-start">{tx("All","الكل")}</th><th className="p-2 text-start">{tx("Low / Steady / Best","ضعيف / متوسط / ممتاز")}</th></tr></thead><tbody>{analyses.map(a=><tr key={a._id} className="border-t border-slate-100"><td className="p-2">{a.period}</td><td className="p-2">{a.periodType==="daily"?tx("Daily","يومي"):tx("Monthly","شهري")}</td><td className="p-2">{a.createdAt?new Date(a.createdAt).toLocaleString(isArabic?"ar-QA":"en-GB"):"—"}</td><td className="p-2">{a.counts?.all??"—"}</td><td className="p-2">{a.counts?.slow??0} / {a.counts?.steady??0} / {a.counts?.best??0}</td></tr>)}</tbody></table></div>}</section>
      <p className="text-xs leading-5 text-slate-500 print:hidden">{tx("Low running = 1–2 stars, steady = 3 stars, best running = 4–5 stars. Rating is set by the employer. Units sold and stock are not shown or used. Save changes to store data in MongoDB.","ضعيف الحركة = نجمة أو نجمتان، متوسط = ٣ نجوم، الأفضل حركة = ٤ أو ٥ نجوم. الموظف يحدد التقييم. لا يتم عرض أو استخدام الوحدات المباعة أو المخزون. احفظ التغييرات لتخزين البيانات في MongoDB.")}</p>
    </div>
    <style jsx global>{`@media print {
      @page { size: auto; margin: 10mm; }
      body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      aside, nav, button, input, select, textarea, .print\\:hidden { display: none !important; }
      main { display: block !important; width: 100% !important; max-width: none !important; padding: 0 !important; margin: 0 !important; background: white !important; }
      main > div { display: block !important; max-width: none !important; }
      .print-title { display: block !important; margin: 0 0 12px !important; }
      .print-title h1 { font-size: 18pt; font-weight: 700; }
      .print-title p { font-size: 10pt; margin-top: 4px; }
      section { display: block !important; overflow: visible !important; break-inside: auto !important; box-shadow: none !important; border: 0 !important; padding: 0 !important; margin: 0 !important; }
      section > div { overflow: visible !important; }
      table { display: table !important; width: 100% !important; min-width: 0 !important; table-layout: auto !important; font-size: 8pt !important; }
      thead { display: table-header-group !important; }
      tr { break-inside: avoid !important; page-break-inside: avoid !important; }
      img { max-width: 42px !important; max-height: 42px !important; }
      th, td { padding: 4px !important; }
    }`}</style>
  </main>;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(String(reader.result)); reader.onerror=reject; reader.readAsDataURL(blob); });
}
