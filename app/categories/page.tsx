"use client";

import { FormEvent, useEffect, useState } from "react";

type Category = {
  _id: string;
  name: string;
  description: string;
  active: boolean;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadCategories() {
    try {
      setLoading(true);

      const response = await fetch("/api/categories");

      if (!response.ok) {
        throw new Error("Failed to load categories");
      }

      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error(err);
      setError("Categories load করা যায়নি");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Category name দিন");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      setSuccess("Category successfully added");

      setName("");
      setDescription("");

      await loadCategories();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Category create করা যায়নি");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Categories
          </h1>

          <p className="mt-2 text-gray-500">
            Manage your product categories
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Add Category */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-gray-900">
              Add Category
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Category Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Burgers"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Category description"
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add Category"}
              </button>
            </form>
          </div>

          {/* Category List */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b px-6 py-5">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    All Categories
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {categories.length} categories
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  Loading categories...
                </div>
              ) : categories.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No categories found.
                </div>
              ) : (
                <div className="divide-y">
                  {categories.map((category, index) => (
                    <div
                      key={category._id}
                      className="flex items-center justify-between px-6 py-5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 font-semibold text-gray-700">
                          {index + 1}
                        </div>

                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {category.name}
                          </h3>

                          {category.description && (
                            <p className="mt-1 text-sm text-gray-500">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          category.active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {category.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}