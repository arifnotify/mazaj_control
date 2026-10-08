"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useLanguage } from "../components/LanguageProvider";

type Product = {
  _id: string;
  sku: string;
  nameEn: string;
  nameAr: string;
  categoryEn?: string;
  categoryAr?: string;
  image?: string;
  price?: number;
  stock?: number;
  active?: boolean;
};

type ReceivingRecord = {
  _id: string;
  productId: Product | string;
  date: string;
  quantity: number;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
};

type FormState = {
  productId: string;
  date: string;
  quantity: string;
  note: string;
};

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLocalMonth(date = new Date()) {
  return getLocalDateKey(date).slice(0, 7);
}

function getProductFromRecord(
  record: ReceivingRecord
): Product | null {
  if (
    record.productId &&
    typeof record.productId === "object"
  ) {
    return record.productId;
  }

  return null;
}

export default function StockReceivingPage() {
  const { language, isArabic, t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [records, setRecords] = useState<ReceivingRecord[]>(
    []
  );

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  const [loadingRecords, setLoadingRecords] =
    useState(true);

  const [error, setError] = useState("");

  const [month, setMonth] = useState(getLocalMonth());

  // Date specifically used for printing
  const [printDate, setPrintDate] = useState(
    getLocalDateKey()
  );

  const [form, setForm] = useState<FormState>({
    productId: "",
    date: getLocalDateKey(),
    quantity: "",
    note: "",
  });

  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [saving, setSaving] = useState(false);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [search, setSearch] = useState("");

  // --------------------------------------------------
  // PRODUCT SEARCH
  // --------------------------------------------------

  const [productSearch, setProductSearch] = useState("");

  const [productDropdownOpen, setProductDropdownOpen] =
    useState(false);

  const productDropdownRef =
    useRef<HTMLDivElement | null>(null);

  const productSearchInputRef =
    useRef<HTMLInputElement | null>(null);

  // --------------------------------------------------
  // PRODUCT NAME
  // --------------------------------------------------

  function getProductName(product: Product | null) {
    if (!product) {
      return isArabic
        ? "منتج محذوف"
        : "Deleted Product";
    }

    return language === "ar"
      ? product.nameAr || product.nameEn || "-"
      : product.nameEn || product.nameAr || "-";
  }

  // --------------------------------------------------
  // SELECTED PRODUCT
  // --------------------------------------------------

  const selectedProduct = useMemo(() => {
    if (!form.productId) {
      return null;
    }

    return (
      products.find(
        (product) => product._id === form.productId
      ) || null
    );
  }, [products, form.productId]);

  // --------------------------------------------------
  // PRODUCT SEARCH FILTER
  // --------------------------------------------------

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();

    if (!query) {
      return products.slice(0, 100);
    }

    return products
      .filter((product) => {
        const sku =
          product.sku?.toLowerCase() || "";

        const nameEn =
          product.nameEn?.toLowerCase() || "";

        const nameAr =
          product.nameAr?.toLowerCase() || "";

        const categoryEn =
          product.categoryEn?.toLowerCase() || "";

        const categoryAr =
          product.categoryAr?.toLowerCase() || "";

        return (
          sku.includes(query) ||
          nameEn.includes(query) ||
          nameAr.includes(query) ||
          categoryEn.includes(query) ||
          categoryAr.includes(query)
        );
      })
      .slice(0, 100);
  }, [products, productSearch]);

  // --------------------------------------------------
  // CLOSE DROPDOWN OUTSIDE CLICK
  // --------------------------------------------------

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setProductDropdownOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // --------------------------------------------------
  // ESCAPE DROPDOWN
  // --------------------------------------------------

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProductDropdownOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  // --------------------------------------------------
  // SELECT PRODUCT
  // --------------------------------------------------

  function handleSelectProduct(product: Product) {
    updateForm("productId", product._id);

    setProductSearch("");

    setProductDropdownOpen(false);
  }

  // --------------------------------------------------
  // LOAD PRODUCTS
  // --------------------------------------------------

  async function loadProducts() {
    try {
      setLoadingProducts(true);

      const response = await fetch("/api/products", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load products"
        );
      }

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load products"
      );
    } finally {
      setLoadingProducts(false);
    }
  }

  // --------------------------------------------------
  // LOAD RECEIVING RECORDS
  // --------------------------------------------------

  async function loadRecords(
    selectedMonth = month
  ) {
    try {
      setLoadingRecords(true);
      setError("");

      const response = await fetch(
        `/api/stock-receiving?month=${selectedMonth}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load receiving records"
        );
      }

      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load receiving records"
      );
    } finally {
      setLoadingRecords(false);
    }
  }

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadRecords(month);
  }, [month]);

  // --------------------------------------------------
  // FORM CHANGE
  // --------------------------------------------------

  function updateForm(
    field: keyof FormState,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // --------------------------------------------------
  // RESET FORM
  // --------------------------------------------------

  function resetForm() {
    setForm({
      productId: "",
      date: getLocalDateKey(),
      quantity: "",
      note: "",
    });

    setProductSearch("");

    setProductDropdownOpen(false);

    setEditingId(null);
  }

  // --------------------------------------------------
  // SUBMIT
  // --------------------------------------------------

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!form.productId) {
      setError(
        isArabic
          ? "يرجى اختيار المنتج"
          : "Please select a product"
      );
      return;
    }

    if (!form.date) {
      setError(
        isArabic
          ? "يرجى اختيار التاريخ"
          : "Please select a date"
      );
      return;
    }

    const quantity = Number(form.quantity);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      setError(
        isArabic
          ? "يجب أن تكون الكمية رقماً صحيحاً أكبر من صفر"
          : "Quantity must be a whole number greater than 0"
      );
      return;
    }

    try {
      setSaving(true);

      const url = editingId
        ? `/api/stock-receiving/${editingId}`
        : "/api/stock-receiving";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: form.productId,
          date: form.date,
          quantity,
          note: form.note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            (editingId
              ? "Failed to update receiving"
              : "Failed to create receiving")
        );
      }

      resetForm();

      await loadRecords(month);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // EDIT
  // --------------------------------------------------

  function handleEdit(record: ReceivingRecord) {
    const product = getProductFromRecord(record);

    const productId =
      product?._id ||
      (typeof record.productId === "string"
        ? record.productId
        : "");

    setEditingId(record._id);

    setForm({
      productId,
      date: record.date,
      quantity: String(record.quantity),
      note: record.note || "",
    });

    setProductSearch("");

    setProductDropdownOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  async function handleDelete(
    record: ReceivingRecord
  ) {
    const product = getProductFromRecord(record);

    const productName = getProductName(product);

    const confirmed = window.confirm(
      isArabic
        ? `هل أنت متأكد أنك تريد حذف سجل "${productName}" بتاريخ ${record.date}؟`
        : `Are you sure you want to delete the receiving record for "${productName}" on ${record.date}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(record._id);
      setError("");

      const response = await fetch(
        `/api/stock-receiving/${record._id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete record"
        );
      }

      setRecords((current) =>
        current.filter(
          (item) => item._id !== record._id
        )
      );

      if (editingId === record._id) {
        resetForm();
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete record"
      );
    } finally {
      setActionLoading(null);
    }
  }

  // --------------------------------------------------
  // FILTER MONTHLY RECORDS
  // --------------------------------------------------

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return records;
    }

    return records.filter((record) => {
      const product = getProductFromRecord(record);

      const nameEn =
        product?.nameEn?.toLowerCase() || "";

      const nameAr =
        product?.nameAr?.toLowerCase() || "";

      const sku =
        product?.sku?.toLowerCase() || "";

      const note =
        record.note?.toLowerCase() || "";

      return (
        nameEn.includes(query) ||
        nameAr.includes(query) ||
        sku.includes(query) ||
        note.includes(query) ||
        record.date.includes(query)
      );
    });
  }, [records, search]);

  // --------------------------------------------------
  // PRINT RECORDS
  // --------------------------------------------------

  const printRecords = useMemo(() => {
    return records.filter(
      (record) => record.date === printDate
    );
  }, [records, printDate]);

  // --------------------------------------------------
  // PRINT SUMMARY
  //
  // Same product received multiple times on the
  // selected date will be combined into one row.
  // --------------------------------------------------

  const printSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        name: string;
        nameAr: string;
        sku: string;
        quantity: number;
        notes: string[];
      }
    >();

    printRecords.forEach((record) => {
      const product = getProductFromRecord(record);

      const productId =
        product?._id ||
        (typeof record.productId === "string"
          ? record.productId
          : record._id);

      const existing = map.get(productId);

      if (existing) {
        existing.quantity += Number(
          record.quantity || 0
        );

        if (record.note?.trim()) {
          existing.notes.push(record.note.trim());
        }
      } else {
        map.set(productId, {
          productId,
          name: product?.nameEn || "-",
          nameAr: product?.nameAr || "-",
          sku: product?.sku || "-",
          quantity: Number(
            record.quantity || 0
          ),
          notes: record.note?.trim()
            ? [record.note.trim()]
            : [],
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        a.name.localeCompare(b.name)
    );
  }, [printRecords]);

  // --------------------------------------------------
  // PRINT TOTAL
  // --------------------------------------------------

  const printTotal = useMemo(() => {
    return printSummary.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    );
  }, [printSummary]);

  // --------------------------------------------------
  // TOTAL QUANTITY
  // --------------------------------------------------

  const totalReceived = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) =>
        total + Number(record.quantity || 0),
      0
    );
  }, [filteredRecords]);

  // --------------------------------------------------
  // PRODUCT SUMMARY
  // --------------------------------------------------

  const productSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        name: string;
        nameAr: string;
        sku: string;
        quantity: number;
      }
    >();

    records.forEach((record) => {
      const product = getProductFromRecord(record);

      const productId =
        product?._id ||
        (typeof record.productId === "string"
          ? record.productId
          : record._id);

      const existing = map.get(productId);

      if (existing) {
        existing.quantity += Number(
          record.quantity || 0
        );
      } else {
        map.set(productId, {
          productId,
          name: product?.nameEn || "-",
          nameAr: product?.nameAr || "-",
          sku: product?.sku || "-",
          quantity: Number(
            record.quantity || 0
          ),
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.quantity - a.quantity
    );
  }, [records]);

  // --------------------------------------------------
  // FORMAT DATE
  // --------------------------------------------------

  function formatDate(dateString: string) {
    const [year, monthValue, day] =
      dateString.split("-");

    if (!year || !monthValue || !day) {
      return dateString;
    }

    return `${day}/${monthValue}/${year}`;
  }

  // --------------------------------------------------
  // FORMAT MONTH
  // --------------------------------------------------

  function formatMonth(monthString: string) {
    const [year, monthValue] =
      monthString.split("-");

    if (!year || !monthValue) {
      return monthString;
    }

    const date = new Date(
      Number(year),
      Number(monthValue) - 1,
      1
    );

    return new Intl.DateTimeFormat(
      isArabic ? "ar-QA" : "en-US",
      {
        month: "long",
        year: "numeric",
      }
    ).format(date);
  }

  // --------------------------------------------------
  // PRINT REPORT
  // --------------------------------------------------

  function handlePrint() {
    if (printRecords.length === 0) {
      window.alert(
        isArabic
          ? `لا توجد منتجات مستلمة بتاريخ ${formatDate(
              printDate
            )}`
          : `No products were received on ${formatDate(
              printDate
            )}`
      );

      return;
    }

    window.print();
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          .print-area,
          .print-area * {
            visibility: visible !important;
          }

          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 25px !important;
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .monthly-screen-report {
            display: none !important;
          }

          .daily-print-report {
            display: block !important;
          }

          @page {
            size: A4;
            margin: 12mm;
          }
        }

        .daily-print-report {
          display: none;
        }
      `}</style>

      <main
        className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="mx-auto max-w-[1500px]">

          {/* =========================================
              HEADER
          ========================================== */}

          <div className="no-print mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/"
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                <span>
                  {isArabic ? "→" : "←"}
                </span>

                {t("dashboard")}
              </Link>

              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {isArabic
                  ? "استلام المخزون"
                  : "Stock Receiving"}
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                {isArabic
                  ? "تسجيل المنتجات والكميات المستلمة يومياً."
                  : "Record products and quantities received each day."}
              </p>
            </div>
          </div>

          {/* =========================================
              ERROR
          ========================================== */}

          {error && (
            <div className="no-print mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                className="font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* =========================================
              ADD / EDIT FORM
          ========================================== */}

          <div className="no-print mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId
                    ? isArabic
                      ? "تعديل سجل الاستلام"
                      : "Edit Receiving"
                    : isArabic
                    ? "إضافة استلام جديد"
                    : "Add Stock Receiving"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {isArabic
                    ? "أدخل تفاصيل المنتجات التي وصلت إلى المتجر."
                    : "Enter the details of products received by the store."}
                </p>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {isArabic
                    ? "إلغاء"
                    : "Cancel"}
                </button>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
            >
              {/* DATE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  {isArabic ? "التاريخ" : "Date"}
                </label>

                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    updateForm(
                      "date",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                />
              </div>

              {/* SEARCHABLE PRODUCT */}

              <div
                ref={productDropdownRef}
                className="relative"
              >
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  {isArabic
                    ? "المنتج"
                    : "Product"}
                </label>

                <button
                  type="button"
                  onClick={() => {
                    if (loadingProducts) {
                      return;
                    }

                    setProductDropdownOpen(
                      (current) => !current
                    );

                    setTimeout(() => {
                      productSearchInputRef.current?.focus();
                    }, 50);
                  }}
                  disabled={loadingProducts}
                  className={`flex min-h-[50px] w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-start text-sm outline-none transition ${
                    productDropdownOpen
                      ? "border-gray-900 ring-2 ring-gray-100"
                      : "border-gray-300"
                  } ${
                    loadingProducts
                      ? "cursor-not-allowed bg-gray-100"
                      : "hover:border-gray-400"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {selectedProduct?.image ? (
                      <img
                        src={selectedProduct.image}
                        alt={getProductName(
                          selectedProduct
                        )}
                        className="h-8 w-8 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm">
                        📦
                      </div>
                    )}

                    <div className="min-w-0">
                      {selectedProduct ? (
                        <>
                          <p className="truncate font-semibold text-gray-900">
                            {getProductName(
                              selectedProduct
                            )}
                          </p>

                          <p className="truncate text-xs text-gray-400">
                            {selectedProduct.sku}
                          </p>
                        </>
                      ) : (
                        <span className="text-gray-500">
                          {loadingProducts
                            ? isArabic
                              ? "جاري التحميل..."
                              : "Loading..."
                            : isArabic
                            ? "اختر المنتج"
                            : "Select Product"}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="ml-2 shrink-0 text-gray-400">
                    {productDropdownOpen
                      ? "▲"
                      : "▼"}
                  </span>
                </button>

                {productDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
                    {/* SEARCH BOX */}

                    <div className="border-b border-gray-200 bg-gray-50 p-3">
                      <div className="relative">
                        <span
                          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${
                            isArabic
                              ? "right-3"
                              : "left-3"
                          }`}
                        >
                          🔍
                        </span>

                        <input
                          ref={
                            productSearchInputRef
                          }
                          type="text"
                          value={productSearch}
                          onChange={(e) =>
                            setProductSearch(
                              e.target.value
                            )
                          }
                          placeholder={
                            isArabic
                              ? "ابحث بالاسم أو SKU..."
                              : "Search by name or SKU..."
                          }
                          className={`w-full rounded-lg border border-gray-300 bg-white py-2.5 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100 ${
                            isArabic
                              ? "pr-10 pl-3"
                              : "pl-10 pr-3"
                          }`}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                        <span>
                          {isArabic
                            ? `${filteredProducts.length} نتيجة`
                            : `${filteredProducts.length} results`}
                        </span>

                        {products.length >
                          100 && (
                          <span>
                            {isArabic
                              ? "أول 100 نتيجة"
                              : "First 100 results"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PRODUCT LIST */}

                    <div className="max-h-80 overflow-y-auto">
                      {filteredProducts.length ===
                      0 ? (
                        <div className="px-4 py-10 text-center">
                          <div className="text-3xl">
                            🔍
                          </div>

                          <p className="mt-2 text-sm font-semibold text-gray-700">
                            {isArabic
                              ? "لم يتم العثور على المنتج"
                              : "No product found"}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {isArabic
                              ? "جرب اسم منتج أو SKU آخر"
                              : "Try another product name or SKU"}
                          </p>
                        </div>
                      ) : (
                        filteredProducts.map(
                          (product) => {
                            const selected =
                              form.productId ===
                              product._id;

                            return (
                              <button
                                key={product._id}
                                type="button"
                                onClick={() =>
                                  handleSelectProduct(
                                    product
                                  )
                                }
                                className={`flex w-full items-center gap-3 px-4 py-3 text-start transition ${
                                  selected
                                    ? "bg-gray-100"
                                    : "hover:bg-gray-50"
                                }`}
                              >
                                {product.image ? (
                                  <img
                                    src={
                                      product.image
                                    }
                                    alt={getProductName(
                                      product
                                    )}
                                    className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 object-cover"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100">
                                    📦
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-semibold text-gray-900">
                                      {getProductName(
                                        product
                                      )}
                                    </p>

                                    {product.active ===
                                      false && (
                                      <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                                        {isArabic
                                          ? "متوقف"
                                          : "OFF"}
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                    <span className="font-mono">
                                      {product.sku}
                                    </span>

                                    {product.categoryEn && (
                                      <>
                                        <span>
                                          •
                                        </span>

                                        <span>
                                          {language ===
                                          "ar"
                                            ? product.categoryAr ||
                                              product.categoryEn
                                            : product.categoryEn ||
                                              product.categoryAr}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {selected && (
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs text-white">
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          }
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* QUANTITY */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  {isArabic
                    ? "الكمية"
                    : "Quantity"}
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={(e) =>
                    updateForm(
                      "quantity",
                      e.target.value
                    )
                  }
                  placeholder={
                    isArabic
                      ? "مثال: 20"
                      : "Example: 20"
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                />
              </div>

              {/* NOTE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  {isArabic
                    ? "ملاحظة"
                    : "Note"}
                </label>

                <input
                  type="text"
                  value={form.note}
                  onChange={(e) =>
                    updateForm(
                      "note",
                      e.target.value
                    )
                  }
                  placeholder={
                    isArabic
                      ? "ملاحظة اختيارية"
                      : "Optional note"
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                />
              </div>

              {/* SUBMIT */}

              <div className="md:col-span-2 xl:col-span-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-gray-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60"
                >
                  {saving
                    ? isArabic
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : editingId
                    ? isArabic
                      ? "تحديث سجل الاستلام"
                      : "Update Receiving"
                    : isArabic
                    ? "إضافة الاستلام"
                    : "Add Receiving"}
                </button>
              </div>
            </form>
          </div>

          {/* =========================================
              PRINT DATE SELECTOR
          ========================================== */}

          <div className="no-print mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  🖨️{" "}
                  {isArabic
                    ? "طباعة حسب التاريخ"
                    : "Print by Date"}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  {isArabic
                    ? "اختر تاريخاً لطباعة جميع المنتجات المستلمة في ذلك اليوم فقط."
                    : "Select a date to print only the products received on that day."}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    {isArabic
                      ? "تاريخ الطباعة"
                      : "Print Date"}
                  </label>

                  <input
                    type="date"
                    value={printDate}
                    onChange={(e) =>
                      setPrintDate(
                        e.target.value
                      )
                    }
                    className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
                >
                  🖨️{" "}
                  {isArabic
                    ? "طباعة"
                    : "Print"}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-white px-3 py-1.5 font-medium text-gray-700">
                {formatDate(printDate)}
              </span>

              <span className="rounded-full bg-green-100 px-3 py-1.5 font-semibold text-green-700">
                {isArabic
                  ? `${printSummary.length} منتج`
                  : `${printSummary.length} products`}
              </span>

              <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-gray-700">
                {isArabic
                  ? `إجمالي: ${printTotal}`
                  : `Total: ${printTotal}`}
              </span>
            </div>
          </div>

          {/* =========================================
              PRINT AREA
          ========================================== */}

          <div className="print-area">

            {/* =======================================
                DAILY PRINT REPORT
            ======================================== */}

            <div className="daily-print-report">

              <div className="mb-7 border-b-2 border-gray-900 pb-5">
                <h1 className="text-2xl font-bold text-gray-900">
                  MAZAJ NUTS ROASTERY
                </h1>

                <h2 className="mt-2 text-xl font-bold text-gray-800">
                  {isArabic
                    ? "تقرير استلام المخزون"
                    : "Stock Receiving Report"}
                </h2>

                <div className="mt-3 flex justify-between text-sm text-gray-600">
                  <span>
                    {isArabic
                      ? "التاريخ:"
                      : "Date:"}{" "}
                    <strong>
                      {formatDate(printDate)}
                    </strong>
                  </span>

                  <span>
                    {isArabic
                      ? "عدد المنتجات:"
                      : "Products:"}{" "}
                    <strong>
                      {printSummary.length}
                    </strong>
                  </span>
                </div>
              </div>

              {printSummary.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-lg font-semibold text-gray-700">
                    {isArabic
                      ? "لا توجد منتجات مستلمة في هذا التاريخ."
                      : "No products were received on this date."}
                  </p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-900">
                      <th className="px-3 py-3 text-start text-sm font-bold">
                        {isArabic
                          ? "المنتج"
                          : "Product"}
                      </th>

                      <th className="px-3 py-3 text-start text-sm font-bold">
                        SKU
                      </th>

                      <th className="px-3 py-3 text-end text-sm font-bold">
                        {isArabic
                          ? "الكمية"
                          : "Quantity"}
                      </th>

                      <th className="px-3 py-3 text-start text-sm font-bold">
                        {isArabic
                          ? "ملاحظة"
                          : "Note"}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {printSummary.map(
                      (item) => (
                        <tr
                          key={item.productId}
                          className="border-b border-gray-300"
                        >
                          <td className="px-3 py-4">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {language ===
                                "ar"
                                  ? item.nameAr ||
                                    item.name
                                  : item.name ||
                                    item.nameAr}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {language ===
                                "ar"
                                  ? item.name
                                  : item.nameAr}
                              </p>
                            </div>
                          </td>

                          <td className="px-3 py-4 font-mono text-sm">
                            {item.sku}
                          </td>

                          <td className="px-3 py-4 text-end text-base font-bold">
                            {item.quantity}
                          </td>

                          <td className="px-3 py-4 text-sm text-gray-600">
                            {item.notes.length > 0
                              ? item.notes.join(
                                  ", "
                                )
                              : "-"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>

                  <tfoot>
                    <tr className="border-t-2 border-gray-900">
                      <td
                        colSpan={2}
                        className="px-3 py-4 text-start text-base font-bold"
                      >
                        {isArabic
                          ? "الإجمالي"
                          : "Total"}
                      </td>

                      <td className="px-3 py-4 text-end text-lg font-bold">
                        {printTotal}
                      </td>

                      <td />
                    </tr>
                  </tfoot>
                </table>
              )}

              <div className="mt-10 border-t border-gray-300 pt-4">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {isArabic
                      ? "تقرير استلام المخزون"
                      : "Stock Receiving Report"}
                  </span>

                  <span>
                    {new Date().toLocaleDateString(
                      isArabic
                        ? "ar-QA"
                        : "en-GB"
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* =======================================
                MONTHLY SCREEN REPORT
            ======================================== */}

            <div className="monthly-screen-report">

              {/* STATS */}

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-gray-500">
                    {isArabic
                      ? "إجمالي السجلات"
                      : "Total Records"}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {records.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-gray-500">
                    {isArabic
                      ? "إجمالي الكمية"
                      : "Total Quantity"}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-green-600">
                    {records.reduce(
                      (sum, record) =>
                        sum +
                        Number(
                          record.quantity || 0
                        ),
                      0
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-gray-500">
                    {isArabic
                      ? "المنتجات"
                      : "Products"}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-blue-600">
                    {productSummary.length}
                  </p>
                </div>
              </div>

              {/* MONTH + SEARCH */}

              <div className="no-print mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

                  <div className="w-full lg:max-w-xs">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      {isArabic
                        ? "الشهر"
                        : "Month"}
                    </label>

                    <input
                      type="month"
                      value={month}
                      onChange={(e) =>
                        setMonth(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                    />
                  </div>

                  <div className="w-full lg:max-w-md">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      {isArabic
                        ? "بحث"
                        : "Search"}
                    </label>

                    <input
                      type="text"
                      value={search}
                      onChange={(e) =>
                        setSearch(
                          e.target.value
                        )
                      }
                      placeholder={
                        isArabic
                          ? "بحث بالمنتج أو SKU أو التاريخ..."
                          : "Search product, SKU or date..."
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      loadRecords(month)
                    }
                    disabled={
                      loadingRecords
                    }
                    className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    ↻{" "}
                    {isArabic
                      ? "تحديث"
                      : "Refresh"}
                  </button>
                </div>

                <div className="mt-4 text-sm text-gray-500">
                  {formatMonth(month)}
                  {" — "}
                  {isArabic
                    ? `${filteredRecords.length} سجل`
                    : `${filteredRecords.length} records`}
                </div>
              </div>

              {/* PRODUCT SUMMARY */}

              <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 p-5">
                  <h2 className="text-lg font-bold text-gray-900">
                    {isArabic
                      ? "ملخص المنتجات"
                      : "Product Summary"}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {isArabic
                      ? `إجمالي الكميات المستلمة في ${formatMonth(
                          month
                        )}`
                      : `Total quantities received in ${formatMonth(
                          month
                        )}`}
                  </p>
                </div>

                {productSummary.length ===
                0 ? (
                  <div className="p-10 text-center text-sm text-gray-500">
                    {isArabic
                      ? "لا توجد بيانات لهذا الشهر"
                      : "No receiving data for this month"}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px]">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {isArabic
                              ? "المنتج"
                              : "Product"}
                          </th>

                          <th className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-wider text-gray-500">
                            SKU
                          </th>

                          <th className="px-5 py-4 text-end text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {isArabic
                              ? "إجمالي الكمية"
                              : "Total Received"}
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {productSummary.map(
                          (item) => (
                            <tr
                              key={
                                item.productId
                              }
                              className="hover:bg-gray-50"
                            >
                              <td className="px-5 py-4">
                                <p className="font-semibold text-gray-900">
                                  {language ===
                                  "ar"
                                    ? item.nameAr ||
                                      item.name
                                    : item.name ||
                                      item.nameAr}
                                </p>

                                <p className="mt-0.5 text-xs text-gray-400">
                                  {language ===
                                  "ar"
                                    ? item.name
                                    : item.nameAr}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-medium text-gray-600">
                                  {item.sku}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-end">
                                <span className="text-lg font-bold text-green-600">
                                  {item.quantity}
                                </span>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>

                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                          <td
                            colSpan={2}
                            className="px-5 py-4 text-start font-bold text-gray-900"
                          >
                            {isArabic
                              ? "الإجمالي"
                              : "Total"}
                          </td>

                          <td className="px-5 py-4 text-end text-lg font-bold text-gray-900">
                            {records.reduce(
                              (
                                sum,
                                record
                              ) =>
                                sum +
                                Number(
                                  record.quantity ||
                                    0
                                ),
                              0
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* DAILY RECORDS */}

              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 p-5">
                  <h2 className="text-lg font-bold text-gray-900">
                    {isArabic
                      ? "تفاصيل الاستلام اليومية"
                      : "Daily Receiving Details"}
                  </h2>
                </div>

                {loadingRecords ? (
                  <div className="p-12">
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map(
                        (item) => (
                          <div
                            key={item}
                            className="flex animate-pulse items-center gap-4"
                          >
                            <div className="h-10 w-24 rounded bg-gray-200" />

                            <div className="h-10 flex-1 rounded bg-gray-200" />

                            <div className="h-10 w-20 rounded bg-gray-200" />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : filteredRecords.length ===
                  0 ? (
                  <div className="p-12 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-3xl">
                      📦
                    </div>

                    <h3 className="mt-4 font-bold text-gray-900">
                      {search
                        ? isArabic
                          ? "لا توجد نتائج"
                          : "No results found"
                        : isArabic
                        ? "لا توجد سجلات"
                        : "No receiving records"}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {isArabic
                        ? "لم يتم تسجيل أي استلام لهذا الشهر."
                        : "No receiving records have been added for this month."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {isArabic
                              ? "التاريخ"
                              : "Date"}
                          </th>

                          <th className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {isArabic
                              ? "المنتج"
                              : "Product"}
                          </th>

                          <th className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-wider text-gray-500">
                            SKU
                          </th>

                          <th className="px-5 py-4 text-end text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {isArabic
                              ? "الكمية"
                              : "Quantity"}
                          </th>

                          <th className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {isArabic
                              ? "ملاحظة"
                              : "Note"}
                          </th>

                          <th className="no-print px-5 py-4 text-end text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {isArabic
                              ? "الإجراء"
                              : "Action"}
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {filteredRecords.map(
                          (record) => {
                            const product =
                              getProductFromRecord(
                                record
                              );

                            const isLoading =
                              actionLoading ===
                              record._id;

                            return (
                              <tr
                                key={
                                  record._id
                                }
                                className="transition hover:bg-gray-50"
                              >
                                <td className="px-5 py-4">
                                  <span className="font-medium text-gray-700">
                                    {formatDate(
                                      record.date
                                    )}
                                  </span>
                                </td>

                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                                      {product?.image ? (
                                        <img
                                          src={
                                            product.image
                                          }
                                          alt={getProductName(
                                            product
                                          )}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                          📦
                                        </div>
                                      )}
                                    </div>

                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {getProductName(
                                          product
                                        )}
                                      </p>

                                      <p className="text-xs text-gray-400">
                                        {language ===
                                        "ar"
                                          ? product?.nameEn ||
                                            "-"
                                          : product?.nameAr ||
                                            "-"}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-5 py-4">
                                  <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-medium text-gray-600">
                                    {product?.sku ||
                                      "-"}
                                  </span>
                                </td>

                                <td className="px-5 py-4 text-end">
                                  <span className="rounded-full bg-green-50 px-3 py-1.5 text-sm font-bold text-green-700">
                                    +{record.quantity}
                                  </span>
                                </td>

                                <td className="px-5 py-4">
                                  <span className="text-sm text-gray-500">
                                    {record.note ||
                                      "-"}
                                  </span>
                                </td>

                                <td className="no-print px-5 py-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleEdit(
                                          record
                                        )
                                      }
                                      disabled={
                                        isLoading
                                      }
                                      className="rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                                    >
                                      {isArabic
                                        ? "تعديل"
                                        : "Edit"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDelete(
                                          record
                                        )
                                      }
                                      disabled={
                                        isLoading
                                      }
                                      className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                                    >
                                      {isLoading
                                        ? "..."
                                        : isArabic
                                        ? "حذف"
                                        : "Delete"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>

                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                          <td
                            colSpan={3}
                            className="px-5 py-4 text-start font-bold text-gray-900"
                          >
                            {isArabic
                              ? "الإجمالي"
                              : "Total"}
                          </td>

                          <td className="px-5 py-4 text-end text-lg font-bold text-green-700">
                            +{totalReceived}
                          </td>

                          <td
                            colSpan={2}
                            className="no-print"
                          />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}