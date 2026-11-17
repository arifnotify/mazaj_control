"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Product = {
  _id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  image?: string;
  categoryEn?: string;
  categoryAr?: string;
  price: number;
  inStock: boolean;
  productType?: "single" | "multiple";
  singleWeight?: number | null;
  singleUnit?: string | null;
  variants?: { _id?: string; weight: number; unit: string; price: number }[];
};

type Locale = "en" | "ar";

const copy = {
  en: {
    announcement: "Premium nuts & dry fruits, delivered across Qatar",
    home: "Home", shop: "Shop", story: "Our quality", contact: "Contact",
    eyebrow: "A LITTLE JOY IN EVERY BITE", headline: "Naturally good.\nBeautifully chosen.",
    intro: "Discover thoughtfully selected nuts, dates and dry fruits for everyday moments and special occasions.",
    shopNow: "Explore the collection", categories: "Shop by category", featured: "The favourites",
    featuredIntro: "Quality picks, selected for your table.", all: "All products", search: "Search products…",
    add: "Online ordering coming soon", out: "Out of stock", available: "Available", qar: "QAR",
    empty: "Products are being prepared. Please visit us again soon.", quality: "Good things, thoughtfully sourced",
    qualityText: "We believe the best moments are often the simplest: sharing something delicious with the people who matter.",
    delivery: "Made for sharing", deliveryText: "Everyday favourites and thoughtful gifts.",
    selection: "Carefully selected", selectionText: "A considered range for quality-conscious customers.",
    footer: "Good taste brings us together.", loading: "Loading our collection…", error: "We could not load products right now.",
  },
  ar: {
    announcement: "مكسرات وفواكه مجففة فاخرة، نوصلها إليكم في جميع أنحاء قطر",
    home: "الرئيسية", shop: "تسوق", story: "جودتنا", contact: "تواصل معنا",
    eyebrow: "متعة صغيرة في كل لقمة", headline: "طبيعي ولذيذ.\nمختار بعناية.",
    intro: "اكتشفوا تشكيلة مختارة بعناية من المكسرات والتمور والفواكه المجففة لكل يوم ومناسباتكم الخاصة.",
    shopNow: "اكتشفوا التشكيلة", categories: "تسوقوا حسب الفئة", featured: "اختياراتنا المفضلة",
    featuredIntro: "منتجات مختارة بعناية لتناسب مائدتكم.", all: "جميع المنتجات", search: "ابحث عن المنتجات…",
    add: "الطلب الإلكتروني قريباً", out: "نفد من المخزون", available: "متوفر", qar: "ر.ق",
    empty: "نجهز منتجاتنا لكم. يرجى زيارتنا قريباً.", quality: "جودة مختارة بعناية",
    qualityText: "نؤمن أن أجمل اللحظات بسيطة، مثل مشاركة مذاق لذيذ مع الأشخاص الذين تحبونهم.",
    delivery: "صُممت للمشاركة", deliveryText: "منتجات يومية مفضلة وهدايا مميزة.",
    selection: "اختيار بعناية", selectionText: "تشكيلة مدروسة لمن يقدّرون الجودة.",
    footer: "المذاق الطيب يجمعنا.", loading: "جارٍ تحميل المنتجات…", error: "تعذر تحميل المنتجات حالياً.",
  },
} as const;

function formatWeight(product: Product, locale: Locale) {
  if (product.productType === "multiple" && product.variants?.length) {
    const first = product.variants[0];
    return `${first.weight} ${first.unit}`;
  }
  if (product.singleWeight && product.singleUnit) return `${product.singleWeight} ${product.singleUnit}`;
  return "";
}

