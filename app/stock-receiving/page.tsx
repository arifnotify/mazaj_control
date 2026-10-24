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

type StoreRequestItem = {
  productId: string;
  sku: string;
  nameEn: string;
  nameAr: string;
  quantity: number;
  note?: string;
};

type StoreRequest = {
  _id: string;
  date: string;
  items: StoreRequestItem[];
  requestNote?: string;
  createdAt?: string;
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


  // Open a Zoho Mail draft on desktop or the phone's configured mail app on mobile.
  // Configure Zoho Mail as the browser's default mailto handler on desktop.
  function openZohoEmail(to: string, subject: string, body: string) {
    const params = new URLSearchParams({ subject, body });
    const mailtoUrl = `mailto:${to}?${params.toString()}`;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      // If Zoho Mail is configured to handle mailto links, the app will open.
      window.location.href = mailtoUrl;
      return;
    }

    // On desktop, Zoho Mail's Mail-To Handler opens a prefilled Zoho compose draft.
    // If the handler is not configured, the browser may use its default mail app.
    window.location.href = mailtoUrl;
  }

  // iOS mailto handlers may open Zoho Mail but omit the body. Web Share lets
  // the user choose Zoho Mail from the iPhone share sheet and passes the text
  // as share content; the user still reviews and manually sends the email.
  async function shareEmailText(to: string, subject: string, body: string) {
    const shareText = `To: ${to}\nSubject: ${subject}\n\n${body}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: subject, text: shareText });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      window.alert("Email details copied. Open Zoho Mail, start a new email, and paste the copied details.");
    } catch {
      window.alert("Please copy the To, Subject, and Message from the preview manually, then paste them into Zoho Mail.");
    }
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

  // Store request list and daily history
  const [storeRequests, setStoreRequests] = useState<StoreRequest[]>([]);
  const [storeProductSearch, setStoreProductSearch] = useState("");
  const [storeSelectedProductId, setStoreSelectedProductId] = useState("");
  const [storeQuantity, setStoreQuantity] = useState("1");
  const [storeItemNote, setStoreItemNote] = useState("");
  const [storeRequestNote, setStoreRequestNote] = useState("");
  const [storeRequestDate, setStoreRequestDate] = useState(getLocalDateKey());
  const [storeRequestItems, setStoreRequestItems] = useState<StoreRequestItem[]>([]);
  const [storeDraftHydrated, setStoreDraftHydrated] = useState(false);
  const [storeRequestSaving, setStoreRequestSaving] = useState(false);
  const [emailDraft, setEmailDraft] = useState<{ to: string; subject: string; body: string } | null>(null);
  const [loadingStoreRequests, setLoadingStoreRequests] = useState(false);
  const [storeHistoryOpen, setStoreHistoryOpen] = useState(false);
  const [storeRequestFormOpen, setStoreRequestFormOpen] = useState(false);
  const [expandedRequestIds, setExpandedRequestIds] = useState<string[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [expandedSummaryDates, setExpandedSummaryDates] = useState<string[]>([]);
  const [expandedReceivingDates, setExpandedReceivingDates] = useState<string[]>([]);
  const [deletingStoreRequestId, setDeletingStoreRequestId] = useState<string | null>(null);


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
  // STORE REQUESTS: DAILY REQUESTS TO STOREKEEPER
  // --------------------------------------------------

  const filteredStoreProducts = useMemo(() => {
    const query = storeProductSearch.trim().toLowerCase();
    const available = products.filter((product) => product.active !== false);
    if (!query) return available.slice(0, 40);
    return available.filter((product) =>
      [product.sku, product.nameEn, product.nameAr, product.categoryEn, product.categoryAr]
        .some((value) => String(value || "").toLowerCase().includes(query))
    ).slice(0, 40);
  }, [products, storeProductSearch]);

  // Keep the unfinished request when navigating to another dashboard page.
  // Hydrate first so an empty initial state never overwrites the saved draft.
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem("mazaj_daily_store_stock_draft_v1");
      if (savedDraft) {
        const parsed: unknown = JSON.parse(savedDraft);
        if (Array.isArray(parsed)) {
          setStoreRequestItems(parsed.filter((item): item is StoreRequestItem =>
            item &&
            typeof item === "object" &&
            typeof item.productId === "string" &&
            typeof item.quantity === "number"
          ));
        }
      }
    } catch (err) {
      console.error("Could not restore store request draft", err);
    } finally {
      setStoreDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!storeDraftHydrated) return;
    try {
      localStorage.setItem(
        "mazaj_daily_store_stock_draft_v1",
        JSON.stringify(storeRequestItems)
      );
    } catch (err) {
      console.error("Could not save store request draft", err);
    }
  }, [storeRequestItems, storeDraftHydrated]);

  async function loadStoreRequests(selectedMonth = month) {
    try {
      setLoadingStoreRequests(true);
      const response = await fetch(`/api/store-requests?month=${encodeURIComponent(selectedMonth)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load store requests");
      setStoreRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load store requests");
    } finally {
      setLoadingStoreRequests(false);
    }
  }

  useEffect(() => {
    loadStoreRequests(month);
  }, [month]);

  function addStoreRequestItem() {
    const product = products.find((item) => item._id === storeSelectedProductId);
    const quantity = Number(storeQuantity);
    if (!product) {
      window.alert(isArabic ? "يرجى اختيار منتج أولاً." : "Please select a product first.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      window.alert(isArabic ? "أدخل كمية صحيحة." : "Enter a valid quantity.");
      return;
    }

    setStoreRequestItems((current) => {
      const existing = current.find((item) => item.productId === product._id);
      if (existing) {
        return current.map((item) => item.productId === product._id
          ? { ...item, quantity: item.quantity + quantity, note: [item.note, storeItemNote.trim()].filter(Boolean).join("; ") }
          : item);
      }
      return [...current, {
        productId: product._id,
        sku: product.sku || "-",
        nameEn: product.nameEn || product.nameAr || "-",
        nameAr: product.nameAr || product.nameEn || "-",
        quantity,
        note: storeItemNote.trim(),
      }];
    });
    setStoreSelectedProductId("");
    setStoreProductSearch("");
    setStoreQuantity("1");
    setStoreItemNote("");
  }

  async function submitStoreRequest() {
    if (storeRequestItems.length === 0) {
      window.alert(isArabic ? "أضف منتجاً واحداً على الأقل." : "Please add at least one product to the request.");
      return;
    }

    setStoreRequestSaving(true);
    setError("");
    try {
      const response = await fetch("/api/store-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: storeRequestDate,
          items: storeRequestItems,
          requestNote: storeRequestNote.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save store request");

      const savedRequest: StoreRequest = data.request;
      setStoreRequests((current) => [savedRequest, ...current].filter((item, index, arr) => arr.findIndex((other) => other._id === item._id) === index));

       // Build the email from the exact items selected in the form. Some API
       // responses return the saved request without its item array populated;
       // relying only on savedRequest.items can therefore create an empty email.
       const emailRequest: StoreRequest = {
         ...savedRequest,
         date: storeRequestDate,
         items: storeRequestItems,
         requestNote: storeRequestNote.trim(),
       };
       const { subject, body } = buildStoreRequestEmail(emailRequest);
       // Show a draft preview first. Opening Zoho from a direct click preserves
       // browser user activation for the mailto/app handoff.
       setEmailDraft({ to: "inventory@mazajnuts.com", subject, body });

      setStoreRequestItems([]);
      setStoreRequestNote("");
      setStoreProductSearch("");
      const requestMonth = storeRequestDate.slice(0, 7);
      setMonth(requestMonth);
      await loadStoreRequests(requestMonth);
      window.alert(isArabic
        ? "تم حفظ الطلب اليومي. راجع معاينة الرسالة، ثم افتح مسودة البريد لإرسال الطلب إلى مسؤول المخزن."
        : "Daily store request saved. Review the draft preview, then click Open Prefilled Email Draft to open it in your mail app.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to submit store request");
    } finally {
      setStoreRequestSaving(false);
    }
  }

  async function deleteStoreRequest(request: StoreRequest) {
    if (!window.confirm(isArabic
      ? `هل تريد حذف طلب ${request.date} نهائياً؟`
      : `Permanently delete store request dated ${request.date}?`)) return;
    try {
      setDeletingStoreRequestId(request._id);
      setError("");
      const response = await fetch(`/api/store-requests/${encodeURIComponent(request._id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete store request");
      setStoreRequests(current => current.filter(item => item._id !== request._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete store request");
    } finally {
      setDeletingStoreRequestId(null);
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

  // Delete all receiving records for a selected day. Product Summary is derived
  // from the same records, so both sections update together.
  async function deleteReceivingDay(date: string) {
    const dayRecords = records.filter(record => record.date === date);
    if (!dayRecords.length) return;
    const confirmed = window.confirm(isArabic
      ? `هل تريد حذف جميع سجلات الاستلام بتاريخ ${date} (${dayRecords.length} سجلات) نهائياً؟`
      : `Permanently delete ALL ${dayRecords.length} receiving records for ${date}? This also removes that day's Product Summary.`);
    if (!confirmed) return;
    setActionLoading(`day:${date}`);
    setError("");
    const deletedIds: string[] = [];
    try {
      for (const record of dayRecords) {
        const response = await fetch(`/api/stock-receiving/${encodeURIComponent(record._id)}`, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Failed to delete receiving record ${record._id}`);
        }
        deletedIds.push(record._id);
      }
      if (editingId && deletedIds.includes(editingId)) resetForm();
    } catch (err) {
      setError((err instanceof Error ? err.message : "Delete failed") +
        (deletedIds.length ? ` (${deletedIds.length} records were deleted before the error.)` : ""));
    } finally {
      // Reload the database state, including if only part of the batch succeeded.
      await loadRecords(month);
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


  // --------------------------------------------------
  // OPEN DAILY RECEIVING REPORT IN GMAIL
  // --------------------------------------------------

  function handleEmailReport() {
    if (printSummary.length === 0) {
      window.alert(
        isArabic
          ? `لا توجد منتجات مستلمة بتاريخ ${formatDate(printDate)}`
          : `No receiving records found for ${formatDate(printDate)}.`
      );
      return;
    }

    const productLines = printSummary.map((item, index) => {
      const productName =
        language === "ar"
          ? item.nameAr || item.name
          : item.name || item.nameAr;

      return [
        `${index + 1}. ${productName}`,
        `   SKU: ${item.sku}`,
        `   Quantity Received: ${item.quantity}`,
        `   Note: ${item.notes.join(", ") || "-"}`,
      ].join("\n");
    });

    const body = [
      "Dear Admin,",
      "",
      "MAZAJ NUTS ROASTERY",
      "Daily Stock Receiving Report",
      `Date: ${formatDate(printDate)}`,
      "",
      "Received Products:",
      "",
      ...productLines,
      "",
      "--------------------------------",
      `Total Products: ${printSummary.length}`,
      `Total Quantity Received: ${printTotal}`,
      "--------------------------------",
      "",
      "Best regards,",
      "MAZAJ NUTS ROASTERY",
    ].join("\n");

    const recipient = "admin@mazajnuts.com";
    const subject =
      `MAZAJ NUTS ROASTERY - Stock Receiving Report - ${formatDate(printDate)}`;

    openZohoEmail(recipient, subject, body);
  }

  // Use the dashboard language for both new and historical request emails.
  function buildStoreRequestEmail(request: StoreRequest) {
    const arabic = language === "ar";
    const subject = arabic
      ? `طلب تجهيز منتجات المتجر - ${request.date}`
      : `Store Stock Request - ${request.date}`;
    const itemLines = request.items.map((item, index) => {
      const name = arabic
        ? item.nameAr || item.nameEn
        : item.nameEn || item.nameAr;
      return [
        `${index + 1}. ${name}`,
        `   ${arabic ? "الكمية المطلوبة" : "Quantity"}: ${item.quantity}`,
        item.note ? `   ${arabic ? "ملاحظة" : "Note"}: ${item.note}` : "",
      ].filter(Boolean).join("\n");
    });
    const body = [
      arabic ? "السلام عليكم،" : "Dear Storekeeper,",
      "",
      arabic
        ? "يرجى تجهيز المنتجات التالية للمتجر:"
        : "Please prepare the following items for the shop:",
      `${arabic ? "التاريخ" : "Date"}: ${request.date}`,
      "",
      ...itemLines,
      request.requestNote
        ? `\n${arabic ? "ملاحظات إضافية" : "Request note"}: ${request.requestNote}`
        : "",
      "",
      arabic ? "شكراً لكم،" : "Thank you,",
      "Mazaj Nuts Roastery",
    ].filter(Boolean).join("\n");
    return { subject, body };
  }

  function openStoreRequestEmail(request: StoreRequest) {
    const { subject, body } = buildStoreRequestEmail(request);
    openZohoEmail("inventory@mazajnuts.com", subject, body);
  }

  const receivingByDate = useMemo(() => {
    const groups = new Map<string, ReceivingRecord[]>();
    filteredRecords.forEach(record => {
      groups.set(record.date, [...(groups.get(record.date) || []), record]);
    });
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredRecords]);

  const summaryByDate = useMemo(() => {
    return receivingByDate.map(([date, dailyRecords]) => {
      const summary = new Map<string, { productId: string; name: string; nameAr: string; sku: string; quantity: number }>();
      dailyRecords.forEach(record => {
        const product = getProductFromRecord(record);
        const productId = product?._id || (typeof record.productId === "string" ? record.productId : record._id);
        const previous = summary.get(productId);
        if (previous) previous.quantity += Number(record.quantity || 0);
        else summary.set(productId, { productId, name: product?.nameEn || "-", nameAr: product?.nameAr || "-", sku: product?.sku || "-", quantity: Number(record.quantity || 0) });
      });
      return { date, products: [...summary.values()], total: dailyRecords.reduce((sum, record) => sum + Number(record.quantity || 0), 0) };
    });
  }, [receivingByDate]);

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
        className="min-h-screen bg-slate-50 p-3 sm:p-6 lg:p-8 font-sans text-slate-950"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="mx-auto max-w-[1500px] space-y-6">

          {/* =========================================
              HEADER
          ========================================== */}

          <div className="no-print rounded-2xl bg-white p-5 sm:p-6 shadow-xs border border-slate-200 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/"
                className="mb-2 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
              >
                <span>
                  {isArabic ? "→" : "←"}
                </span>

                {t("dashboard")}
              </Link>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {isArabic
                  ? "استلام المخزون"
                  : "Stock Receiving"}
              </h1>

              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                {isArabic
                  ? "تسجيل المنتجات والكميات المستلمة يومياً."
                  : "Record products and quantities received each day."}
              </p>
            </div>
          </div>

          {/* =========================================
              DAILY STORE STOCK REQUEST
          ========================================== */}
          <section className="no-print overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <button
              type="button"
              onClick={() => setStoreRequestFormOpen((open) => !open)}
              aria-expanded={storeRequestFormOpen}
              className="flex w-full items-center justify-between gap-3 p-4 text-start transition hover:bg-slate-50 sm:p-5"
            >
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">{isArabic ? "طلب مخزون المتجر" : "Daily Store Stock Request"}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {storeRequestItems.length > 0
                    ? `${storeRequestItems.length} ${isArabic ? "منتجات مضافة" : "items added"} · ${isArabic ? "إجمالي الكمية" : "Total qty"}: ${storeRequestItems.reduce((sum, item) => sum + item.quantity, 0)}`
                    : (isArabic ? "اضغط لفتح النموذج وإضافة المنتجات" : "Tap to open the form and add products")}
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-600">
                {storeRequestFormOpen ? "−" : "+"}
              </span>
            </button>

            {storeRequestFormOpen && <div className="space-y-5 border-t border-slate-200 p-4 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-4">
                <p className="text-xs sm:text-sm text-slate-500">{isArabic ? "اختر المنتجات والكميات المطلوبة وأرسلها إلى مسؤول المخزن." : "Quickly select the products and quantities the shop needs, then email the storekeeper."}</p>
                <div className="self-start rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700">To: inventory@mazajnuts.com</div>
              </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">{isArabic ? "تاريخ الطلب" : "Request Date"}</label>
                <input type="date" value={storeRequestDate} onChange={(e) => setStoreRequestDate(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 shadow-2xs" />
              </div>
              <div className="md:col-span-3">
                <label className="mb-2 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">{isArabic ? "ابحث عن منتج" : "Search Product"}</label>
                <input value={storeProductSearch} onChange={(e) => { setStoreProductSearch(e.target.value); setStoreSelectedProductId(""); }} placeholder={isArabic ? "اسم المنتج أو SKU..." : "Search by product name or SKU..."} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 shadow-2xs" />
                {storeProductSearch.trim() && (
                  <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {filteredStoreProducts.length === 0 ? <p className="p-3 text-sm text-slate-500">{isArabic ? "لا توجد منتجات" : "No products found"}</p> : filteredStoreProducts.map((product) => (
                      <button key={product._id} type="button" onClick={() => { setStoreSelectedProductId(product._id); setStoreProductSearch(getProductName(product)); }} className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-slate-50 transition ${storeSelectedProductId === product._id ? "bg-slate-100" : ""}`}>
                        {product.image ? <img src={product.image} alt={getProductName(product)} className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400">📦</div>}
                        <span className="min-w-0 flex-1"><span className="block font-bold text-slate-900">{getProductName(product)}</span><span className="block text-xs text-slate-400 font-mono">SKU: {product.sku}</span></span>
                      </button>
                    ))}
                  </div>
                )}
                {storeSelectedProductId && <p className="mt-1.5 text-xs font-semibold text-emerald-600">{isArabic ? "تم اختيار المنتج" : "Selected product"}: {getProductName(products.find((item) => item._id === storeSelectedProductId) || null)}</p>}
              </div>
              <div>
                <label className="mb-2 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">{isArabic ? "الكمية المطلوبة" : "Quantity Needed"}</label>
                <input type="number" min="1" step="1" value={storeQuantity} onChange={(e) => setStoreQuantity(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 shadow-2xs" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">{isArabic ? "ملاحظة للمنتج (اختياري)" : "Item Note (optional)"}</label>
                <input value={storeItemNote} onChange={(e) => setStoreItemNote(e.target.value)} placeholder={isArabic ? "مثال: مطلوب بشكل عاجل" : "e.g. Urgent / preferred pack size"} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 shadow-2xs" />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={addStoreRequestItem} disabled={!storeSelectedProductId} className="min-h-12 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 transition shadow-2xs">+ {isArabic ? "إضافة إلى الطلب" : "Add to Request"}</button>
              </div>
            </div>

            {storeDraftHydrated && storeRequestItems.length > 0 && (
              <p className="text-xs font-medium text-emerald-700">
                {isArabic ? "تم حفظ المسودة تلقائياً على هذا الجهاز." : "Draft auto-saved on this device. It will stay here when you visit another page."}
              </p>
            )}

            {storeRequestItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {isArabic ? "المنتجات المضافة" : "Added items"}
                  </h3>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {storeRequestItems.length} {isArabic ? "منتجات" : "items"}
                  </span>
                </div>

                {/* Mobile-friendly product cards */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {storeRequestItems.map((item) => {
                    const product = products.find((p) => p._id === item.productId);
                    return (
                      <article key={item.productId} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-start gap-3">
                          {product?.image
                            ? <img src={product.image} alt={item.nameEn} className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover" />
                            : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">📦</div>}
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-extrabold leading-5 text-slate-900">
                              {language === "ar" ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}
                            </p>
                            <p className="mt-1 text-xs font-mono text-slate-500">SKU: {item.sku}</p>
                            {item.note && <p className="mt-1 break-words text-xs text-slate-600">{item.note}</p>}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <div>
                            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {isArabic ? "الكمية المطلوبة" : "Quantity needed"}
                            </span>
                            <span className="text-xl font-black tabular-nums text-slate-900">{item.quantity}</span>
                          </div>
                          <button type="button"
                            onClick={() => setStoreRequestItems((current) => current.filter((row) => row.productId !== item.productId))}
                            className="min-h-11 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 active:bg-rose-100">
                            {isArabic ? "إزالة" : "Remove"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
                    <span className="text-sm font-semibold">{isArabic ? "إجمالي الكمية" : "Total quantity"}</span>
                    <span className="text-xl font-black tabular-nums">{storeRequestItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">SKU</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Qty Needed</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Note</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {storeRequestItems.map((item) => {
                        const product = products.find((p) => p._id === item.productId);
                        return (
                          <tr key={item.productId} className="transition hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {product?.image
                                  ? <img src={product.image} alt={item.nameEn} className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover" />
                                  : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">📦</div>}
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 sm:text-sm">{language === "ar" ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}</div>
                                  <div className="font-mono text-xs text-slate-400">SKU: {item.sku}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.sku}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900">{item.quantity}</td>
                            <td className="px-4 py-3 text-xs text-slate-600">{item.note || "-"}</td>
                            <td className="px-4 py-3 text-right">
                              <button type="button" onClick={() => setStoreRequestItems((current) => current.filter((row) => row.productId !== item.productId))}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100">
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50 font-bold text-slate-900">
                      <tr>
                        <td colSpan={2} className="px-4 py-3">Total</td>
                        <td className="px-4 py-3 text-right">{storeRequestItems.reduce((sum, item) => sum + item.quantity, 0)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] pt-2">
              <textarea value={storeRequestNote} onChange={(e) => setStoreRequestNote(e.target.value)} rows={2} placeholder={isArabic ? "ملاحظة عامة للطلب (اختياري)" : "Overall note for the storekeeper (optional)"} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 shadow-2xs" />
              <button type="button" onClick={submitStoreRequest} disabled={storeRequestSaving || storeRequestItems.length === 0} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition shadow-sm self-end">{storeRequestSaving ? (isArabic ? "جارٍ الحفظ..." : "Saving...") : (isArabic ? "حفظ وإرسال بالبريد" : "Save & Email Storekeeper")}</button>
            </div>
            <p className="text-xs text-slate-400">{isArabic ? "يُحفظ الطلب في سجل لوحة التحكم. سيفتح البريد كمسودة ويجب الضغط على إرسال." : "Each request is saved in dashboard history. The email opens as a draft; click Send to send it."}</p>
            </div>}
          </section>

          {/* Collapsible store request history */}
          <section className="no-print rounded-2xl border border-slate-200 bg-white shadow-xs">
            <button type="button" onClick={() => setStoreHistoryOpen(v => !v)}
              aria-expanded={storeHistoryOpen}
              className="flex w-full items-center justify-between gap-3 p-5 text-start sm:p-6 hover:bg-slate-50/50 transition rounded-2xl">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{isArabic ? "سجل طلبات المخزن" : "Store Request History"}</h2>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500">{month} · {storeRequests.length} {isArabic ? "طلبات" : "requests"}</p>
              </div>
              <span className="text-xl font-bold text-slate-400">{storeHistoryOpen ? "−" : "+"}</span>
            </button>
            {storeHistoryOpen && <div className="space-y-3 border-t border-slate-200 p-5 sm:p-6">
              {loadingStoreRequests ? <p className="text-sm text-slate-400">{isArabic ? "جارٍ التحميل..." : "Loading..."}</p> :
                storeRequests.length === 0 ? <p className="text-sm text-slate-400">{isArabic ? "لا توجد طلبات" : "No requests this month"}</p> :
                storeRequests.map(request => {
                  const expanded = expandedRequestIds.includes(request._id);
                  return <div key={request._id} className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <button type="button" aria-expanded={expanded}
                        onClick={() => setExpandedRequestIds(current => expanded ? current.filter(id => id !== request._id) : [...current, request._id])}
                        className="flex flex-1 items-center justify-between gap-3 text-start">
                        <span className="font-bold text-slate-900 text-sm">{request.date} <span className="text-xs font-normal text-slate-500">({request.items.length} {isArabic ? "منتجات" : "products"})</span></span>
                        <span className="text-slate-400 font-bold">{expanded ? "−" : "+"}</span>
                      </button>
                      <button type="button" onClick={() => void deleteStoreRequest(request)}
                        disabled={deletingStoreRequestId === request._id}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition">
                        {deletingStoreRequestId === request._id ? "..." : isArabic ? "حذف" : "Delete"}
                      </button>
                    </div>
                    {expanded && <div className="space-y-3 border-t border-slate-200 p-4 bg-white">
                      <div className="flex flex-wrap gap-2">{request.items.map((item, i) =>
                        <span key={`${item.productId}-${i}`} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200/60">
                          {isArabic ? item.nameAr || item.nameEn : item.nameEn || item.nameAr} × <strong className="text-slate-900">{item.quantity}</strong>
                          {item.note ? ` — ${item.note}` : ""}
                        </span>)}</div>
                      {request.requestNote && <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg">{request.requestNote}</p>}
                      <button type="button" onClick={() => openStoreRequestEmail(request)}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs sm:text-sm font-bold text-blue-700 hover:bg-blue-100 transition shadow-2xs">
                        {isArabic ? "فتح مسودة البريد" : "Open Email Draft"}
                      </button>
                    </div>}
                  </div>;
                })}
            </div>}
          </section>

          {/* =========================================
              ERROR
          ========================================== */}

          {error && (
            <div className="no-print flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-2xs">
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

          <div className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId
                    ? isArabic
                      ? "تعديل سجل الاستلام"
                      : "Edit Receiving"
                    : isArabic
                    ? "إضافة استلام جديد"
                    : "Add Stock Receiving"}
                </h2>

                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  {isArabic
                    ? "أدخل تفاصيل المنتجات التي وصلت إلى المتجر."
                    : "Enter the details of products received by the store."}
                </p>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
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
                <label className="mb-2 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 shadow-2xs"
                />
              </div>

              {/* SEARCHABLE PRODUCT */}

              <div
                ref={productDropdownRef}
                className="relative"
              >
                <label className="mb-2 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
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
                  className={`flex min-h-[46px] w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-start text-sm outline-none transition shadow-2xs ${
                    productDropdownOpen
                      ? "border-slate-900 ring-2 ring-slate-100"
                      : "border-slate-300"
                  } ${
                    loadingProducts
                      ? "cursor-not-allowed bg-slate-100"
                      : "hover:border-slate-400"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {selectedProduct?.image ? (
                      <img
                        src={selectedProduct.image}
                        alt={getProductName(
                          selectedProduct
                        )}
                        className="h-8 w-8 shrink-0 rounded-lg object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm">
                        📦
                      </div>
                    )}

                    <div className="min-w-0">
                      {selectedProduct ? (
                        <>
                          <p className="truncate font-bold text-slate-900 text-xs sm:text-sm">
                            {getProductName(
                              selectedProduct
                            )}
                          </p>

                          <p className="truncate text-[11px] text-slate-400 font-mono">
                            {selectedProduct.sku}
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-500 font-medium text-xs sm:text-sm">
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

                  <span className="ml-2 shrink-0 text-slate-400 text-xs">
                    {productDropdownOpen
                      ? "▲"
                      : "▼"}
                  </span>
                </button>

                {productDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    {/* SEARCH BOX */}

                    <div className="border-b border-slate-200 bg-slate-50/80 p-3">
                      <div className="relative">
                        <span
                          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                            isArabic
                              ? "right-3.5"
                              : "left-3.5"
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
                          className={`w-full rounded-xl border border-slate-300 bg-white py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-slate-900 shadow-2xs ${
                            isArabic
                              ? "pr-10 pl-3.5"
                              : "pl-10 pr-3.5"
                          }`}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-slate-400 px-1">
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

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {filteredProducts.length ===
                      0 ? (
                        <div className="px-4 py-10 text-center">
                          <div className="text-3xl">
                            🔍
                          </div>

                          <p className="mt-2 text-sm font-bold text-slate-900">
                            {isArabic
                              ? "لم يتم العثور على المنتج"
                              : "No product found"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
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
                                    ? "bg-slate-100"
                                    : "hover:bg-slate-50"
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
                                    className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 object-cover"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
                                    📦
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-xs sm:text-sm font-bold text-slate-900">
                                      {getProductName(
                                        product
                                      )}
                                    </p>

                                    {product.active ===
                                      false && (
                                      <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                                        {isArabic
                                          ? "متوقف"
                                          : "OFF"}
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
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
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs text-white font-bold">
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
                <label className="mb-2 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 shadow-2xs"
                />
              </div>

              {/* NOTE */}

              <div>
                <label className="mb-2 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 shadow-2xs"
                />
              </div>

              {/* SUBMIT */}

              <div className="md:col-span-2 xl:col-span-4 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 shadow-sm"
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

          <div className="no-print rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-xs">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  🖨️{" "}
                  {isArabic
                    ? "طباعة حسب التاريخ"
                    : "Print by Date"}
                </h2>

                <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
                  {isArabic
                    ? "اختر تاريخاً لطباعة جميع المنتجات المستلمة في ذلك اليوم فقط."
                    : "Select a date to print only the products received on that day."}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div>
                  <label className="mb-2 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
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
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 shadow-2xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                >
                  🖨️{" "}
                  {isArabic
                    ? "طباعة"
                    : "Print"}
                </button>

                <button
                  type="button"
                  onClick={handleEmailReport}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  ✉️{" "}
                  {isArabic ? "فتح البريد الإلكتروني" : "Open Email Draft"}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-bold">
              <span className="rounded-xl bg-white px-3.5 py-1.5 text-slate-700 border border-slate-200/60 shadow-2xs">
                {formatDate(printDate)}
              </span>

              <span className="rounded-xl bg-emerald-50 px-3.5 py-1.5 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                {isArabic
                  ? `${printSummary.length} منتج`
                  : `${printSummary.length} products`}
              </span>

              <span className="rounded-xl bg-white px-3.5 py-1.5 text-slate-700 border border-slate-200/60 shadow-2xs">
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

              <div className="mb-7 border-b-2 border-slate-900 pb-5">
                <h1 className="text-2xl font-bold text-slate-900">
                  MAZAJ NUTS ROASTERY
                </h1>

                <h2 className="mt-2 text-xl font-bold text-slate-800">
                  {isArabic
                    ? "تقرير استلام المخزون"
                    : "Stock Receiving Report"}
                </h2>

                <div className="mt-3 flex justify-between text-sm text-slate-600">
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
                  <p className="text-lg font-bold text-slate-700">
                    {isArabic
                      ? "لا توجد منتجات مستلمة في هذا التاريخ."
                      : "No products were received on this date."}
                  </p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900">
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
                          className="border-b border-slate-300"
                        >
                          <td className="px-3 py-4">
                            <div>
                              <p className="font-bold text-slate-900">
                                {language ===
                                "ar"
                                  ? item.nameAr ||
                                    item.name
                                  : item.name ||
                                    item.nameAr}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
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

                          <td className="px-3 py-4 text-sm text-slate-600">
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
                    <tr className="border-t-2 border-slate-900">
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

              <div className="mt-10 border-t border-slate-300 pt-4">
                <div className="flex justify-between text-xs text-slate-500">
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

            <div className="monthly-screen-report space-y-6">

              {/* STATS */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                    {isArabic
                      ? "إجمالي السجلات"
                      : "Total Records"}
                  </p>

                  <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
                    {records.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                    {isArabic
                      ? "إجمالي الكمية"
                      : "Total Quantity"}
                  </p>

                  <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600">
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

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                    {isArabic
                      ? "المنتجات"
                      : "Products"}
                  </p>

                  <p className="mt-2 text-2xl sm:text-3xl font-black text-blue-600">
                    {productSummary.length}
                  </p>
                </div>
              </div>

              {/* MONTH + SEARCH */}

              <div className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

                  <div className="w-full lg:max-w-xs">
                    <label className="mb-2 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
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
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 shadow-2xs"
                    />
                  </div>

                  <div className="w-full lg:max-w-md">
                    <label className="mb-2 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
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
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 shadow-2xs"
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
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-2xs transition"
                  >
                    ↻{" "}
                    {isArabic
                      ? "تحديث"
                      : "Refresh"}
                  </button>
                </div>

                <div className="mt-4 text-xs sm:text-sm font-semibold text-slate-500">
                  {formatMonth(month)}
                  {" — "}
                  {isArabic
                    ? `${filteredRecords.length} سجل`
                    : `${filteredRecords.length} records`}
                </div>
              </div>

              {/* Daily product summary: collapsed by default */}
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <button type="button" aria-expanded={summaryOpen} onClick={() => setSummaryOpen(v => !v)}
                  className="flex w-full items-center justify-between p-5 text-start hover:bg-slate-50/50 transition">
                  <div><h2 className="text-lg font-bold text-slate-900">{isArabic ? "ملخص المنتجات حسب اليوم" : "Product Summary by Day"}</h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{summaryByDate.length} {isArabic ? "أيام" : "days"}</p></div>
                  <span className="text-xl font-bold text-slate-400">{summaryOpen ? "−" : "+"}</span>
                </button>
                {summaryOpen && <div className="space-y-3 border-t border-slate-200 p-4 sm:p-5">
                  {summaryByDate.length === 0 ? <p className="text-sm text-slate-400">{isArabic ? "لا توجد بيانات" : "No records"}</p> :
                    summaryByDate.map(day => {
                      const expanded = expandedSummaryDates.includes(day.date);
                      return <div key={day.date} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50">
                        <button type="button" aria-expanded={expanded}
                          onClick={() => setExpandedSummaryDates(current => expanded ? current.filter(d => d !== day.date) : [...current, day.date])}
                          className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-start">
                          <span className="font-bold text-slate-900 text-sm">{formatDate(day.date)} <span className="text-xs font-normal text-slate-500">· {day.products.length} {isArabic ? "منتجات" : "products"} · {day.total} {isArabic ? "وحدات" : "units"}</span></span>
                          <span className="text-slate-400 font-bold">{expanded ? "−" : "+"}</span>
                        </button>
                        <div className="border-t border-slate-200 px-4 py-2 text-end bg-white"><button type="button" disabled={actionLoading !== null}
                          onClick={() => void deleteReceivingDay(day.date)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition">
                          {actionLoading === `day:${day.date}` ? "..." : isArabic ? "حذف اليوم بالكامل" : "Delete Entire Day"}
                        </button></div>
                        {expanded && <div className="overflow-x-auto border-t border-slate-200 bg-white"><table className="w-full min-w-[500px] text-left text-sm">
                          <thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-600"><th className="px-4 py-3 font-bold text-xs uppercase tracking-wider">{isArabic ? "المنتج" : "Product"}</th><th className="px-4 py-3 font-bold text-xs uppercase tracking-wider">SKU</th><th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-right">{isArabic ? "الكمية" : "Quantity"}</th></tr></thead>
                          <tbody className="divide-y divide-slate-100">{day.products.map(p => <tr key={p.productId} className="hover:bg-slate-50/50 transition"><td className="px-4 py-3 font-bold text-slate-900">{isArabic ? p.nameAr || p.name : p.name || p.nameAr}</td><td className="px-4 py-3 font-mono text-xs text-slate-600">{p.sku}</td><td className="px-4 py-3 text-right font-bold text-slate-900">{p.quantity}</td></tr>)}</tbody>
                          <tfoot><tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200"><td colSpan={2} className="px-4 py-3">{isArabic ? "الإجمالي" : "Total"}</td><td className="px-4 py-3 text-right">{day.total}</td></tr></tfoot>
                        </table></div>}
                      </div>;
                    })}
                </div>}
              </section>

              {/* Daily receiving details: latest day expanded, older days collapsed */}
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 p-5"><h2 className="text-lg font-bold text-slate-900">{isArabic ? "تفاصيل الاستلام اليومية" : "Daily Receiving Details"}</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{isArabic ? "أحدث يوم مفتوح، والأيام السابقة مصغرة" : "Latest day shown; older days collapsed"}</p></div>
                <div className="space-y-3 p-4 sm:p-5">
                  {loadingRecords ? <p className="text-sm text-slate-400">{isArabic ? "جارٍ التحميل..." : "Loading..."}</p> :
                    receivingByDate.length === 0 ? <p className="text-sm text-slate-400">{isArabic ? "لا توجد سجلات" : "No receiving records"}</p> :
                    receivingByDate.map(([date, dailyRecords], index) => {
                      const expanded = expandedReceivingDates.includes(date) || (index === 0 && !expandedReceivingDates.includes(`closed:${date}`));
                      return <div key={date} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50">
                        <button type="button" aria-expanded={expanded}
                          onClick={() => setExpandedReceivingDates(current => expanded
                            ? [...current.filter(d => d !== date), `closed:${date}`]
                            : [...current.filter(d => d !== `closed:${date}`), date])}
                          className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-start">
                          <span className="font-bold text-slate-900 text-sm">{formatDate(date)} <span className="text-xs font-normal text-slate-500">· {dailyRecords.length} {isArabic ? "سجلات" : "records"}</span></span>
                          <span className="text-slate-400 font-bold">{expanded ? "−" : "+"}</span>
                        </button>
                        <div className="border-t border-slate-200 px-4 py-2 text-end bg-white"><button type="button" disabled={actionLoading !== null}
                          onClick={() => void deleteReceivingDay(date)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition">
                          {actionLoading === `day:${date}` ? "..." : isArabic ? "حذف اليوم بالكامل" : "Delete Entire Day"}
                        </button></div>
                        {expanded && <div className="overflow-x-auto border-t border-slate-200 bg-white"><table className="w-full min-w-[800px] text-left text-sm">
                          <thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider">{isArabic ? "المنتج" : "Product"}</th>
                            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider">SKU</th>
                            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-right">{isArabic ? "الكمية" : "Quantity"}</th>
                            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider">{isArabic ? "ملاحظة" : "Note"}</th>
                            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-right">{isArabic ? "الإجراء" : "Action"}</th>
                          </tr></thead>
                          <tbody className="divide-y divide-slate-100">{dailyRecords.map(record => {
                            const product = getProductFromRecord(record);
                            return <tr key={record._id} className="hover:bg-slate-50/50 transition">
                              <td className="px-4 py-3"><div className="flex items-center gap-2.5">{product?.image ? <img src={product.image} alt={getProductName(product)} className="h-10 w-10 rounded-xl object-cover border border-slate-200" /> : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">📦</div>}<span className="font-bold text-slate-900">{getProductName(product)}</span></div></td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-600">{product?.sku || "-"}</td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900">{record.quantity}</td>
                              <td className="px-4 py-3 text-slate-600 text-xs">{record.note || "-"}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button type="button" onClick={() => handleEdit(record)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs">{isArabic ? "تعديل" : "Edit"}</button>
                                  <button type="button" disabled={actionLoading === record._id} onClick={() => void handleDelete(record)} className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition shadow-2xs">{isArabic ? "حذف" : "Delete"}</button>
                                </div>
                              </td>
                            </tr>;
                          })}</tbody>
                        </table></div>}
                      </div>;
                    })}
                </div>
              </section>
            </div>
          </div>
        </div>

        {emailDraft && (
          <div className="no-print fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6">
            <section role="dialog" aria-modal="true" aria-labelledby="email-draft-title" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 id="email-draft-title" className="text-lg font-black text-slate-900">{isArabic ? "مسودة البريد جاهزة" : "Email Draft Ready"}</h2>
                  <p className="mt-1 text-sm text-slate-500">{isArabic ? "راجع الرسالة ثم افتح Zoho Mail لإرسالها بنفسك." : "Review the draft, then open Zoho Mail to send it yourself."}</p>
                </div>
                <button type="button" onClick={() => setEmailDraft(null)} aria-label="Close" className="rounded-lg px-3 py-1 text-xl font-bold text-slate-500 hover:bg-slate-100">×</button>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">To</p>
                  <p className="mt-1 break-all rounded-lg bg-slate-50 p-3 text-sm text-slate-900">{emailDraft.to}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject</p>
                  <p className="mt-1 break-words rounded-lg bg-slate-50 p-3 text-sm text-slate-900">{emailDraft.subject}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Message</p>
                  <pre className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-sans text-sm text-slate-800">{emailDraft.body}</pre>
                </div>
              </div>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setEmailDraft(null)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">{isArabic ? "إغلاق" : "Close"}</button>
                <button type="button" onClick={() => { void shareEmailText(emailDraft.to, emailDraft.subject, emailDraft.body); }} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100">{isArabic ? "مشاركة نص البريد إلى Zoho (iPhone)" : "Share Email Text (iPhone — choose Zoho Mail)"}</button>
                <button type="button" onClick={() => { window.open("https://mail.zoho.com/", "_blank", "noopener,noreferrer"); }} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100">{isArabic ? "فتح موقع Zoho Mail" : "Open Zoho Mail website"}</button>
                <button type="button" onClick={() => openZohoEmail(emailDraft.to, emailDraft.subject, emailDraft.body)} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">{isArabic ? "فتح مسودة البريد" : "Open Prefilled Email Draft"}</button>
              </div>
              <p className="mt-3 text-xs text-slate-500">{isArabic ? "إذا لم يفتح زر المسودة Zoho، استخدم موقع Zoho Mail وانسخ تفاصيل الرسالة أعلاه. على الكمبيوتر، يجب تفعيل Mail To Handler في Zoho وإذن المتصفح." : "If the prefilled draft button does not open Zoho, use the website button and copy the message details above. On desktop, enable Zoho's Mail-To Handler and allow it in your browser."}</p>
            </section>
          </div>
        )}
      </main>
    </>
  );
}
