"use client";

import { useEffect, useState } from "react";

type Product = {
  _id: string;
  sku: string;
  name: string;
  description: string;
  image: string;
  category: string;
  price: number;
  stock: number;
  active: boolean;
};

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [productId, setProductId] = useState("");

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const { id } = await params;

        setProductId(id);

        const response = await fetch(
          `/api/products/${id}`
        );

        const data = await response.json();

        if (!response.ok) {
          alert(data.error || "Product not found");
          return;
        }

        setForm({
          sku: data.sku || "",
          name: data.name || "",
          category: data.category || "",
          description: data.description || "",
          image: data.image || "",
          price: String(data.price ?? ""),
          stock: String(data.stock ?? ""),
          active: data.active ?? true,
        });
      } catch (error) {
        console.error(
          "Load product error:",
          error
        );

        alert("Failed to load product");
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, []);

  function updateField(
    field: string,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!productId) {
      alert("Product ID is missing");
      return;
    }

    if (!form.sku.trim()) {
      alert("SKU is required");
      return;
    }

    if (!form.name.trim()) {
      alert("Product name is required");
      return;
    }

    if (form.price === "") {
      alert("Price is required");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/products/${productId}`,
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
            price: Number(form.price),
            stock: Number(form.stock || 0),
            active: form.active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Failed to update product"
        );
        return;
      }

      alert("Product updated successfully");

      window.location.href =
        `/products/${productId}`;
    } catch (error) {
      console.error(
        "Update product error:",
        error
      );

      alert("Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl p-10 text-center">
          Loading product...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <a
            href={
              productId
                ? `/products/${productId}`
                : "/products"
            }
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Back to Product
          </a>

          <h1 className="text-3xl font-bold text-gray-900 mt-3">
            Edit Product
          </h1>

          <p className="text-gray-500 mt-1">
            Update your master product information
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm p-6"
        >

          {/* SKU */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2">
              SKU
            </label>

            <input
              value={form.sku}
              onChange={(e) =>
                updateField(
                  "sku",
                  e.target.value
                )
              }
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g. PROD-001"
            />
          </div>

          {/* Name */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2">
              Product Name
            </label>

            <input
              value={form.name}
              onChange={(e) =>
                updateField(
                  "name",
                  e.target.value
                )
              }
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              placeholder="Product name"
            />
          </div>

          {/* Category */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2">
              Category
            </label>

            <input
              value={form.category}
              onChange={(e) =>
                updateField(
                  "category",
                  e.target.value
                )
              }
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g. Burger"
            />
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-2 gap-5 mb-5">

            <div>
              <label className="block text-sm font-medium mb-2">
                Price
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  updateField(
                    "price",
                    e.target.value
                  )
                }
                className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Stock
              </label>

              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) =>
                  updateField(
                    "stock",
                    e.target.value
                  )
                }
                className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2">
              Description
            </label>

            <textarea
              value={form.description}
              onChange={(e) =>
                updateField(
                  "description",
                  e.target.value
                )
              }
              rows={5}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              placeholder="Product description"
            />
          </div>

          {/* Image */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2">
              Image URL
            </label>

            <input
              value={form.image}
              onChange={(e) =>
                updateField(
                  "image",
                  e.target.value
                )
              }
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              placeholder="https://..."
            />
          </div>

          {/* Active */}
          <div className="border rounded-lg p-4 mb-6">

            <label className="flex items-center gap-3 cursor-pointer">

              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  updateField(
                    "active",
                    e.target.checked
                  )
                }
                className="w-5 h-5"
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

          {/* Buttons */}
          <div className="flex gap-3">

            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-black px-5 py-3 text-white font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>

            <a
              href={
                productId
                  ? `/products/${productId}`
                  : "/products"
              }
              className="rounded-lg border px-5 py-3 font-medium hover:bg-gray-50"
            >
              Cancel
            </a>

          </div>

        </form>
      </div>
    </main>
  );
}