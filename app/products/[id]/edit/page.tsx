
"use client";

import {
  FormEvent,
  ChangeEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";

type Unit = "g" | "kg" | "pcs" | "ml" | "L";
type ProductType = "single" | "multiple";

type WeightOption = {
  weight: number;
  unit: Unit;
  price: number;
};

type Category = {
  _id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  active: boolean;
  productType?: ProductType;
  singleWeight?: number | null;
  singleUnit?: Unit | null;
  variants?: WeightOption[];
};

type Product = {
  _id: string;
  sku: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  image?: string;
  categoryEn: string;
  categoryAr: string;
  price: number;
  stock: number;
  active: boolean;
  productType?: ProductType;
  singleWeight?: number | null;
  singleUnit?: Unit | null;
  variants?: WeightOption[];
};

type ApiResult<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  product?: T;
  category?: T;
  categories?: T[];
  data?: T | T[];
  url?: string;
};

const UNITS: Unit[] = ["g", "kg", "pcs", "ml", "L"];

function getErrorMessage(
  data: { message?: string; error?: string } | null,
  fallback: string
) {
  return data?.message || data?.error || fallback;
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function getCategories(data: unknown): Category[] {
  if (Array.isArray(data)) {
    return data as Category[];
  }

  if (data && typeof data === "object") {
    const result = data as {
      categories?: Category[];
      data?: Category[] | { categories?: Category[] };
    };

    if (Array.isArray(result.categories)) {
      return result.categories;
    }

    if (Array.isArray(result.data)) {
      return result.data;
    }

    if (
      result.data &&
      !Array.isArray(result.data) &&
      Array.isArray(result.data.categories)
    ) {
      return result.data.categories;
    }
  }

  return [];
}

function getProduct(data: unknown): Product | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const result = data as {
    product?: Product;
    data?: Product;
    _id?: string;
  };

  if (result.product && typeof result.product === "object") {
    return result.product;
  }

  if (
    result.data &&
    !Array.isArray(result.data) &&
    typeof result.data === "object"
  ) {
    return result.data;
  }

  if (result._id) {
    return result as Product;
  }

  return null;
}

function normalizeVariants(value: unknown): WeightOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is WeightOption =>
        Boolean(
          item &&
            typeof item === "object" &&
            Number.isFinite(Number(item.weight)) &&
            UNITS.includes(item.unit) &&
            Number.isFinite(Number(item.price))
        )
    )
    .map((item) => ({
      weight: Number(item.weight),
      unit: item.unit,
      price: Number(item.price),
    }));
}

