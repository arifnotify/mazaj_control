"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useLanguage } from "@/app/components/LanguageProvider";

type Product = {

  _id: string;

  sku: string;

  name: string;

  image?: string;

  nameEn?: string;

  nameAr?: string;


  englishName?: string;

  arabicName?: string;


};

type Employee = {

  _id: string;

  name: string;

  active?: boolean;

};

type ArrivalProduct = {

  productId: string;

  sku: string;

  name: string;

  image?: string;

  nameEn?: string;

  nameAr?: string;


  englishName?: string;

  arabicName?: string;


};

type Arrival = {

  _id: string;

  products: ArrivalProduct[];

  status: "pending" | "completed";

  confirmedByName?: string;

  confirmedAt?: string;

  createdAt: string;

};

type Marketplaces = {

  talabat: boolean;

  snoonu: boolean;

  rafeeq: boolean;

  keeta: boolean;

};

const INITIAL_MARKETPLACES: Marketplaces = {

  talabat: false,

  snoonu: false,

  rafeeq: false,

  keeta: false,

};

const MARKETPLACE_LIST = [

  { key: "talabat", name: "Talabat", arabic: "طلبات" },

  { key: "snoonu", name: "Snoonu", arabic: "سنونو" },

  { key: "rafeeq", name: "Rafeeq", arabic: "رفيق" },

  { key: "keeta", name: "Keeta", arabic: "كيتا" },

] as const;

function getErrorMessage(error: unknown, fallback: string) {

  return error instanceof Error ? error.message : fallback;

}

function normalizeSearch(value: string) {

  return value

    .normalize("NFKC")

    .toLocaleLowerCase()

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .replace(/[ًٌٍَُِّْـ]/g, "")

    .replace(/[أإآٱ]/g, "ا")

    .replace(/ى/g, "ي")

    .replace(/ة/g, "ه")

    .trim();

}

