"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
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
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    sku: "",
    nameEn: "",
    nameAr: "",
    descriptionEn: "",
    descriptionAr: "",
    image: "",
    categoryEn: "",
    categoryAr: "",
    price: "",
    stock: "0",
    active: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      setLoadingCategories(true);

      const response = await fetch("/api/categories");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load categories");
      }

      setCategories(data);
    } catch (err: any) {
      setError(err.message || "Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  }

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleCategoryChange(e: ChangeEvent<HTMLSelectElement>) {
    const selectedId = e.target.value;

    const category = categories.find(
      (item) => item._id === selectedId
    );

    if (!category) {
      setForm((previous) => ({
        ...previous,
        categoryEn: "",
        categoryAr: "",
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      categoryEn: category.nameEn,
      categoryAr: category.nameAr,
    }));
  }

  async function handleImageUpload(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

    // Client-side validation
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      e.target.value = "";
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      setForm((previous) => ({
        ...previous,
        image: data.url,
      }));

      setSuccess("Image uploaded successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploading(false);

      // Allow selecting the same file again
      e.target.value = "";
    }
  }

  function removeImage() {
    setForm((previous) => ({
      ...previous,
      image: "",
    }));

    setSuccess("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    // Validation
    if (!form.sku.trim()) {
      setError("SKU is required.");
      return;
    }

    if (!form.nameEn.trim()) {
      setError("English product name is required.");
      return;
    }

    if (!form.nameAr.trim()) {
      setError("Arabic product name is required.");
      return;
    }

    if (!form.price.trim()) {
      setError("Price is required.");
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock || 0);

    if (Number.isNaN(price) || price < 0) {
      setError("Please enter a valid price.");
      return;
    }

    if (Number.isNaN(stock) || stock < 0) {
      setError("Please enter a valid stock quantity.");
      return;
    }

    if (uploading) {
      setError("Please wait until the image upload is complete.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku: form.sku.trim(),

          nameEn: form.nameEn.trim(),
          nameAr: form.nameAr.trim(),

          descriptionEn: form.descriptionEn.trim(),
          descriptionAr: form.descriptionAr.trim(),

          image: form.image,

          categoryEn: form.categoryEn.trim(),
          categoryAr: form.categoryAr.trim(),

          price,
          stock,
          active: form.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create product");
      }

      setSuccess("Product created successfully.");

      setTimeout(() => {
        router.push("/products");
        router.refresh();
      }, 800);
    } catch (err: any) {
      setError(err.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push("/products")}
            className="mb-3 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to Products
          </button>

          <h1 className="text-3xl font-bold text-gray-900">
            Add New Product
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create a new product with English and Arabic information.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-xl font-semibold text-gray-900">
                Basic Information
              </h2>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* SKU */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    SKU *
                  </label>

                  <input
                    type="text"
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    placeholder="Example: NUT-001"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Price *
                  </label>

                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* English Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Product Name - English *
                  </label>

                  <input
                    type="text"
                    name="nameEn"
                    value={form.nameEn}
                    onChange={handleChange}
                    dir="ltr"
                    placeholder="Example: Roasted Almonds"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Arabic Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Product Name - Arabic *
                  </label>

                  <input
                    type="text"
                    name="nameAr"
                    value={form.nameAr}
                    onChange={handleChange}
                    dir="rtl"
                    placeholder="مثال: لوز محمص"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-right text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </section>

            {/* Description */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-xl font-semibold text-gray-900">
                Description
              </h2>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* English Description */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Description - English
                  </label>

                  <textarea
                    name="descriptionEn"
                    value={form.descriptionEn}
                    onChange={handleChange}
                    dir="ltr"
                    rows={5}
                    placeholder="Enter product description in English..."
                    className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Arabic Description */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Description - Arabic
                  </label>

                  <textarea
                    name="descriptionAr"
                    value={form.descriptionAr}
                    onChange={handleChange}
                    dir="rtl"
                    rows={5}
                    placeholder="أدخل وصف المنتج باللغة العربية..."
                    className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-right text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </section>

            {/* Category */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-xl font-semibold text-gray-900">
                Category
              </h2>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Select Category
                </label>

                <select
                  value={
                    categories.find(
                      (category) =>
                        category.nameEn === form.categoryEn &&
                        category.nameAr === form.categoryAr
                    )?._id || ""
                  }
                  onChange={handleCategoryChange}
                  disabled={loadingCategories}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    {loadingCategories
                      ? "Loading categories..."
                      : "Select a category"}
                  </option>

                  {categories
                    .filter((category) => category.active)
                    .map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.nameEn} / {category.nameAr}
                      </option>
                    ))}
                </select>

                {form.categoryEn && form.categoryAr && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                    <div className="text-gray-700">
                      <span className="font-medium">English:</span>{" "}
                      {form.categoryEn}
                    </div>

                    <div
                      className="mt-1 text-right text-gray-700"
                      dir="rtl"
                    >
                      <span className="font-medium">العربية:</span>{" "}
                      {form.categoryAr}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Image Upload */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Product Image
              </h2>

              <p className="mb-5 text-sm text-gray-500">
                Upload an image to Cloudinary. Maximum size: 5MB.
              </p>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Upload */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Choose Image
                  </label>

                  <label
                    className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition ${
                      uploading
                        ? "cursor-not-allowed border-gray-300 bg-gray-100"
                        : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    <div className="text-center">
                      <div className="mb-3 text-4xl">📷</div>

                      {uploading ? (
                        <>
                          <p className="font-medium text-blue-600">
                            Uploading...
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Please wait
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-gray-700">
                            Click to choose an image
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            JPG, PNG, WEBP up to 5MB
                          </p>
                        </>
                      )}
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Preview */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Image Preview
                  </label>

                  <div className="relative flex min-h-[250px] items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {form.image ? (
                      <>
                        <img
                          src={form.image}
                          alt="Product preview"
                          className="max-h-[250px] max-w-full object-contain"
                        />

                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute right-3 top-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-gray-400">
                        <div className="mb-2 text-4xl">🖼️</div>

                        <p className="text-sm">
                          No image selected
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Stock & Status */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-xl font-semibold text-gray-900">
                Inventory & Status
              </h2>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Stock */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Stock
                  </label>

                  <input
                    type="number"
                    name="stock"
                    value={form.stock}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Product Status
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setForm((previous) => ({
                        ...previous,
                        active: !previous.active,
                      }))
                    }
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 ${
                      form.active
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <span className="font-medium text-gray-700">
                      {form.active ? "Product is ON" : "Product is OFF"}
                    </span>

                    <span
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        form.active ? "bg-green-600" : "bg-gray-400"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          form.active
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </span>
                  </button>
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.push("/products")}
                disabled={saving}
                className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || uploading}
                className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Creating Product..." : "Create Product"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}