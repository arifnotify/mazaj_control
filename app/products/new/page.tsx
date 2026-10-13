"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { _id: string; nameEn: string; nameAr: string; active: boolean };
type Unit = "g" | "kg" | "pcs" | "ml" | "L";
type Variant = { id: string; weight: string; unit: Unit; price: string };
type ProductType = "single" | "multiple";
const units: Unit[] = ["g", "kg", "pcs", "ml", "L"];
const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const labelClass = "mb-2 block text-sm font-medium text-gray-700";
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
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <button type="button" onClick={() => router.push("/products")} className="mb-3 text-sm font-medium text-gray-600 hover:text-gray-900">← Back to Products</button>
        <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
        <p className="mb-6 mt-1 text-sm text-gray-500">Create single items or products with unlimited weight options.</p>
        {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-gray-900">Basic Information</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div><label className={labelClass}>Main SKU *</label><input className={inputClass} name="sku" value={form.sku} onChange={handleChange} placeholder="NUT-001" required /></div>
              <div><label className={labelClass}>Product Type *</label><select className={inputClass} value={productType} onChange={(e) => setProductType(e.target.value as ProductType)}><option value="single">Single Item</option><option value="multiple">Multiple Weight Items</option></select></div>
              <div><label className={labelClass}>Product Name - English *</label><input className={inputClass} name="nameEn" value={form.nameEn} onChange={handleChange} required /></div>
              <div><label className={labelClass}>Product Name - Arabic *</label><input className={inputClass} name="nameAr" dir="rtl" value={form.nameAr} onChange={handleChange} required /></div>
            </div>
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-gray-900">Description</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div><label className={labelClass}>Description - English</label><textarea className={inputClass} name="descriptionEn" value={form.descriptionEn} onChange={handleChange} rows={5} /></div>
              <div><label className={labelClass}>Description - Arabic</label><textarea className={inputClass} name="descriptionAr" dir="rtl" value={form.descriptionAr} onChange={handleChange} rows={5} /></div>
            </div>
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-gray-900">Category</h2>
            <select className={inputClass} value={categories.find((c) => c.nameEn === form.categoryEn && c.nameAr === form.categoryAr)?._id || ""} onChange={handleCategoryChange} disabled={loadingCategories}>
              <option value="">{loadingCategories ? "Loading categories..." : "Select category"}</option>
              {categories.filter((c) => c.active).map((c) => <option key={c._id} value={c._id}>{c.nameEn} / {c.nameAr}</option>)}
            </select>
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Product Image</h2>
            <p className="mb-5 text-sm text-gray-500">Upload to Cloudinary (maximum 5MB).</p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className={labelClass}>Choose Image</label><input type="file" accept="image/*" disabled={uploading} onChange={handleImageUpload} className="block w-full rounded-lg border border-gray-300 p-3 text-sm" /><p className="mt-2 text-sm text-gray-500">{uploading ? "Uploading..." : "JPG, PNG, WEBP"}</p></div>
              <div className="flex min-h-48 items-center justify-center rounded-lg border bg-gray-50 p-3">{form.image ? <div className="text-center"><img src={form.image} alt="Product preview" className="mx-auto max-h-52 max-w-full object-contain" /><button type="button" onClick={() => setForm((prev) => ({ ...prev, image: "" }))} className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-sm text-white">Remove Image</button></div> : <p className="text-sm text-gray-400">No image selected</p>}</div>
            </div>
          </section>
          {productType === "single" ? (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">Single Item - Price, Weight & Stock</h2>
              <p className="mb-5 text-sm text-gray-500">Weight is optional for single items.</p>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div><label className={labelClass}>Weight</label><input className={inputClass} type="number" name="singleWeight" min="0.001" step="any" value={form.singleWeight} onChange={handleChange} placeholder="250" /></div>
                <div><label className={labelClass}>Unit</label><select className={inputClass} name="singleUnit" value={form.singleUnit} onChange={handleChange}>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
                <div><label className={labelClass}>Price (QAR) *</label><input className={inputClass} type="number" name="price" min="0" step="0.01" value={form.price} onChange={handleChange} required /></div>
                <div><label className={labelClass}>Stock *</label><input className={inputClass} type="number" name="stock" min="0" step="1" value={form.stock} onChange={handleChange} required /></div>
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-gray-900">Multiple Weight Options</h2><p className="text-sm text-gray-500">Add as many weights as you need. Each weight has its own price. All weights share one product SKU and stock.</p></div><button type="button" onClick={() => setVariants((prev) => [...prev, makeVariant()])} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">+ Add Weight</button></div>
              <div className="space-y-4">{variants.map((v, i) => (
                <div key={v.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-gray-800">Weight Option {i + 1}</h3><button type="button" onClick={() => setVariants((prev) => prev.filter((x) => x.id !== v.id))} className="text-sm font-medium text-red-600 hover:text-red-800">Remove</button></div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div><label className={labelClass}>Weight *</label><input className={inputClass} type="number" min="0.001" step="any" value={v.weight} onChange={(e) => updateVariant(v.id, "weight", e.target.value)} placeholder="250" required /></div>
                    <div><label className={labelClass}>Unit *</label><select className={inputClass} value={v.unit} onChange={(e) => updateVariant(v.id, "unit", e.target.value)}>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
                    <div><label className={labelClass}>Price (QAR) *</label><input className={inputClass} type="number" min="0" step="0.01" value={v.price} onChange={(e) => updateVariant(v.id, "price", e.target.value)} required /></div>
                  </div>
                </div>
              ))}</div>
              <div className="mt-5"><label className={labelClass}>Product Stock * (shared by all weights)</label><input className={inputClass} type="number" min="0" step="1" name="stock" value={form.stock} onChange={handleChange} required /><p className="mt-1 text-xs text-gray-500">One stock quantity for the whole product, not per weight.</p></div>
            </section>
          )}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Product Status</h2>
            <button
              type="button"
              role="switch"
              aria-checked={form.active}
              onClick={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 ${
                form.active ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"
              }`}
            >
              <span className="font-medium text-gray-700">
                {form.active ? "Product is ON" : "Product is OFF"}
              </span>
              <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                form.active ? "bg-green-600" : "bg-gray-400"
              }`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  form.active ? "translate-x-6" : "translate-x-1"
                }`} />
              </span>
            </button>
          </section>
          <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={saving} onClick={() => router.push("/products")} className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700">Cancel</button><button type="submit" disabled={saving || uploading} className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white disabled:opacity-50">{saving ? "Creating Product..." : "Create Product"}</button></div>
        </form>
      </div>
    </main>
  );
}
