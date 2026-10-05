"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  _id: string;
  name: string;
  description: string;
  active: boolean;
};

export default function NewProductPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "",
    description: "",
    image: "",
    price: "",
    stock: "",
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
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");

    if (!form.category) {
      setError("Please select a category");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create product");
      }

      router.push("/products");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );

      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-3xl">
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
          {/* SKU + Name */}
          <div className="grid grid-cols-2 gap-5">
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

            <div>
              <label className="mb-2 block font-medium">
                Product Name
              </label>

              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Coca Cola 330ml"
                className="w-full rounded-lg border p-3 outline-none focus:border-black"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="mb-2 block font-medium">
              Category
            </label>

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
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
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
                      value={category.name}
                    >
                      {category.name}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block font-medium">
              Description
            </label>

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Original Coca Cola 330ml..."
              className="w-full rounded-lg border p-3 outline-none focus:border-black"
            />
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
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-2 gap-5">
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