export default function StockArrivalsPage() {

  const { language, isArabic } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);

  const [employees, setEmployees] = useState<Employee[]>([]);

  const [arrivals, setArrivals] = useState<Arrival[]>([]);

  const [selected, setSelected] = useState<string[]>([]);

  const [search, setSearch] = useState("");

  const [employeeId, setEmployeeId] = useState("");

  const [pin, setPin] = useState("");

  const [activeArrival, setActiveArrival] = useState("");

  const [marketplaces, setMarketplaces] = useState<Marketplaces>(INITIAL_MARKETPLACES);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [deletingArrivalId, setDeletingArrivalId] = useState("");

  const copy = useMemo(() => {

    const dict = {

      en: {

        title: "Stock Arrivals",

        subtitle: "Select newly arrived products and confirm marketplace checks.",

        selectProducts: "1. Select products back in stock",

        search: "Search by product name or SKU",

        searchPlaceholder: "Search by English, Arabic, product name or SKU...",

        selected: "Selected",

        noImage: "No image",

        noProducts: "No products found.",

        create: "Create stock arrival",

        saving: "Saving...",

        confirmTitle: "2. Confirm marketplace checks",

        pendingArrival: "Pending stock arrival",

        selectArrival: "Select stock arrival",

        checkInstruction: "Verify products in each marketplace, then check all four boxes.",

        employee: "Employee account",

        selectEmployee: "Select employee",

        noEmployees: "No active employees found",

        pin: "3-digit employee PIN",

        pinPlaceholder: "Enter your 3-digit PIN",

        confirm: "Verify PIN & complete arrival",

        verifying: "Verifying...",

        pending: "Pending",

        completed: "Completed",

        pendingList: "Pending arrivals",

        completedList: "Completed arrivals",

        noPending: "No pending arrivals.",

        noCompleted: "No completed arrivals yet.",

        created: "Stock arrival created successfully.",

        confirmed: "All four marketplaces confirmed successfully.",

        loadError: "Failed to load data.",

        createError: "Could not create stock arrival.",

        confirmError: "Confirmation failed.",

        selectOne: "Please select at least one product.",

        selectPending: "Please select a pending stock arrival.",

        selectStaff: "Please select an employee account.",

        pinError: "Please enter your 3-digit PIN.",

        marketplaceError: "Please check all four marketplaces before submitting.",

        createdAt: "Created",

        confirmedBy: "Confirmed by",

        confirmedAt: "Confirmed at",

        product: "product(s)",

        activeInMarketplace: "Products verified",

        note: "This records your confirmation. It does not activate products in external marketplace apps automatically.",

        refresh: "Refresh",
        expand: "Show completed arrivals",
        collapse: "Hide completed arrivals",
        delete: "Delete",
        deleting: "Deleting...",
        deleteConfirm: "Delete this completed stock arrival? This cannot be undone.",
        deleted: "Completed arrival deleted.",
        deleteError: "Could not delete completed arrival.",

      },

      ar: {

        title: "وصول المخزون",

        subtitle: "اختر المنتجات التي وصلت حديثًا وأكّد التحقق من الأسواق.",

        selectProducts: "١. اختر المنتجات التي عادت إلى المخزون",

        search: "ابحث باسم المنتج أو رمز SKU",

        searchPlaceholder: "ابحث بالإنجليزية أو العربية أو اسم المنتج أو SKU...",

        selected: "المحدد",

        noImage: "لا توجد صورة",

        noProducts: "لم يتم العثور على منتجات.",

        create: "إنشاء استلام مخزون",

        saving: "جارٍ الحفظ...",

        confirmTitle: "٢. تأكيد التحقق من الأسواق",

        pendingArrival: "استلام المخزون المعلّق",

        selectArrival: "اختر استلام المخزون",

        checkInstruction: "تحقق من المنتجات في كل سوق، ثم حدد المربعات الأربعة.",

        employee: "حساب الموظف",

        selectEmployee: "اختر الموظف",

        noEmployees: "لم يتم العثور على موظفين نشطين",

        pin: "رمز PIN المكون من ٣ أرقام",

        pinPlaceholder: "أدخل رمز PIN المكون من ٣ أرقام",

        confirm: "تحقق من PIN وأكمل الاستلام",

        verifying: "جارٍ التحقق...",

        pending: "قيد الانتظار",

        completed: "مكتمل",

        pendingList: "عمليات الاستلام المعلّقة",

        completedList: "عمليات الاستلام المكتملة",

        noPending: "لا توجد عمليات استلام معلّقة.",

        noCompleted: "لا توجد عمليات استلام مكتملة حتى الآن.",

        created: "تم إنشاء استلام المخزون بنجاح.",

        confirmed: "تم تأكيد الأسواق الأربعة بنجاح.",

        loadError: "فشل تحميل البيانات.",

        createError: "تعذر إنشاء استلام المخزون.",

        confirmError: "فشل التأكيد.",

        selectOne: "يرجى اختيار منتج واحد على الأقل.",

        selectPending: "يرجى اختيار استلام مخزون معلّق.",

        selectStaff: "يرجى اختيار حساب الموظف.",

        pinError: "يرجى إدخال رمز PIN المكون من ٣ أرقام.",

        marketplaceError: "يرجى تحديد الأسواق الأربعة قبل الإرسال.",

        createdAt: "تاريخ الإنشاء",

        confirmedBy: "تم التأكيد بواسطة",

        confirmedAt: "وقت التأكيد",

        product: "منتج",

        activeInMarketplace: "تم التحقق من المنتجات",

        note: "يسجل هذا الإجراء تأكيدك ولا يفعّل المنتجات تلقائيًا في تطبيقات الأسواق الخارجية.",

        refresh: "تحديث",
        expand: "عرض عمليات الاستلام المكتملة",
        collapse: "إخفاء عمليات الاستلام المكتملة",
        delete: "حذف",
        deleting: "جارٍ الحذف...",
        deleteConfirm: "هل تريد حذف عملية استلام المخزون المكتملة؟ لا يمكن التراجع عن هذا الإجراء.",
        deleted: "تم حذف عملية الاستلام المكتملة.",
        deleteError: "تعذر حذف عملية الاستلام المكتملة.",

      },

    };

    return dict[language];

  }, [language]);

  const loadData = useCallback(async () => {

    setLoading(true);

    setError("");

    try {

      const [stockRes, employeeRes] = await Promise.all([

        fetch("/api/stock-arrivals", { cache: "no-store" }),

        fetch("/api/employees/active", { cache: "no-store" }),

      ]);

      const stockData = await stockRes.json();

      const employeeData = await employeeRes.json();

      if (!stockRes.ok || !stockData.success) {

        throw new Error(stockData.message || copy.loadError);

      }

      if (!employeeRes.ok || !employeeData.success) {

        throw new Error(employeeData.message || copy.loadError);

      }

      setProducts(stockData.products || []);

      setArrivals(stockData.arrivals || []);

      setEmployees(

        (employeeData.employees || []).filter(

          (employee: Employee) => employee.active !== false

        )

      );

    } catch (err: unknown) {

      setError(getErrorMessage(err, copy.loadError));

    } finally {

      setLoading(false);

    }

  }, [copy.loadError]);

  useEffect(() => {

    void loadData();

  }, [loadData]);

  const filteredProducts = useMemo(() => {

    const term = normalizeSearch(search);

    if (!term) return products;

    return products.filter((product) => {

      const searchable = [

        product.name,

        product.nameEn,

        product.nameAr,


        product.englishName,

        product.arabicName,


        product.sku,

      ]

        .filter(Boolean)

        .map((value) => normalizeSearch(String(value)));

      return searchable.some((value) => value.includes(term));

    });

  }, [products, search]);

  const pending = arrivals.filter((arrival) => arrival.status === "pending");

  const completed = arrivals.filter((arrival) => arrival.status === "completed");

  function localizedProductName(product: Product | ArrivalProduct) {

    if (language === "ar") {

      return product.nameAr || product.arabicName || product.name;

    }

    return product.nameEn || product.englishName || product.name;

  }

  function toggleProduct(id: string) {

    setSelected((current) =>

      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]

    );

  }

  function toggleMarketplace(key: keyof Marketplaces, checked: boolean) {

    setMarketplaces((current) => ({ ...current, [key]: checked }));

  }

  async function createArrival() {

    setError("");

    setMessage("");

    if (selected.length === 0) {

      setError(copy.selectOne);

      return;

    }

    setSaving(true);

    try {

      const res = await fetch("/api/stock-arrivals", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ productIds: selected }),

      });

      const data = await res.json();

      if (!res.ok || !data.success) {

        throw new Error(data.message || copy.createError);

      }

      setMessage(copy.created);

      setSelected([]);

      setSearch("");

      await loadData();

    } catch (err: unknown) {

      setError(getErrorMessage(err, copy.createError));

    } finally {

      setSaving(false);

    }

  }

  async function confirmArrival() {

    setError("");

    setMessage("");

    if (!activeArrival) {

      setError(copy.selectPending);

      return;

    }

    if (!employeeId) {

      setError(copy.selectStaff);

      return;

    }

    if (!/^\d{3}$/.test(pin)) {

      setError(copy.pinError);

      return;

    }

    if (!Object.values(marketplaces).every(Boolean)) {

      setError(copy.marketplaceError);

      return;

    }

    setSaving(true);

    try {

      const res = await fetch("/api/stock-arrivals/confirm", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          arrivalId: activeArrival,

          employeeId,

          pin,

          marketplaces,

        }),

      });

      const data = await res.json();

      if (!res.ok || !data.success) {

        throw new Error(data.message || copy.confirmError);

      }

      setMessage(copy.confirmed);

      setPin("");

      setEmployeeId("");

      setActiveArrival("");

      setMarketplaces(INITIAL_MARKETPLACES);

      await loadData();

    } catch (err: unknown) {

      setError(getErrorMessage(err, copy.confirmError));

    } finally {

      setSaving(false);

    }

  }

  async function deleteCompletedArrival(arrivalId: string) {
    if (!window.confirm(copy.deleteConfirm)) return;

    setError("");
    setMessage("");
    setDeletingArrivalId(arrivalId);
    try {
      const res = await fetch("/api/stock-arrivals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arrivalId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || copy.deleteError);
      }
      setMessage(copy.deleted);
      setArrivals((current) => current.filter((arrival) => arrival._id !== arrivalId));
    } catch (err: unknown) {
      setError(getErrorMessage(err, copy.deleteError));
    } finally {
      setDeletingArrivalId("");
    }
  }

  const inputClass =

    "min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100";

  const cardClass = "rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-6";

  return (

    <main

      dir={isArabic ? "rtl" : "ltr"}

      lang={language}

      className="mx-auto min-h-screen w-full max-w-7xl space-y-4 bg-gradient-to-b from-slate-100 to-slate-50 px-3 py-4 pb-8 font-sans text-slate-950 sm:space-y-6 sm:p-6 lg:p-8"

    >

      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-lg shadow-slate-900/10 sm:flex-row sm:items-center sm:justify-between sm:p-7">

        <div>

          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{copy.title}</h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{copy.subtitle}</p>

        </div>

        <button

          type="button"

          onClick={() => void loadData()}

          disabled={loading || saving}

          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-50 sm:w-auto"

        >

          ↻ {copy.refresh}

        </button>

      </header>

      {error && <div role="alert" className="whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm font-medium text-rose-700 shadow-2xs">{error}</div>}

      {message && <div role="status" className="whitespace-pre-line rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm font-medium text-emerald-700 shadow-2xs">{message}</div>}

      {/* Product selection */}

      <section className={cardClass}>

        <h2 className="mb-4 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">{copy.selectProducts}</h2>

        <label className="mb-2.5 block text-sm font-bold text-slate-700" htmlFor="product-search">{copy.search}</label>

        <input

          id="product-search"

          value={search}

          onChange={(event) => setSearch(event.target.value)}

          placeholder={copy.searchPlaceholder}

          className={`${inputClass} mb-4`}

        />

        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2 text-sm font-semibold text-slate-600">{copy.selected}: <span className="text-slate-900 font-bold">{selected.length}</span></div>

        {loading ? (

          <p className="text-slate-400 text-sm py-4 text-center">{copy.loadError}</p>

        ) : (

          <div className="max-h-[52vh] space-y-2.5 overflow-y-auto overscroll-contain pr-1 sm:max-h-[480px]">

            {filteredProducts.map((product) => (

              <label key={product._id} className="flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition active:scale-[0.99] hover:border-slate-300 hover:bg-slate-50">

                <input

                  type="checkbox"

                  checked={selected.includes(product._id)}

                  onChange={() => toggleProduct(product._id)}

                  className="h-5 w-5 shrink-0 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-900"

                />

                {product.image ? (

                  <img src={product.image} alt={localizedProductName(product)} className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover sm:h-16 sm:w-16" />

                ) : (

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400 sm:h-16 sm:w-16">{copy.noImage}</div>

                )}

                <div className="min-w-0 flex-1">

                  <p className="truncate text-sm font-bold leading-5 text-slate-900 sm:text-base">{localizedProductName(product)}</p>

                  <p className="mt-1 truncate font-mono text-xs text-slate-500">SKU: {product.sku}</p>

                </div>

              </label>

            ))}

            {filteredProducts.length === 0 && <p className="p-6 text-center text-slate-400 text-sm">{copy.noProducts}</p>}

          </div>

        )}

        <button

          type="button"

          onClick={() => void createArrival()}

          disabled={saving || loading || selected.length === 0}

          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-900 px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"

        >

          {saving ? copy.saving : copy.create}

        </button>

      </section>

      {/* Marketplace confirmation */}

      <section className={cardClass}>

        <h2 className="mb-4 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">{copy.confirmTitle}</h2>

        <label htmlFor="arrival-select" className="mb-2.5 block text-sm font-bold text-slate-700">{copy.pendingArrival}</label>

        <select

          id="arrival-select"

          value={activeArrival}

          onChange={(event) => setActiveArrival(event.target.value)}

          className={`${inputClass} mb-4 font-semibold`}

        >

          <option value="">{copy.selectArrival}</option>

          {pending.map((arrival) => (

            <option key={arrival._id} value={arrival._id}>

              {new Date(arrival.createdAt).toLocaleString(language)} — {arrival.products.length} {copy.product}

            </option>

          ))}

        </select>

        <p className="mb-4 text-xs sm:text-sm text-slate-600 font-medium">{copy.checkInstruction}</p>

        <div className="mb-5 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">

          {MARKETPLACE_LIST.map(({ key, name, arabic }) => (

            <label key={key} className="flex min-h-[88px] cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]">

              <input

                type="checkbox"

                checked={marketplaces[key]}

                onChange={(event) => toggleMarketplace(key, event.target.checked)}

                className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-900"

              />

              <span className="font-bold text-slate-900 text-sm">

                {language === "ar" ? arabic : name}

                <span className="mt-0.5 block text-xs text-slate-500 font-normal">

                  {copy.activeInMarketplace}

                </span>

              </span>

            </label>

          ))}

        </div>

        <label htmlFor="employee-select" className="mb-2.5 block text-sm font-bold text-slate-700">{copy.employee}</label>

        <select

          id="employee-select"

          value={employeeId}

          onChange={(event) => setEmployeeId(event.target.value)}

          className={`${inputClass} mb-4 font-semibold`}

          disabled={loading || employees.length === 0}

        >

          <option value="">

            {employees.length === 0 ? copy.noEmployees : copy.selectEmployee}

          </option>

          {employees.map((employee) => (

            <option key={employee._id} value={employee._id}>{employee.name}</option>

          ))}

        </select>

        <label htmlFor="employee-pin" className="mb-2.5 block text-sm font-bold text-slate-700">{copy.pin}</label>

        <input

          id="employee-pin"

          type="password"

          inputMode="numeric"

          autoComplete="off"

          maxLength={3}

          value={pin}

          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 3))}

          placeholder={copy.pinPlaceholder}

          className={`${inputClass} mb-5 text-center tracking-[0.4em] font-mono text-lg`}

        />

        <button

          type="button"

          onClick={() => void confirmArrival()}

          disabled={saving || !activeArrival || loading}

          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-emerald-700 px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"

        >

          {saving ? copy.verifying : copy.confirm}

        </button>

        <p className="mt-4 text-xs text-slate-400 font-medium">{copy.note}</p>

      </section>

      {/* Pending arrivals */}

      <ArrivalList

        title={`${copy.pendingList} (${pending.length})`}

        arrivals={pending}

        emptyText={copy.noPending}

        language={language}

        copy={copy}

      />

      {/* Completed arrivals */}

      <ArrivalList
        title={`${copy.completedList} (${completed.length})`}
        arrivals={completed}
        emptyText={copy.noCompleted}
        language={language}
        copy={copy}
        collapsible
        expanded={completedExpanded}
        onToggle={() => setCompletedExpanded((value) => !value)}
        onDelete={deleteCompletedArrival}
        deletingArrivalId={deletingArrivalId}
      />

    </main>

  );

}

