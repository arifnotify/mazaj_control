"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Category = {
  _id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  active: boolean;
};

type Product = {
  _id: string;
  sku: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  image: string;
  categoryEn: string;
  categoryAr: string;
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
          nameEn: productData.nameEn || "",
          nameAr: productData.nameAr || "",
          descriptionEn: productData.descriptionEn || "",
          descriptionAr: productData.descriptionAr || "",
          image: productData.image || "",
          categoryEn: productData.categoryEn || "",
          categoryAr: productData.categoryAr || "",
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
      HTMLInputElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleCategoryChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const categoryId = e.target.value;

    const category = categories.find(
      (item) => item._id === categoryId
    );

    if (!category) {
      setForm((current) => ({
        ...current,
        categoryEn: "",
        categoryAr: "",
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      categoryEn: category.nameEn,
      categoryAr: category.nameAr,
    }));
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

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
        throw new Error(
          data.error || "Failed to upload image"
        );
      }

      setForm((current) => ({
        ...current,
        image: data.url,
      }));

      setSuccess("Image uploaded successfully.");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload image"
      );
    } finally {
      setUploading(false);

      e.target.value = "";
    }
  }

  function removeImage() {
    setForm((current) => ({
      ...current,
      image: "",
    }));

    setSuccess("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    if (!form.sku.trim()) {
      setError("SKU is required.");
      setSaving(false);
      return;
    }

    if (!form.nameEn.trim()) {
      setError("English product name is required.");
      setSaving(false);
      return;
    }

    if (!form.nameAr.trim()) {
      setError("Arabic product name is required.");
      setSaving(false);
      return;
    }

    if (!form.categoryEn || !form.categoryAr) {
      setError("Please select a category.");
      setSaving(false);
      return;
    }

    if (!form.price.trim()) {
      setError("Price is required.");
      setSaving(false);
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock || 0);

    if (Number.isNaN(price) || price < 0) {
      setError("Please enter a valid price.");
      setSaving(false);
      return;
    }

    if (Number.isNaN(stock) || stock < 0) {
      setError("Please enter a valid stock quantity.");
      setSaving(false);
      return;
    }

    if (uploading) {
      setError(
        "Please wait until the image upload is complete."
      );
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
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update product"
        );
      }

      setProduct(data);
      setSuccess("Product updated successfully.");

      setTimeout(() => {
        router.push(`/products/${id}`);
        router.refresh();
      }, 700);
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
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-gray-600">
            Loading product...
          </p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Product not found
          </h1>

          <button
            type="button"
            onClick={() => router.push("/products")}
            className="mt-5 rounded-lg bg-black px-5 py-3 text-white"
          >
            Back to Products
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() =>
              router.push(`/products/${id}`)
            }
            className="text-sm font-medium text-gray-500 hover:text-black"
          >
            ← Back to Product
          </button>

          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Edit Product
          </h1>

          <p className="mt-1 text-gray-500">
            Update your master product information.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* Basic Information */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-gray-900">
              Basic Information
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* SKU */}
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  SKU *
                </label>

                <input
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 outline-none focus:border-black"
                />
              </div>

              {/* Price */}
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Price (QAR) *
                </label>

                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 outline-none focus:border-black"
                />
              </div>

              {/* English Name */}
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Product Name - English *
                </label>

                <input
                  name="nameEn"
                  value={form.nameEn}
                  onChange={handleChange}
                  dir="ltr"
                  required
                  placeholder="Roasted Almonds"
                  className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 outline-none focus:border-black"
                />
              </div>

              {/* Arabic Name */}
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Product Name - Arabic *
                </label>

                <input
                  name="nameAr"
                  value={form.nameAr}
                  onChange={handleChange}
                  dir="rtl"
                  required
                  placeholder="لوز محمص"
                  className="w-full rounded-lg border border-gray-300 p-3 text-right text-gray-900 outline-none focus:border-black"
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

              {/* English */}
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Description - English
                </label>

                <textarea
                  name="descriptionEn"
                  value={form.descriptionEn}
                  onChange={handleChange}
                  dir="ltr"
                  rows={5}
                  placeholder="Enter product description..."
                  className="w-full resize-none rounded-lg border border-gray-300 p-3 text-gray-900 outline-none focus:border-black"
                />
              </div>

              {/* Arabic */}
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Description - Arabic
                </label>

                <textarea
                  name="descriptionAr"
                  value={form.descriptionAr}
                  onChange={handleChange}
                  dir="rtl"
                  rows={5}
                  placeholder="أدخل وصف المنتج..."
                  className="w-full resize-none rounded-lg border border-gray-300 p-3 text-right text-gray-900 outline-none focus:border-black"
                />
              </div>

            </div>
          </section>

          {/* Category */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-gray-900">
              Category
            </h2>

            {categories.length === 0 ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm text-yellow-700">
                  No categories found.
                </p>

                <button
                  type="button"
                  onClick={() => router.push("/categories")}
                  className="mt-2 font-medium text-black underline"
                >
                  Create a category first →
                </button>
              </div>
            ) : (
              <>
                <label className="mb-2 block font-medium text-gray-700">
                  Select Category *
                </label>

                <select
                  value={
                    categories.find(
                      (category) =>
                        category.nameEn ===
                          form.categoryEn &&
                        category.nameAr ===
                          form.categoryAr
                    )?._id || ""
                  }
                  onChange={handleCategoryChange}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-black"
                >
                  <option value="">
                    Select a category
                  </option>

                  {categories
                    .filter(
                      (category) => category.active
                    )
                    .map((category) => (
                      <option
                        key={category._id}
                        value={category._id}
                      >
                        {category.nameEn} /{" "}
                        {category.nameAr}
                      </option>
                    ))}
                </select>

                {form.categoryEn &&
                  form.categoryAr && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-600">
                        English:{" "}
                        <span className="font-medium text-gray-900">
                          {form.categoryEn}
                        </span>
                      </p>

                      <p
                        dir="rtl"
                        className="mt-1 text-right text-sm text-gray-600"
                      >
                        العربية:{" "}
                        <span className="font-medium text-gray-900">
                          {form.categoryAr}
                        </span>
                      </p>
                    </div>
                  )}
              </>
            )}
          </section>

          {/* Image */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Product Image
            </h2>

            <p className="mb-5 text-sm text-gray-500">
              Upload a new image to Cloudinary.
              Maximum size: 5MB.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

              {/* Upload */}
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Choose New Image
                </label>

                <label
                  className={`flex min-h-[220px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition ${
                    uploading
                      ? "cursor-not-allowed border-gray-300 bg-gray-100"
                      : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                >
                  <div className="text-center">
                    <div className="mb-3 text-4xl">
                      📷
                    </div>

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
                <label className="mb-2 block font-medium text-gray-700">
                  Current Image
                </label>

                <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {form.image ? (
                    <>
                      <img
                        src={form.image}
                        alt={
                          form.nameEn ||
                          "Product image"
                        }
                        className="max-h-[220px] max-w-full object-contain"
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
                      <div className="mb-2 text-4xl">
                        🖼️
                      </div>

                      <p className="text-sm">
                        No image
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
                <label className="mb-2 block font-medium text-gray-700">
                  Stock
                </label>

                <input
                  name="stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 outline-none focus:border-black"
                />
              </div>

              {/* Active */}
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Product Status
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      active: !current.active,
                    }))
                  }
                  className={`flex w-full items-center justify-between rounded-lg border p-4 ${
                    form.active
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="text-left">
                    <p className="font-medium text-gray-800">
                      {form.active
                        ? "Product is ON"
                        : "Product is OFF"}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {form.active
                        ? "Product is active."
                        : "Product is inactive."}
                    </p>
                  </div>

                  <span
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      form.active
                        ? "bg-green-600"
                        : "bg-gray-400"
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

          {/* Buttons */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 rounded-lg bg-black p-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(`/products/${id}`)
              }
              disabled={saving}
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}