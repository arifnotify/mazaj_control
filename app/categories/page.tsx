"use client";

import { FormEvent, useEffect, useState } from "react";

type Category = {
  _id: string;

  nameEn: string;
  nameAr: string;

  descriptionEn: string;
  descriptionAr: string;

  active: boolean;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");

  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

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

      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setError("Categories load করা যায়নি");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function resetForm() {
    setNameEn("");
    setNameAr("");

    setDescriptionEn("");
    setDescriptionAr("");

    setEditingId(null);
  }

  function startEdit(category: Category) {
    setEditingId(category._id);

    setNameEn(category.nameEn);
    setNameAr(category.nameAr);

    setDescriptionEn(category.descriptionEn || "");
    setDescriptionAr(category.descriptionAr || "");

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!nameEn.trim()) {
      setError("English category name দিন");
      return;
    }

    if (!nameAr.trim()) {
      setError("Arabic category name দিন");
      return;
    }

    try {
      setSaving(true);

      const url = editingId
        ? `/api/categories/${editingId}`
        : "/api/categories";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nameEn,
          nameAr,
          descriptionEn,
          descriptionAr,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            (editingId
              ? "Failed to update category"
              : "Failed to create category")
        );
      }

      setSuccess(
        editingId
          ? "Category successfully updated"
          : "Category successfully added"
      );

      resetForm();

      await loadCategories();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category: Category) {
    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/categories/${category._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nameEn: category.nameEn,
            nameAr: category.nameAr,

            descriptionEn: category.descriptionEn,
            descriptionAr: category.descriptionAr,

            active: !category.active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update category"
        );
      }

      setSuccess(
        `${category.nameEn} is now ${
          !category.active ? "Active" : "Inactive"
        }`
      );

      await loadCategories();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Category update করা যায়নি");
      }
    }
  }

  async function deleteCategory(category: Category) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.nameEn}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/categories/${category._id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete category"
        );
      }

      setSuccess(
        `${category.nameEn} deleted successfully`
      );

      if (editingId === category._id) {
        resetForm();
      }

      await loadCategories();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Category delete করা যায়নি");
      }
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

          {/* Form */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingId
                  ? "Edit Category"
                  : "Add Category"}
              </h2>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm text-gray-500 hover:text-black"
                >
                  Cancel
                </button>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* English Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  English Category Name
                </label>

                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) =>
                    setNameEn(e.target.value)
                  }
                  placeholder="e.g. Soft Drinks"
                  dir="ltr"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* Arabic Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Arabic Category Name
                </label>

                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) =>
                    setNameAr(e.target.value)
                  }
                  placeholder="مثال: مشروبات غازية"
                  dir="rtl"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-right outline-none focus:border-black"
                />
              </div>

              {/* English Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  English Description
                </label>

                <textarea
                  value={descriptionEn}
                  onChange={(e) =>
                    setDescriptionEn(e.target.value)
                  }
                  placeholder="Category description"
                  rows={3}
                  dir="ltr"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* Arabic Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Arabic Description
                </label>

                <textarea
                  value={descriptionAr}
                  onChange={(e) =>
                    setDescriptionAr(e.target.value)
                  }
                  placeholder="وصف الفئة"
                  rows={3}
                  dir="rtl"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-right outline-none focus:border-black"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">
                  {success}
                </div>
              )}

              {/* Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Category"
                  : "Add Category"}
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
                      className="flex items-center justify-between gap-4 px-6 py-5"
                    >

                      {/* Left */}
                      <div className="flex items-start gap-4">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 font-semibold text-gray-700">
                          {index + 1}
                        </div>

                        <div>

                          {/* English */}
                          <h3 className="font-semibold text-gray-900">
                            {category.nameEn}
                          </h3>

                          {/* Arabic */}
                          <p
                            dir="rtl"
                            className="mt-1 text-lg text-gray-700"
                          >
                            {category.nameAr}
                          </p>

                          {/* Descriptions */}
                          {category.descriptionEn && (
                            <p className="mt-2 text-sm text-gray-500">
                              {category.descriptionEn}
                            </p>
                          )}

                          {category.descriptionAr && (
                            <p
                              dir="rtl"
                              className="mt-1 text-sm text-gray-500"
                            >
                              {category.descriptionAr}
                            </p>
                          )}

                          {/* Status */}
                          <span
                            className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                              category.active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {category.active
                              ? "Active"
                              : "Inactive"}
                          </span>

                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            startEdit(category)
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleActive(category)
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
                        >
                          {category.active
                            ? "Disable"
                            : "Enable"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteCategory(category)
                          }
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                        >
                          Delete
                        </button>

                      </div>

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