type ArrivalCopy = {
  pending: string;
  completed: string;
  createdAt: string;
  confirmedBy: string;
  confirmedAt: string;
  expand: string;
  collapse: string;
  delete: string;
  deleting: string;
};

function ArrivalList({
  title,
  arrivals,
  emptyText,
  language,
  copy,
  collapsible = false,
  expanded = true,
  onToggle,
  onDelete,
  deletingArrivalId = "",
}: {
  title: string;
  arrivals: Arrival[];
  emptyText: string;
  language: "en" | "ar";
  copy: ArrivalCopy;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onDelete?: (arrivalId: string) => void;
  deletingArrivalId?: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h2>
        {collapsible && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <span aria-hidden="true" className="me-1.5 text-base leading-none">{expanded ? "−" : "+"}</span>
            {expanded ? copy.collapse : copy.expand}
          </button>
        )}
      </div>
      {(!collapsible || expanded) && (
        arrivals.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">{emptyText}</p>
        ) : (
          <div className="space-y-4">
            {arrivals.map((arrival) => (
              <ArrivalCard
                key={arrival._id}
                arrival={arrival}
                language={language}
                copy={copy}
                onDelete={onDelete}
                deleting={deletingArrivalId === arrival._id}
              />
            ))}
          </div>
        )
      )}
    </section>
  );
}

