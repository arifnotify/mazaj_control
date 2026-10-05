"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Category = {
  _id: string;
  name: string;
  description: string;
  active: boolean;
};

type Product = {
  _id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  image: string;
  price: number;
  stock: number;
  active: boolean;
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "",
    description: "",
    image: "",
    price: "",
    stock: "",
    active: true,
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [productResponse, categoryResponse] =
          await Promise.all([
            fetch(`/api/products/${id}`),
            fetch("/api/categories"),
          ]);

        const productData = await productResponse.json();
        const categoryData = await categoryResponse.json();

        if (!productResponse.ok) {
          throw new Error(
            productData.error || "Failed to load product"
          );
        }

        setProduct(productData);

        setForm({
          sku: productData.sku || "",
          name: productData.name || "",
          category: productData.category || "",
          description: productData.description || "",
          image: productData.image || "",
          price: String(productData.price ?? ""),
          stock: String(productData.stock ?? ""),
          active: productData.active ?? true,
        });

        setCategories(
          Array.isArray(categoryData) ? categoryData : []
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load product"
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value, type } = e.target;

    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");

    if (!form.category) {
      setError("Please select a category.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/products/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sku: form.sku,
            name: form.name,
            category: form.category,
            description: form.description,
            image: form.image,
            price: form.price,
            stock: form.stock,
            active: form.active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update product"
        );
      }

      router.push(`/products/${id}`);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update product"
      );

      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-10 text-center">
          Loading product...
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-10 text-center">
          <h1 className="text-2xl font-bold">
            Product not found
          </h1>

          <a
            href="/products"
            className="mt-5 inline-block rounded-lg bg-black px-5 py-3 text-white"
          >
            Back to Products
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-8">
          <a
            href={`/products/${id}`}
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Back to Product
          </a>

          <h1 className="mt-4 text-3xl font-bold">
            Edit Product
          </h1>

          <p className="mt-1 text-gray-500">
            Update your master product information.
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
                className="w-full rounded-lg border p-3 outline-none focus:border-black"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="mb-2 block font-medium">
              Category
            </label>

            {categories.length === 0 ? (
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
                className="w-full rounded-lg border p-3 outline-none focus:border-black"
              />
            </div>
          </div>

          {/* Active */}
          <div className="rounded-lg border p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="active"
                checked={form.active}
                onChange={handleChange}
                className="h-4 w-4"
              />

              <div>
                <p className="font-medium">
                  Product Active
                </p>

                <p className="text-sm text-gray-500">
                  Active products can be managed on marketplaces.
                </p>
              </div>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-red-600">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-black p-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <a
              href={`/products/${id}`}
              className="rounded-lg border px-6 py-3 font-medium hover:bg-gray-50"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}