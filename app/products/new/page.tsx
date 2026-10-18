"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { _id: string; nameEn: string; nameAr: string; active: boolean };
type Unit = "g" | "kg" | "pcs" | "ml" | "L";
type Variant = { id: string; weight: string; unit: Unit; price: string };
type ProductType = "single" | "multiple";
const units: Unit[] = ["g", "kg", "pcs", "ml", "L"];
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 text-sm sm:text-base outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-100 shadow-2xs";
const labelClass = "mb-2 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600";
const makeVariant = (): Variant => ({ id: crypto.randomUUID(), weight: "", unit: "g", price: "" });

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [productType, setProductType] = useState<ProductType>("single");
  const [variants, setVariants] = useState<Variant[]>([makeVariant()]);
  const [form, setForm] = useState({
    sku: "", nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "", image: "",
    categoryEn: "", categoryAr: "", price: "", stock: "0", singleWeight: "", singleUnit: "g" as Unit, active: true,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load categories");
        if (mounted) setCategories(Array.isArray(data) ? data : data.categories || []);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load categories");
      } finally {
        if (mounted) setLoadingCategories(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCategoryChange(e: ChangeEvent<HTMLSelectElement>) {
    const category = categories.find((c) => c._id === e.target.value);
    setForm((prev) => ({ ...prev, categoryEn: category?.nameEn || "", categoryAr: category?.nameAr || "" }));
  }

  function updateVariant(id: string, key: keyof Omit<Variant, "id">, value: string) {
    setVariants((prev) => prev.map((v) => v.id === id ? { ...v, [key]: value } : v));
  }

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setSuccess("");
    if (!file.type.startsWith("image/")) { setError("Please select a valid image file."); e.target.value = ""; return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image size must be less than 5MB."); e.target.value = ""; return; }
    try {
      setUploading(true);
      const formData = new FormData(); formData.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to upload image");
      setForm((prev) => ({ ...prev, image: data.url }));
      setSuccess("Image uploaded successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally { setUploading(false); e.target.value = ""; }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setSuccess("");
    if (!form.sku.trim() || !form.nameEn.trim() || !form.nameAr.trim()) {
      setError("SKU, English product name and Arabic product name are required."); return;
    }
    if (uploading) { setError("Please wait for the image upload to finish."); return; }
    let payload: Record<string, unknown> = { ...form, productType };
    if (productType === "single") {
      const price = Number(form.price); const stock = Number(form.stock);
      if (!form.price.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
        setError("Enter a valid price and whole-number stock."); return;
      }
      const weight = form.singleWeight.trim() ? Number(form.singleWeight) : null;
      if (weight !== null && (!Number.isFinite(weight) || weight <= 0)) { setError("Weight must be greater than zero."); return; }
      payload = { ...payload, price, stock, singleWeight: weight, singleUnit: weight === null ? null : form.singleUnit, variants: [] };
    } else {
      if (variants.length === 0) { setError("Add at least one weight option."); return; }
      const parsed = variants.map((v) => ({ weight: Number(v.weight), unit: v.unit, price: Number(v.price) }));
      if (variants.some((v) => !v.weight.trim() || !v.price.trim()) || parsed.some((v) => !Number.isFinite(v.weight) || v.weight <= 0 || !Number.isFinite(v.price) || v.price < 0)) {
        setError("Each weight option requires a positive weight and valid price."); return;
      }
      const stock = Number(form.stock);
      if (!Number.isInteger(stock) || stock < 0) { setError("Enter a valid whole-number product stock."); return; }
      const keys = parsed.map((v) => `${v.unit === "kg" ? "g" : v.unit === "L" ? "ml" : v.unit}:${v.weight * (v.unit === "kg" || v.unit === "L" ? 1000 : 1)}`);
      if (new Set(keys).size !== keys.length) { setError("Duplicate weight options are not allowed."); return; }
      payload = { ...payload, stock, variants: parsed };
    }
    try {
      setSaving(true);
      const response = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create product");
      setSuccess("Product created successfully.");
      router.push("/products"); router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-3 sm:p-6 lg:p-8 font-sans text-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">
        
        {/* Top Navigation & Header */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-xs border border-slate-200">
          <button 
            type="button" 
            onClick={() => router.push("/products")} 
            className="mb-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <span>←</span> Back to Products
          </button>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Add New Product</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Create single items or products with unlimited weight options.</p>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-medium text-rose-700 shadow-2xs">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-700 shadow-2xs">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Basic Information Section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <h2 className="mb-4 text-lg sm:text-xl font-bold text-slate-900">Basic Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>Main SKU *</label>
                <input className={inputClass} name="sku" value={form.sku} onChange={handleChange} placeholder="NUT-001" required />
              </div>
              <div>
                <label className={labelClass}>Product Type *</label>
                <select className={inputClass} value={productType} onChange={(e) => setProductType(e.target.value as ProductType)}>
                  <option value="single">Single Item</option>
                  <option value="multiple">Multiple Weight Items</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Product Name - English *</label>
                <input className={inputClass} name="nameEn" value={form.nameEn} onChange={handleChange} placeholder="e.g. Roasted Cashew" required />
              </div>
              <div>
                <label className={labelClass}>Product Name - Arabic *</label>
                <input className={inputClass} name="nameAr" dir="rtl" value={form.nameAr} onChange={handleChange} placeholder="كاجو محمص" required />
              </div>
            </div>
          </section>

          {/* Description Section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <h2 className="mb-4 text-lg sm:text-xl font-bold text-slate-900">Description</h2>
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>Description - English</label>
                <textarea className={`${inputClass} resize-y`} name="descriptionEn" value={form.descriptionEn} onChange={handleChange} rows={4} placeholder="Enter description in English..." />
              </div>
              <div>
                <label className={labelClass}>Description - Arabic</label>
                <textarea className={`${inputClass} resize-y`} name="descriptionAr" dir="rtl" value={form.descriptionAr} onChange={handleChange} rows={4} placeholder="أدخل الوصف بالعربية..." />
              </div>
            </div>
          </section>

          {/* Category Section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <h2 className="mb-4 text-lg sm:text-xl font-bold text-slate-900">Category</h2>
            <select className={inputClass} value={categories.find((c) => c.nameEn === form.categoryEn && c.nameAr === form.categoryAr)?._id || ""} onChange={handleCategoryChange} disabled={loadingCategories}>
              <option value="">{loadingCategories ? "Loading categories..." : "Select category"}</option>
              {categories.filter((c) => c.active).map((c) => <option key={c._id} value={c._id}>{c.nameEn} / {c.nameAr}</option>)}
            </select>
          </section>

          {/* Product Image Upload Section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <h2 className="mb-1 text-lg sm:text-xl font-bold text-slate-900">Product Image</h2>
            <p className="mb-4 text-xs sm:text-sm text-slate-500">Upload product image to Cloudinary (maximum 5MB).</p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 items-center">
              <div>
                <label className={labelClass}>Choose Image File</label>
                <input type="file" accept="image/*" disabled={uploading} onChange={handleImageUpload} className="block w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs sm:text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer" />
                <p className="mt-2 text-xs text-slate-400">{uploading ? "Uploading to cloud..." : "Supported formats: JPG, PNG, WEBP"}</p>
              </div>
              <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                {form.image ? (
                  <div className="text-center space-y-3">
                    <img src={form.image} alt="Product preview" className="mx-auto max-h-44 max-w-full rounded-lg object-contain shadow-sm" />
                    <button type="button" onClick={() => setForm((prev) => ({ ...prev, image: "" }))} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition">Remove Image</button>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-400 font-medium">No image preview selected</p>
                )}
              </div>
            </div>
          </section>

          {/* Pricing & Stock Configuration */}
          {productType === "single" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
              <h2 className="mb-1 text-lg sm:text-xl font-bold text-slate-900">Single Item Configuration</h2>
              <p className="mb-4 text-xs sm:text-sm text-slate-500">Weight specification is optional for single items.</p>
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Weight</label>
                  <input className={inputClass} type="number" name="singleWeight" min="0.001" step="any" value={form.singleWeight} onChange={handleChange} placeholder="250" />
                </div>
                <div>
                  <label className={labelClass}>Unit</label>
                  <select className={inputClass} name="singleUnit" value={form.singleUnit} onChange={handleChange}>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select>
                </div>
                <div>
                  <label className={labelClass}>Price (QAR) *</label>
                  <input className={inputClass} type="number" name="price" min="0" step="0.01" value={form.price} onChange={handleChange} placeholder="0.00" required />
                </div>
                <div>
                  <label className={labelClass}>Stock Quantity *</label>
                  <input className={inputClass} type="number" name="stock" min="0" step="1" value={form.stock} onChange={handleChange} placeholder="0" required />
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">Multiple Weight Options</h2>
                  <p className="text-xs sm:text-sm text-slate-500">Define separate weights and prices. All variants share a single inventory stock.</p>
                </div>
                <button type="button" onClick={() => setVariants((prev) => [...prev, makeVariant()])} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 transition shadow-2xs self-start sm:self-auto">+ Add Weight</button>
              </div>

              <div className="space-y-3">
                {variants.map((v, i) => (
                  <div key={v.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-700">Option #{i + 1}</h3>
                      <button type="button" onClick={() => setVariants((prev) => prev.filter((x) => x.id !== v.id))} className="text-xs font-bold text-rose-600 hover:text-rose-800">Remove</button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className={labelClass}>Weight *</label>
                        <input className={inputClass} type="number" min="0.001" step="any" value={v.weight} onChange={(e) => updateVariant(v.id, "weight", e.target.value)} placeholder="250" required />
                      </div>
                      <div>
                        <label className={labelClass}>Unit *</label>
                        <select className={inputClass} value={v.unit} onChange={(e) => updateVariant(v.id, "unit", e.target.value)}>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select>
                      </div>
                      <div>
                        <label className={labelClass}>Price (QAR) *</label>
                        <input className={inputClass} type="number" min="0" step="0.01" value={v.price} onChange={(e) => updateVariant(v.id, "price", e.target.value)} placeholder="0.00" required />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <label className={labelClass}>Shared Product Stock *</label>
                <input className={inputClass} type="number" min="0" step="1" name="stock" value={form.stock} onChange={handleChange} required />
                <p className="mt-1 text-xs text-slate-400">Total stock shared across all weight variants.</p>
              </div>
            </section>
          )}

          {/* Product Status Toggle */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <h2 className="mb-3 text-lg sm:text-xl font-bold text-slate-900">Product Status</h2>
            <button
              type="button"
              role="switch"
              aria-checked={form.active}
              onClick={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 transition-all ${
                form.active ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"
              }`}
            >
              <span className="text-xs sm:text-sm font-bold text-slate-700">
                {form.active ? "Product Status: Active (ON)" : "Product Status: Inactive (OFF)"}
              </span>
              <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.active ? "bg-emerald-600" : "bg-slate-400"
              }`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.active ? "translate-x-6" : "translate-x-1"
                }`} />
              </span>
            </button>
          </section>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
            <button 
              type="button" 
              disabled={saving} 
              onClick={() => router.push("/products")} 
              className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving || uploading} 
              className="w-full sm:w-auto rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-sm"
            >
              {saving ? "Creating Product..." : "Create Product"}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}