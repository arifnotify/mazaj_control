"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProductPage() {
  const router = useRouter();

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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <a
            href="/products"
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Back to Products
          </a>

          <h1 className="text-3xl font-bold mt-4">
            Add Product
          </h1>

          <p className="text-gray-500 mt-1">
            Add a new product to your master product database.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow p-8 space-y-6"
        >
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block font-medium mb-2">
                SKU
              </label>

              <input
                name="sku"
                value={form.sku}
                onChange={handleChange}
                required
                placeholder="COKE-330"
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">
                Product Name
              </label>

              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Coca Cola 330ml"
                className="w-full border rounded-lg p-3"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">
              Category
            </label>

            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="Drinks"
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              Description
            </label>

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Original Coca Cola 330ml..."
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              Image URL
            </label>

            <input
              name="image"
              value={form.image}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block font-medium mb-2">
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
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">
                Stock
              </label>

              <input
                name="stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={handleChange}
                placeholder="50"
                className="w-full border rounded-lg p-3"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-black text-white rounded-lg p-3 font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Product"}
          </button>
        </form>
      </div>
    </main>
  );
}