function normalizedWeightKey(variant: WeightOption): string {
  let amount = variant.weight;

  if (variant.unit === "kg") {
    amount *= 1000;
  } else if (variant.unit === "L") {
    amount *= 1000;
  }

  const normalizedUnit =
    variant.unit === "kg"
      ? "g"
      : variant.unit === "L"
        ? "ml"
        : variant.unit;

  return `${normalizedUnit}:${Number(amount.toFixed(6))}`;
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();

  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : String(rawId || "");

  const [product, setProduct] = useState<Product | null>(null);
  const [productType, setProductType] =
    useState<ProductType>("single");
  const [variants, setVariants] = useState<WeightOption[]>([]);
  const [singleWeight, setSingleWeight] = useState("");
  const [singleUnit, setSingleUnit] = useState<Unit>("g");
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

  const loadData = useCallback(async () => {
    if (!id) {
      setError("Product ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [productResponse, categoryResponse] = await Promise.all([
        fetch(`/api/products/${encodeURIComponent(id)}`, {
          cache: "no-store",
        }),
        fetch("/api/categories", {
          cache: "no-store",
        }),
      ]);

      const productData = await readJson<
        ApiResult<Product> | Product
      >(productResponse);

      const categoryData = await readJson<unknown>(categoryResponse);

      if (!productResponse.ok) {
        throw new Error(
          getErrorMessage(
            productData as ApiResult<Product> | null,
            "Failed to load product."
          )
        );
      }

      const loadedProduct = getProduct(productData);

      if (!loadedProduct) {
        throw new Error("Invalid product response from server.");
      }

      setProduct(loadedProduct);

      const loadedType: ProductType =
        loadedProduct.productType === "multiple"
          ? "multiple"
          : "single";

      setProductType(loadedType);
      setVariants(normalizeVariants(loadedProduct.variants));

      setSingleWeight(
        loadedProduct.singleWeight == null
          ? ""
          : String(loadedProduct.singleWeight)
      );

      setSingleUnit(
        loadedProduct.singleUnit &&
          UNITS.includes(loadedProduct.singleUnit)
          ? loadedProduct.singleUnit
          : "g"
      );

      setForm({
        sku: loadedProduct.sku || "",
        nameEn: loadedProduct.nameEn || "",
        nameAr: loadedProduct.nameAr || "",
        descriptionEn: loadedProduct.descriptionEn || "",
        descriptionAr: loadedProduct.descriptionAr || "",
        image: loadedProduct.image || "",
        categoryEn: loadedProduct.categoryEn || "",
        categoryAr: loadedProduct.categoryAr || "",
        price: String(loadedProduct.price ?? ""),
        stock: String(loadedProduct.stock ?? 0),
        active: loadedProduct.active ?? true,
      });

      if (categoryResponse.ok) {
        setCategories(getCategories(categoryData));
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error("Load product error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load product."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleCategoryChange(
    e: ChangeEvent<HTMLSelectElement>
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
    e: ChangeEvent<HTMLInputElement>
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

      const data = await readJson<ApiResult<unknown>>(response);

      if (!response.ok || !data?.url) {
        throw new Error(
          getErrorMessage(data, "Failed to upload image.")
        );
      }

      setForm((current) => ({
        ...current,
        image: data.url!,
      }));

      setSuccess("Image uploaded successfully.");
    } catch (err) {
      console.error("Image upload error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload image."
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

    setError("");
    setSuccess("");
  }

  function updateVariant(
    index: number,
    field: keyof WeightOption,
    value: string
  ) {
    setVariants((current) =>
      current.map((variant, i) => {
        if (i !== index) {
          return variant;
        }

        if (field === "unit") {
          return {
            ...variant,
            unit: value as Unit,
          };
        }

        return {
          ...variant,
          [field]: value === "" ? 0 : Number(value),
        };
      })
    );
  }

  function addVariant() {
    setVariants((current) => [
      ...current,
      {
        weight: 250,
        unit: "g",
        price: 0,
      },
    ]);
  }

  function removeVariant(index: number) {
    setVariants((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving || uploading) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const fail = (message: string) => {
      setError(message);
      setSaving(false);
    };

    if (!form.sku.trim()) {
      fail("SKU is required.");
      return;
    }

    if (!form.nameEn.trim()) {
      fail("English product name is required.");
      return;
    }

    if (!form.nameAr.trim()) {
      fail("Arabic product name is required.");
      return;
    }

    if (!form.categoryEn.trim() || !form.categoryAr.trim()) {
      fail("Please select a category.");
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock || 0);

    if (productType === "single") {
      if (!form.price.trim()) {
        fail("Price is required.");
        return;
      }

      if (!Number.isFinite(price) || price < 0) {
        fail("Please enter a valid price.");
        return;
      }
    }

    if (!Number.isFinite(stock) || stock < 0) {
      fail("Please enter a valid stock quantity.");
      return;
    }

    if (productType === "single" && singleWeight.trim()) {
      const weight = Number(singleWeight);

      if (!Number.isFinite(weight) || weight <= 0) {
        fail("Enter a valid single weight.");
        return;
      }
    }

    const cleanedVariants = variants.map((variant) => ({
      weight: Number(variant.weight),
      unit: variant.unit,
      price: Number(variant.price),
    }));

    if (productType === "multiple") {
      if (cleanedVariants.length === 0) {
        fail("Please add at least one weight option.");
        return;
      }

      const invalidVariant = cleanedVariants.some(
        (variant) =>
          !Number.isFinite(variant.weight) ||
          variant.weight <= 0 ||
          !UNITS.includes(variant.unit) ||
          !Number.isFinite(variant.price) ||
          variant.price < 0
      );

      if (invalidVariant) {
        fail("Add a valid weight, unit, and price for every option.");
        return;
      }

      const weightKeys = cleanedVariants.map(normalizedWeightKey);

      if (new Set(weightKeys).size !== weightKeys.length) {
        fail(
          "Duplicate weight options are not allowed. For example, 1 kg and 1000 g are the same weight."
        );
        return;
      }
    }

    if (uploading) {
      fail("Please wait until the image upload is complete.");
      return;
    }

    const basePrice =
      productType === "multiple"
        ? Math.min(...cleanedVariants.map((variant) => variant.price))
        : price;

    try {
      const response = await fetch(
        `/api/products/${encodeURIComponent(id)}`,
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
            image: form.image.trim(),
            categoryEn: form.categoryEn.trim(),
            categoryAr: form.categoryAr.trim(),
            price: basePrice,
            stock,
            active: form.active,
            productType,
            singleWeight:
              productType === "single" && singleWeight.trim()
                ? Number(singleWeight)
                : null,
            singleUnit:
              productType === "single" && singleWeight.trim()
                ? singleUnit
                : null,
            variants:
              productType === "multiple"
                ? cleanedVariants
                : [],
          }),
        }
      );

      const data = await readJson<
        ApiResult<Product> | Product
      >(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data as ApiResult<Product> | null,
            "Failed to update product."
          )
        );
      }

      const updatedProduct = getProduct(data);

      if (updatedProduct) {
        setProduct(updatedProduct);
      }

      setSuccess("Product updated successfully.");

      router.refresh();

      window.setTimeout(() => {
        router.push(`/products/${id}`);
      }, 700);
    } catch (err) {
      console.error("Update product error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update product."
      );

      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 md:p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-gray-600">Loading product...</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 md:p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Product not found
          </h1>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <button
            type="button"
            onClick={() => router.push("/products")}
            className="mt-5 rounded-lg bg-black px-5 py-3 text-white"
          >
            Back to Products
          </button>

          <button
            type="button"
            onClick={() => void loadData()}
            className="ml-3 mt-5 rounded-lg border px-5 py-3 text-gray-700"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  const matchingCategory = categories.find(
    (category) =>
      category.nameEn === form.categoryEn &&
      category.nameAr === form.categoryAr
  );

  const activeCategories = categories.filter(
    (category) =>
      category.active ||
      category._id === matchingCategory?._id
  );

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <button
            type="button"
            onClick={() => router.push(`/products/${id}`)}
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

          <p className="mt-2 text-sm text-gray-500">
            SKU: <span className="font-semibold">{product.sku}</span>
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-5 text-xl font-semibold text-gray-900">
              Basic Information
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="sku"
                  className="mb-2 block font-medium text-gray-700"
                >
                  SKU *
                </label>
                <input
                  id="sku"
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block font-medium text-gray-700"
                >
                  {productType === "multiple"
                    ? "Base Price (lowest weight price)"
                    : "Price (QAR) *"}
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    productType === "multiple"
                      ? String(basePriceDisplay(variants))
                      : form.price
                  }
                  onChange={handleChange}
                  required={productType === "single"}
                  disabled={productType === "multiple"}
                  className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-500"
                />
                {productType === "multiple" && (
                  <p className="mt-1 text-xs text-gray-500">
                    Automatically calculated from the lowest variant price.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="nameEn"
                  className="mb-2 block font-medium text-gray-700"
                >
                  Product Name - English *
                </label>
                <input
                  id="nameEn"
                  name="nameEn"
                  value={form.nameEn}
                  onChange={handleChange}
                  dir="ltr"
                  required
                  placeholder="Roasted Almonds"
                  className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="nameAr"
                  className="mb-2 block font-medium text-gray-700"
                >
                  Product Name - Arabic *
                </label>
                <input
                  id="nameAr"
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
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-5 text-xl font-semibold text-gray-900">
              Description
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="descriptionEn"
                  className="mb-2 block font-medium text-gray-700"
                >
                  Description - English
                </label>
                <textarea
                  id="descriptionEn"
                  name="descriptionEn"
                  value={form.descriptionEn}
                  onChange={handleChange}
                  dir="ltr"
                  rows={5}
                  placeholder="Enter product description..."
                  className="w-full resize-y rounded-lg border border-gray-300 p-3 text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="descriptionAr"
                  className="mb-2 block font-medium text-gray-700"
                >
                  Description - Arabic
                </label>
                <textarea
                  id="descriptionAr"
                  name="descriptionAr"
                  value={form.descriptionAr}
                  onChange={handleChange}
                  dir="rtl"
                  rows={5}
                  placeholder="أدخل وصف المنتج..."
                  className="w-full resize-y rounded-lg border border-gray-300 p-3 text-right text-gray-900 outline-none focus:border-black"
                />
              </div>
            </div>
          </section>

          {/* Category */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-5 text-xl font-semibold text-gray-900">
              Category
            </h2>

            {categories.length === 0 ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  Categories could not be loaded or none exist. You can retry
                  loading this product, or open the categories page.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/categories")}
                  className="mt-3 font-medium text-black underline"
                >
                  Open Categories →
                </button>
              </div>
            ) : (
              <>
                <label
                  htmlFor="category"
                  className="mb-2 block font-medium text-gray-700"
                >
                  Select Category *
                </label>

                <select
                  id="category"
                  value={matchingCategory?._id || ""}
                  onChange={handleCategoryChange}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-black"
                >
                  <option value="">Select a category</option>
                  {activeCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.nameEn} / {category.nameAr}
                      {!category.active ? " (Inactive)" : ""}
                    </option>
                  ))}
                </select>

                {form.categoryEn && form.categoryAr && (
                  <div className="mt-4 space-y-2 rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">
                      English:{" "}
                      <span className="font-medium text-gray-900">
                        {form.categoryEn}
                      </span>
                    </p>
                    <p
                      dir="rtl"
                      className="text-right text-sm text-gray-600"
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
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Product Image
            </h2>

            <p className="mb-5 text-sm text-gray-500">
              Upload a new image. Maximum size: 5MB.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 block font-medium text-gray-700">
                  Choose New Image
                </p>

                <label
                  className={`flex min-h-[220px] items-center justify-center rounded-lg border-2 border-dashed transition ${
                    uploading
                      ? "cursor-not-allowed border-gray-300 bg-gray-100"
                      : "cursor-pointer border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                >
                  <div className="p-4 text-center">
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
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    disabled={uploading || saving}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <p className="mb-2 block font-medium text-gray-700">
                  Current Image
                </p>

                <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-3">
                  {form.image ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.image}
                        alt={form.nameEn || "Product image"}
                        className="max-h-[220px] max-w-full object-contain"
                      />

                      <button
                        type="button"
                        onClick={removeImage}
                        disabled={saving || uploading}
                        className="absolute right-3 top-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-red-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <div className="text-center text-gray-400">
                      <div className="mb-2 text-4xl">🖼️</div>
                      <p className="text-sm">No image</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Weight Options */}
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Product Type & Weight Options
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Choose a single item or offer several sizes under the same SKU.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setProductType("single")}
                aria-pressed={productType === "single"}
                className={`rounded-lg border px-4 py-3 font-medium ${
                  productType === "single"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                Single Item
              </button>

              <button
                type="button"
                onClick={() => setProductType("multiple")}
                aria-pressed={productType === "multiple"}
                className={`rounded-lg border px-4 py-3 font-medium ${
                  productType === "multiple"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                Multiple Weight Items
              </button>
            </div>

            {productType === "single" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="singleWeight"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Weight (optional)
                  </label>
                  <input
                    id="singleWeight"
                    type="number"
                    min="0.001"
                    step="any"
                    value={singleWeight}
                    onChange={(e) => setSingleWeight(e.target.value)}
                    placeholder="Enter weight"
                    className="w-full rounded-lg border border-gray-300 p-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="singleUnit"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Unit
                  </label>
                  <select
                    id="singleUnit"
                    value={singleUnit}
                    onChange={(e) =>
                      setSingleUnit(e.target.value as Unit)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white p-3"
                  >
                    {UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {variants.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">
                    No weight options yet. Click “Add Weight” to create one.
                  </div>
                )}

                {variants.map((variant, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-2 md:grid-cols-4"
                  >
                    <div>
                      <label
                        htmlFor={`weight-${index}`}
                        className="mb-1 block text-xs font-medium text-gray-600"
                      >
                        Weight
                      </label>
                      <input
                        id={`weight-${index}`}
                        aria-label={`Weight ${index + 1}`}
                        type="number"
                        min="0.001"
                        step="any"
                        value={variant.weight}
                        onChange={(e) =>
                          updateVariant(index, "weight", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 p-3"
                        placeholder="Weight"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`unit-${index}`}
                        className="mb-1 block text-xs font-medium text-gray-600"
                      >
                        Unit
                      </label>
                      <select
                        id={`unit-${index}`}
                        aria-label={`Unit ${index + 1}`}
                        value={variant.unit}
                        onChange={(e) =>
                          updateVariant(index, "unit", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white p-3"
                      >
                        {UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor={`variant-price-${index}`}
                        className="mb-1 block text-xs font-medium text-gray-600"
                      >
                        Price (QAR)
                      </label>
                      <input
                        id={`variant-price-${index}`}
                        aria-label={`Price ${index + 1}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.price}
                        onChange={(e) =>
                          updateVariant(index, "price", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 p-3"
                        placeholder="Price"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="w-full rounded-lg bg-red-50 px-3 py-3 font-medium text-red-700 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addVariant}
                  className="rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
                >
                  + Add Weight
                </button>
              </div>
            )}

            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              One product SKU and one shared stock quantity for all weight
              options.
            </p>
          </section>

          {/* Inventory & Status */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-5 text-xl font-semibold text-gray-900">
              Inventory & Status
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="stock"
                  className="mb-2 block font-medium text-gray-700"
                >
                  Stock
                </label>
                <input
                  id="stock"
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 outline-none focus:border-black"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Shared stock for this product and its weight options.
                </p>
              </div>

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
                  aria-pressed={form.active}
                  className={`flex w-full items-center justify-between rounded-lg border p-4 ${
                    form.active
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="text-left">
                    <p className="font-medium text-gray-800">
                      {form.active ? "Product is ON" : "Product is OFF"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {form.active
                        ? "Product is active."
                        : "Product is inactive."}
                    </p>
                  </div>

                  <span
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      form.active ? "bg-green-600" : "bg-gray-400"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        form.active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 pb-8 sm:flex-row">
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 rounded-lg bg-black p-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : uploading
                  ? "Uploading image..."
                  : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/products/${id}`)}
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

function basePriceDisplay(variants: WeightOption[]): number {
  if (variants.length === 0) {
    return 0;
  }

  return Math.min(...variants.map((variant) => Number(variant.price) || 0));
}
