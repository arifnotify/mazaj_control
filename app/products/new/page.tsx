"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  _id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  active: boolean;
};

export default function NewProductPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [form, setForm] = useState({
    sku: "",

    nameEn: "",
    nameAr: "",

    categoryEn: "",
    categoryAr: "",

    descriptionEn: "",
    descriptionAr: "",

    image: "",
    price: "",
    stock: "",
    active: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch("/api/categories");

        if (!response.ok) {
          throw new Error("Failed to load categories");
        }

        const data = await response.json();

        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError("Categories load করা যায়নি");
      } finally {
        setLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleActiveChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    setForm((prev) => ({
      ...prev,
      active: e.target.checked,
    }));
  }

  function handleCategoryChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const selectedId = e.target.value;

    const selectedCategory = categories.find(
      (category) => category._id === selectedId
    );

    if (!selectedCategory) {
      setForm((prev) => ({
        ...prev,
        categoryEn: "",
        categoryAr: "",
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      categoryEn: selectedCategory.nameEn,
      categoryAr: selectedCategory.nameAr,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");

    if (!form.categoryEn || !form.categoryAr) {
      setError("Please select a category");
      setSaving(false);
      return;
    }

    if (!form.nameEn || !form.nameAr) {
      setError("English and Arabic product names are required");
      setSaving(false);
      return;
    }

    if (!form.price) {
      setError("Price is required");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku: form.sku,

          nameEn: form.nameEn,
          nameAr: form.nameAr,

          descriptionEn: form.descriptionEn,
          descriptionAr: form.descriptionAr,

          image: form.image,

          categoryEn: form.categoryEn,
          categoryAr: form.categoryAr,

          price: Number(form.price),
          stock: Number(form.stock || 0),

          active: form.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create product"
        );
      }

      router.push("/products");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );

      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <a
            href="/products"
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Back to Products
          </a>

          <h1 className="mt-4 text-3xl font-bold">
            Add Product
          </h1>

          <p className="mt-1 text-gray-500">
            Add a new product to your master product database.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl bg-white p-8 shadow"
        >

          {/* SKU */}
          <div>
            <label className="mb-2 block font-medium">
              SKU
            </label>

            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              required
              placeholder="COKE-330"
              className="w-full rounded-lg border p-3 outline-none focus:border-black"
            />
          </div>

          {/* Product Name */}
          <div>
            <h2 className="mb-4 text-lg font-semibold">
              Product Name
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* English */}
              <div>
                <label className="mb-2 block font-medium">
                  English Name
                </label>

                <input
                  name="nameEn"
                  value={form.nameEn}
                  onChange={handleChange}
                  required
                  dir="ltr"
                  placeholder="Coca Cola 330ml"
                  className="w-full rounded-lg border p-3 outline-none focus:border-black"
                />
              </div>

              {/* Arabic */}
              <div>
                <label className="mb-2 block font-medium">
                  Arabic Name
                </label>

                <input
                  name="nameAr"
                  value={form.nameAr}
                  onChange={handleChange}
                  required
                  dir="rtl"
                  placeholder="كوكا كولا 330 مل"
                  className="w-full rounded-lg border p-3 text-right outline-none focus:border-black"
                />
              </div>

            </div>
          </div>

          {/* Category */}
          <div>
            <h2 className="mb-4 text-lg font-semibold">
              Category
            </h2>

            {loadingCategories ? (
              <div className="rounded-lg border bg-gray-50 p-3 text-gray-500">
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm text-yellow-700">
                  No categories found.
                </p>

                <a
                  href="/categories"
                  className="mt-2 inline-block font-medium text-black underline"
                >
                  Create a category first →
                </a>
              </div>
            ) : (
              <>
                <select
                  value={
                    categories.find(
                      (category) =>
                        category.nameEn === form.categoryEn &&
                        category.nameAr === form.categoryAr
                    )?._id || ""
                  }
                  onChange={handleCategoryChange}
                  required
                  className="w-full rounded-lg border bg-white p-3 outline-none focus:border-black"
                >
                  <option value="">
                    Select a category
                  </option>

                  {categories
                    .filter((category) => category.active)
                    .map((category) => (
                      <option
                        key={category._id}
                        value={category._id}
                      >
                        {category.nameEn} / {category.nameAr}
                      </option>
                    ))}
                </select>

                {/* Selected Category Preview */}
                {form.categoryEn && form.categoryAr && (
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">

                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">
                        English
                      </p>

                      <p className="font-medium">
                        {form.categoryEn}
                      </p>
                    </div>

                    <div
                      dir="rtl"
                      className="rounded-lg bg-gray-50 p-3 text-right"
                    >
                      <p className="text-xs text-gray-500">
                        العربية
                      </p>

                      <p className="font-medium">
                        {form.categoryAr}
                      </p>
                    </div>

                  </div>
                )}
              </>
            )}
          </div>

          {/* Description */}
          <div>
            <h2 className="mb-4 text-lg font-semibold">
              Description
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* English Description */}
              <div>
                <label className="mb-2 block font-medium">
                  English Description
                </label>

                <textarea
                  name="descriptionEn"
                  value={form.descriptionEn}
                  onChange={handleChange}
                  rows={5}
                  dir="ltr"
                  placeholder="Original Coca Cola 330ml..."
                  className="w-full rounded-lg border p-3 outline-none focus:border-black"
                />
              </div>

              {/* Arabic Description */}
              <div>
                <label className="mb-2 block font-medium">
                  Arabic Description
                </label>

                <textarea
                  name="descriptionAr"
                  value={form.descriptionAr}
                  onChange={handleChange}
                  rows={5}
                  dir="rtl"
                  placeholder="كوكا كولا أصلية 330 مل..."
                  className="w-full rounded-lg border p-3 text-right outline-none focus:border-black"
                />
              </div>

            </div>
          </div>

          {/* Image */}
          <div>
            <label className="mb-2 block font-medium">
              Image URL
            </label>

            <input
              name="image"
              value={form.image}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full rounded-lg border p-3 outline-none focus:border-black"
            />

            {/* Image Preview */}
            {form.image && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-gray-500">
                  Image Preview
                </p>

                <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-lg border bg-gray-50">
                  <img
                    src={form.image}
                    alt="Product preview"
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <div>
              <label className="mb-2 block font-medium">
                Price (QAR)
              </label>

              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={handleChange}
                required
                placeholder="2.50"
                className="w-full rounded-lg border p-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Stock
              </label>

              <input
                name="stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={handleChange}
                placeholder="50"
                className="w-full rounded-lg border p-3 outline-none focus:border-black"
              />
            </div>

          </div>

          {/* Product Status */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">

              <div>
                <p className="font-medium">
                  Product Status
                </p>

                <p className="text-sm text-gray-500">
                  Turn product ON or OFF
                </p>
              </div>

              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={handleActiveChange}
                  className="peer sr-only"
                />

                <div className="h-7 w-12 rounded-full bg-gray-300 peer-checked:bg-green-500 after:absolute after:left-[3px] after:top-[3px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
              </label>

            </div>

            <div className="mt-3">
              {form.active ? (
                <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  ● ON — Product Active
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                  ● OFF — Product Inactive
                </span>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-red-600">
              {error}
            </div>
          )}

          {/* Save */}
          <button
            type="submit"
            disabled={saving || loadingCategories}
            className="w-full rounded-lg bg-black p-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Product"}
          </button>

        </form>
      </div>
    </main>
  );
}