function ArrivalCard({
  arrival,
  language,
  copy,
  onDelete,
  deleting = false,
}: {
  arrival: Arrival;
  language: "en" | "ar";
  copy: ArrivalCopy;
  onDelete?: (arrivalId: string) => void;
  deleting?: boolean;
}) {
  const isCompleted = arrival.status === "completed";
  const dateLocale = language === "ar" ? "ar" : "en";

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
        <span className="text-sm font-medium text-slate-500">
          {copy.createdAt}: <span className="text-slate-800">{new Date(arrival.createdAt).toLocaleString(dateLocale)}</span>
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isCompleted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {isCompleted ? copy.completed : copy.pending}
        </span>
      </div>
      <div className="space-y-3">
        {arrival.products.map((product, index) => {
          const name = language === "ar"
            ? product.nameAr || product.arabicName || product.name
            : product.nameEn || product.englishName || product.name;
          return (
            <div key={`${product.productId}-${index}`} className="flex items-center gap-3">
              {product.image ? (
                <img src={product.image} alt={name} className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500 text-xs">📦</div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-5 text-slate-900 sm:text-base">{name}</p>
                <p className="text-xs text-slate-400 font-mono">SKU: {product.sku}</p>
              </div>
            </div>
          );
        })}
      </div>
      {isCompleted && (
        <div className="mt-4 border-t border-slate-200/60 pt-3 text-xs sm:text-sm text-slate-600">
          <p><strong className="text-slate-800">{copy.confirmedBy}:</strong> {arrival.confirmedByName || "—"}</p>
          <p className="mt-1.5">
            <strong className="text-slate-800">{copy.confirmedAt}:</strong> {arrival.confirmedAt ? new Date(arrival.confirmedAt).toLocaleString(dateLocale) : "—"}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 font-medium text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
            {MARKETPLACE_LIST.map((marketplace) => (
              <p key={marketplace.key} className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> {language === "ar" ? marketplace.arabic : marketplace.name}</p>
            ))}
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(arrival._id)}
              disabled={deleting}
              className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs sm:text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition shadow-2xs"
            >
              {deleting ? copy.deleting : copy.delete}
            </button>
          )}
        </div>
      )}
    </article>
  );
}