export default function StorefrontHome() {
  const [locale, setLocale] = useState<Locale>("en");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const t = copy[locale];
  const rtl = locale === "ar";
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/[^0-9]/g, "");

  useEffect(() => {
    const saved = window.localStorage.getItem("mazaj-store-locale");
    if (saved === "ar" || saved === "en") setLocale(saved);
    fetch("/api/storefront/products", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("Product request failed"); return r.json(); })
      .then((data: Product[]) => setProducts(data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    window.localStorage.setItem("mazaj-store-locale", locale);
  }, [locale, rtl]);

  const categories = useMemo(() => {
    const map = new Map<string, { en: string; ar: string }>();
    products.forEach((p) => {
      const en = p.categoryEn?.trim();
      const ar = p.categoryAr?.trim();
      if (en || ar) map.set(en || ar || "", { en: en || ar || "Other", ar: ar || en || "أخرى" });
    });
    return [...map.entries()];
  }, [products]);

  const visibleProducts = useMemo(() => products.filter((p) => {
    const name = `${p.nameEn} ${p.nameAr} ${p.descriptionEn || ""} ${p.descriptionAr || ""}`.toLowerCase();
    const matchesSearch = name.includes(query.toLowerCase());
    const matchesCategory = category === "all" || (p.categoryEn || p.categoryAr || "") === category;
    return matchesSearch && matchesCategory;
  }), [products, query, category]);

  return (
    <main dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-[#fbfaf6] text-[#203b30] selection:bg-[#d9c69b]">
      <div className="bg-[#193d31] px-4 py-2 text-center text-[11px] font-medium tracking-wide text-[#f4ead4] sm:text-xs">{t.announcement}</div>
      <header className="sticky top-0 z-30 border-b border-[#e9e3d6] bg-[#fbfaf6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href="#home" className="min-w-fit leading-none">
            <span className="block text-xl font-black tracking-[0.16em] text-[#193d31] sm:text-2xl">MAZAJ</span>
            <span className="mt-1 block text-[9px] font-semibold tracking-[0.42em] text-[#a58a55]">NUTS</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#52645a] md:flex">
            <a className="hover:text-[#a58a55]" href="#home">{t.home}</a>
            <a className="hover:text-[#a58a55]" href="#shop">{t.shop}</a>
            <a className="hover:text-[#a58a55]" href="#quality">{t.story}</a>
            <a className="hover:text-[#a58a55]" href="#contact">{t.contact}</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setLocale(rtl ? "en" : "ar")} className="rounded-full border border-[#d9d1c1] px-3 py-2 text-xs font-semibold text-[#294638] hover:bg-[#f0ebdf]" aria-label="Change language">{rtl ? "EN" : "العربية"}</button>
            <a href="#shop" className="rounded-full bg-[#193d31] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#285744]">{rtl ? "تسوق الآن" : "Shop now"}</a>
          </div>
        </div>
      </header>

      <section id="home" className="relative overflow-hidden bg-[#193d31]">
        <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full border border-[#c6ad79]/20" />
        <div className="absolute -right-12 -top-20 h-72 w-72 rounded-full border border-[#c6ad79]/20" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:py-32">
          <div className="relative z-10 max-w-2xl">
            <p className="mb-5 text-[10px] font-bold tracking-[0.28em] text-[#d8c49a] sm:text-xs">{t.eyebrow}</p>
            <h1 className="whitespace-pre-line text-4xl font-semibold leading-[1.13] tracking-tight text-[#fffdf7] sm:text-6xl lg:text-7xl">{t.headline}</h1>
            <p className="mt-6 max-w-lg text-sm leading-7 text-[#e0e5dc]/85 sm:text-base">{t.intro}</p>
            <a href="#shop" className="mt-9 inline-flex items-center gap-3 rounded-full bg-[#d8c49a] px-7 py-4 text-sm font-bold text-[#193d31] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#e6d5b2]">{t.shopNow}<span aria-hidden="true">{rtl ? "←" : "→"}</span></a>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute inset-5 rounded-full border border-[#d8c49a]/35" />
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[48%] border border-[#d8c49a]/30 bg-gradient-to-br from-[#355b45] via-[#244b39] to-[#102c23] p-8 shadow-2xl shadow-black/20">
              <div className="absolute inset-5 rounded-[48%] border border-dashed border-[#d8c49a]/25" />
              <div className="relative grid grid-cols-2 gap-3 sm:gap-5">
                {[
                  ["Almonds", "لوز", "#c7a56a"], ["Pistachios", "فستق", "#91a66e"],
                  ["Dates", "تمر", "#956443"], ["Cashews", "كاجو", "#dfc58e"],
                ].map(([en, ar, color]) => <div key={en} className="flex aspect-square w-28 flex-col items-center justify-center rounded-full border border-white/10 shadow-inner sm:w-36" style={{ background: `radial-gradient(circle at 35% 30%, ${color}, #654b31)` }}><span className="text-3xl drop-shadow-md">{en === "Almonds" ? "✦" : en === "Pistachios" ? "❋" : en === "Dates" ? "◆" : "✧"}</span><span className="mt-2 text-xs font-bold text-white">{rtl ? ar : en}</span></div>)}
              </div>
              <span className="absolute bottom-7 text-[9px] font-semibold tracking-[0.35em] text-[#e8d9b8]">SELECTED WITH CARE</span>
            </div>
          </div>
        </div>
      </section>

      <section id="shop" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-[10px] font-bold tracking-[0.25em] text-[#a58a55]">MAZAJ COLLECTION</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#193d31] sm:text-4xl">{t.featured}</h2><p className="mt-2 text-sm text-[#788278]">{t.featuredIntro}</p></div>
          <label className="block w-full sm:max-w-xs"><span className="sr-only">{t.search}</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} className="w-full rounded-full border border-[#e4ddcf] bg-white px-5 py-3 text-sm outline-none transition placeholder:text-[#a4a79e] focus:border-[#a58a55]" /></label>
        </div>
        {categories.length > 0 && <div className="mb-8 flex flex-wrap gap-2"><button onClick={() => setCategory("all")} className={`rounded-full px-4 py-2 text-xs font-semibold ${category === "all" ? "bg-[#193d31] text-white" : "border border-[#e4ddcf] bg-white text-[#536258]"}`}>{t.all}</button>{categories.map(([key, names]) => <button key={key} onClick={() => setCategory(key)} className={`rounded-full px-4 py-2 text-xs font-semibold ${category === key ? "bg-[#193d31] text-white" : "border border-[#e4ddcf] bg-white text-[#536258]"}`}>{rtl ? names.ar : names.en}</button>)}</div>}
        {loading ? <p className="py-16 text-center text-sm text-[#7b857b]">{t.loading}</p> : failed ? <p className="py-16 text-center text-sm text-[#9a5b48]">{t.error}</p> : visibleProducts.length === 0 ? <p className="py-16 text-center text-sm text-[#7b857b]">{t.empty}</p> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">{visibleProducts.map((p) => {
          const soldOut = !p.inStock;
          const title = rtl ? p.nameAr : p.nameEn;
          const description = rtl ? p.descriptionAr : p.descriptionEn;
          return <article key={p._id} className="group overflow-hidden rounded-2xl border border-[#eee8dc] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#203b30]/8">
            <div className="relative aspect-[4/3] overflow-hidden bg-[#f1eee5]">{p.image ? <Image src={p.image} alt={title} fill unoptimized className="object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-5xl text-[#b9a77e]">✧</div>}<span className={`absolute start-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-bold ${soldOut ? "bg-[#eee9df] text-[#786f61]" : "bg-[#e7eddf] text-[#466344]"}`}>{soldOut ? t.out : t.available}</span></div>
            <div className="p-3 sm:p-4"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#a58a55]">{rtl ? p.categoryAr : p.categoryEn}</p><h3 className="mt-1 min-h-10 text-sm font-bold text-[#263e32] sm:text-base">{title}</h3>{description && <p className="mt-1 line-clamp-2 min-h-9 text-[11px] leading-5 text-[#858b80]">{description}</p>}<div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-extrabold text-[#193d31]">{Number(p.price).toFixed(2)} <small className="text-[10px] font-semibold">{t.qar}</small></span><span className="text-[10px] text-[#8a8d83]">{formatWeight(p, locale)}</span></div><button disabled className="mt-4 w-full cursor-not-allowed rounded-full bg-[#e9e7df] px-3 py-2.5 text-xs font-bold text-[#657166]">{soldOut ? t.out : t.add}</button></div>
          </article>;
        })}</div>}
      </section>

      <section id="quality" className="bg-[#f0ede4] px-4 py-16 sm:px-6 sm:py-20"><div className="mx-auto max-w-5xl text-center"><p className="text-[10px] font-bold tracking-[0.25em] text-[#a58a55]">THE MAZAJ PROMISE</p><h2 className="mt-3 text-3xl font-semibold text-[#193d31] sm:text-4xl">{t.quality}</h2><p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#6f796f]">{t.qualityText}</p><div className="mt-10 grid gap-8 sm:grid-cols-2"><div className="border-t border-[#d7cdb9] pt-5"><span className="text-2xl text-[#a58a55]">✧</span><h3 className="mt-2 font-bold">{t.delivery}</h3><p className="mt-2 text-xs text-[#7b8379]">{t.deliveryText}</p></div><div className="border-t border-[#d7cdb9] pt-5"><span className="text-2xl text-[#a58a55]">❋</span><h3 className="mt-2 font-bold">{t.selection}</h3><p className="mt-2 text-xs text-[#7b8379]">{t.selectionText}</p></div></div></div></section>
      <footer id="contact" className="bg-[#142f26] px-4 py-10 text-center text-[#e8dfca]"><div className="text-lg font-black tracking-[0.2em]">MAZAJ NUTS</div><p className="mt-3 text-xs text-[#c7c2b2]">{t.footer}</p>{whatsappNumber && <a className="mt-5 inline-flex rounded-full border border-[#c7c2b2]/40 px-5 py-2 text-xs font-semibold text-[#e8dfca] hover:bg-white/10" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">WhatsApp</a>}<p className="mt-5 text-[10px] text-[#9da99c]">© {new Date().getFullYear()} Mazaj Nuts · Qatar</p></footer>
    </main>
  );
}
