
"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  _id: string;
  sku: string;
  name: string;
  image?: string;
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

function bilingual(english: string, arabic: string) {
  return (
    <>
      <span>{english}</span>
      <span className="mt-1 block text-sm font-normal" dir="rtl" lang="ar">
        {arabic}
      </span>
    </>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function StockArrivalsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);

  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [activeArrival, setActiveArrival] = useState("");
  const [marketplaces, setMarketplaces] =
    useState<Marketplaces>(INITIAL_MARKETPLACES);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
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
        throw new Error(
          stockData.message ||
            "Failed to load stock arrivals | فشل تحميل وصول المخزون"
        );
      }

      if (!employeeRes.ok || !employeeData.success) {
        throw new Error(
          employeeData.message ||
            "Failed to load employees | فشل تحميل الموظفين"
        );
      }

      setProducts(stockData.products || []);
      setArrivals(stockData.arrivals || []);

      const employeeList: Employee[] = employeeData.employees || [];

      setEmployees(
        employeeList.filter((employee) => employee.active !== false)
      );
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          "Failed to load data | فشل تحميل البيانات"
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return products;

    return products.filter(
      (product) =>
        (product.name || "").toLowerCase().includes(term) ||
        (product.sku || "").toLowerCase().includes(term)
    );
  }, [products, search]);

  const pending = arrivals.filter(
    (arrival) => arrival.status === "pending"
  );

  const completed = arrivals.filter(
    (arrival) => arrival.status === "completed"
  );

  function toggleProduct(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleMarketplace(key: keyof Marketplaces, checked: boolean) {
    setMarketplaces((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  async function createArrival() {
    setError("");
    setMessage("");

    if (selected.length === 0) {
      setError(
        "Please select at least one product. | يرجى اختيار منتج واحد على الأقل."
      );
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
        throw new Error(
          data.message ||
            "Could not create stock arrival | تعذر إنشاء وصول المخزون"
        );
      }

      setMessage(
        "Stock arrival created successfully. | تم إنشاء وصول المخزون بنجاح."
      );
      setSelected([]);
      setSearch("");

      await loadData();
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          "Failed to create stock arrival | فشل إنشاء وصول المخزون"
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmArrival() {
    setError("");
    setMessage("");

    if (!activeArrival) {
      setError(
        "Please select a pending stock arrival. | يرجى اختيار وصول مخزون قيد الانتظار."
      );
      return;
    }

    if (!employeeId) {
      setError(
        "Please select your employee account. | يرجى اختيار حساب الموظف الخاص بك."
      );
      return;
    }

    if (!/^\d{3}$/.test(pin)) {
      setError(
        "Please enter your 3-digit PIN. | يرجى إدخال رمز PIN المكون من 3 أرقام."
      );
      return;
    }

    if (!Object.values(marketplaces).every(Boolean)) {
      setError(
        "Confirm all four marketplaces before submitting. | يرجى تأكيد جميع منصات البيع الأربع قبل الإرسال."
      );
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
        throw new Error(
          data.message ||
            "Confirmation failed | فشل التأكيد"
        );
      }

      setMessage(
        "All four marketplaces confirmed successfully. | تم تأكيد منصات البيع الأربع بنجاح."
      );

      setPin("");
      setEmployeeId("");
      setActiveArrival("");
      setMarketplaces(INITIAL_MARKETPLACES);

      await loadData();
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, "Confirmation failed | فشل التأكيد")
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  const cardClass =
    "rounded-xl border border-gray-200 bg-white p-4 md:p-6";

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <header>
        <h1 className="text-3xl font-bold">
          Stock Arrivals | وصول المخزون
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Select newly arrived products and record marketplace activation.
        </p>
        <p className="mt-1 text-sm text-gray-500" dir="rtl" lang="ar">
          اختر المنتجات التي وصلت حديثًا وسجّل تأكيد تفعيلها على منصات البيع.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="whitespace-pre-line rounded-lg border border-red-300 bg-red-50 p-3 text-red-700"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="whitespace-pre-line rounded-lg border border-green-300 bg-green-50 p-3 text-green-800"
        >
          {message}
        </div>
      )}

      {/* Select products */}
      <section className={cardClass}>
        <h2 className="mb-4 text-xl font-semibold">
          {bilingual(
            "1. Select Products Back in Stock",
            "١. اختر المنتجات التي عادت إلى المخزون"
          )}
        </h2>

        <label className="mb-2 block text-sm font-medium">
          Search by product name or SKU | ابحث باسم المنتج أو رمز SKU
        </label>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products... | ابحث عن المنتجات..."
          className={`${inputClass} mb-4`}
        />

        <div className="mb-3 text-sm text-gray-500">
          Selected: {selected.length} | المحدد: {selected.length}
        </div>

        {loading ? (
          <p>
            Loading products... | جارٍ تحميل المنتجات...
          </p>
        ) : (
          <div className="max-h-[480px] space-y-2 overflow-y-auto">
            {filteredProducts.map((product) => (
              <label
                key={product._id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(product._id)}
                  onChange={() => toggleProduct(product._id)}
                  className="h-4 w-4 shrink-0"
                />

                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-14 w-14 rounded-md border object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
                    No image
                    <span className="sr-only"> | لا توجد صورة</span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">
                    SKU: {product.sku}
                  </p>
                </div>
              </label>
            ))}

            {filteredProducts.length === 0 && (
              <p className="p-4 text-gray-500">
                No products found. | لم يتم العثور على منتجات.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={createArrival}
          disabled={saving || loading || selected.length === 0}
          className="mt-4 rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
        >
          {saving
            ? "Saving... | جارٍ الحفظ..."
            : "Create Stock Arrival | إنشاء وصول مخزون"}
        </button>
      </section>

      {/* Confirm marketplace activation */}
      <section className={cardClass}>
        <h2 className="mb-4 text-xl font-semibold">
          {bilingual(
            "2. Confirm Marketplace Activation",
            "٢. تأكيد تفعيل المنتجات على منصات البيع"
          )}
        </h2>

        <label className="mb-2 block text-sm font-medium">
          Pending stock arrival | وصول المخزون قيد الانتظار
        </label>

        <select
          value={activeArrival}
          onChange={(event) => setActiveArrival(event.target.value)}
          className={`${inputClass} mb-4`}
        >
          <option value="">
            Select stock arrival | اختر وصول المخزون
          </option>

          {pending.map((arrival) => (
            <option key={arrival._id} value={arrival._id}>
              {new Date(arrival.createdAt).toLocaleString()} —{" "}
              {arrival.products.length} product(s) | منتج
            </option>
          ))}
        </select>

        <p className="mb-3 text-sm text-gray-600">
          Check all four marketplaces after verifying that the products are
          active in each app.
        </p>
        <p className="mb-4 text-sm text-gray-600" dir="rtl" lang="ar">
          ضع علامة على منصات البيع الأربع بعد التأكد من أن المنتجات مفعّلة في
          كل تطبيق.
        </p>

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          {MARKETPLACE_LIST.map(({ key, name, arabic }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
            >
              <input
                type="checkbox"
                checked={marketplaces[key]}
                onChange={(event) =>
                  toggleMarketplace(key, event.target.checked)
                }
                className="h-4 w-4"
              />

              <span>
                <span className="block font-medium">
                  {name} — Products are active
                </span>
                <span
                  className="mt-1 block text-sm text-gray-500"
                  dir="rtl"
                  lang="ar"
                >
                  {arabic} — المنتجات مفعّلة
                </span>
              </span>
            </label>
          ))}
        </div>

        <label className="mb-2 block text-sm font-medium">
          Your employee account | حساب الموظف الخاص بك
        </label>

        <select
          value={employeeId}
          onChange={(event) => setEmployeeId(event.target.value)}
          className={`${inputClass} mb-4`}
          disabled={loading || employees.length === 0}
        >
          <option value="">
            {loading
              ? "Loading employees... | جارٍ تحميل الموظفين..."
              : employees.length === 0
                ? "No active employees found | لا يوجد موظفون نشطون"
                : "Select your name | اختر اسمك"}
          </option>

          {employees.map((employee) => (
            <option key={employee._id} value={employee._id}>
              {employee.name}
            </option>
          ))}
        </select>

        {!loading && employees.length === 0 && (
          <p className="mb-4 text-sm text-amber-700">
            No active employees were returned. Check that employees exist and
            have active set to true.
            <span className="mt-1 block" dir="rtl" lang="ar">
              لم يتم العثور على موظفين نشطين. تأكد من وجود الموظفين وأن حالة
              active مضبوطة على true.
            </span>
          </p>
        )}

        <label className="mb-2 block text-sm font-medium">
          Your 3-digit PIN | رمز PIN الخاص بك (٣ أرقام)
        </label>

        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={3}
          value={pin}
          onChange={(event) =>
            setPin(event.target.value.replace(/\D/g, "").slice(0, 3))
          }
          placeholder="Enter your 3-digit PIN | أدخل رمز PIN المكون من 3 أرقام"
          className={`${inputClass} mb-4`}
        />

        <button
          type="button"
          onClick={confirmArrival}
          disabled={saving || !activeArrival || loading}
          className="rounded-lg bg-green-700 px-5 py-3 text-white disabled:opacity-50"
        >
          {saving
            ? "Verifying... | جارٍ التحقق..."
            : "Verify PIN & Complete All Four | تحقق وأكمل المنصات الأربع"}
        </button>

        <p className="mt-3 text-xs text-gray-500">
          Confirm only after checking all four marketplace apps. This records
          your confirmation; it does not activate products in external apps
          automatically.
        </p>
        <p className="mt-2 text-xs text-gray-500" dir="rtl" lang="ar">
          أكّد فقط بعد التحقق من التطبيقات الأربعة. يسجّل هذا الإجراء تأكيدك
          ولا يفعّل المنتجات تلقائيًا في التطبيقات الخارجية.
        </p>
      </section>

      {/* Pending arrivals */}
      <section className={cardClass}>
        <h2 className="mb-4 text-xl font-semibold">
          Pending Arrivals ({pending.length}) | وصول المخزون قيد الانتظار (
          {pending.length})
        </h2>

        {pending.length === 0 ? (
          <p className="text-gray-500">
            No pending arrivals. | لا توجد عمليات وصول معلّقة.
          </p>
        ) : (
          <div className="space-y-4">
            {pending.map((arrival) => (
              <ArrivalCard key={arrival._id} arrival={arrival} />
            ))}
          </div>
        )}
      </section>

      {/* Completed arrivals */}
      <section className={cardClass}>
        <h2 className="mb-4 text-xl font-semibold">
          Completed Arrivals ({completed.length}) | عمليات الوصول المكتملة (
          {completed.length})
        </h2>

        {completed.length === 0 ? (
          <p className="text-gray-500">
            No completed arrivals yet. | لا توجد عمليات وصول مكتملة حتى الآن.
          </p>
        ) : (
          <div className="space-y-4">
            {completed.map((arrival) => (
              <ArrivalCard key={arrival._id} arrival={arrival} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function ArrivalCard({ arrival }: { arrival: Arrival }) {
  const isCompleted = arrival.status === "completed";

  return (
    <article className="rounded-lg border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-gray-500">
          Created: {new Date(arrival.createdAt).toLocaleString()}
          <span className="mt-1 block" dir="rtl" lang="ar">
            تاريخ الإنشاء: {new Date(arrival.createdAt).toLocaleString()}
          </span>
        </span>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isCompleted
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {isCompleted
            ? "COMPLETED | مكتمل"
            : "PENDING | قيد الانتظار"}
        </span>
      </div>

      <div className="space-y-3">
        {arrival.products.map((product, index) => (
          <div
            key={`${product.productId}-${index}`}
            className="flex items-center gap-3"
          >
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-12 w-12 rounded border object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded bg-gray-100" />
            )}

            <div className="min-w-0">
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
            </div>
          </div>
        ))}
      </div>

      {isCompleted && (
        <div className="mt-4 border-t pt-3 text-sm text-gray-600">
          <p>
            Confirmed by: {arrival.confirmedByName || "Employee"}
          </p>
          <p dir="rtl" lang="ar">
            تم التأكيد بواسطة: {arrival.confirmedByName || "الموظف"}
          </p>

          <p className="mt-2">
            Confirmed at:{" "}
            {arrival.confirmedAt
              ? new Date(arrival.confirmedAt).toLocaleString()
              : "—"}
          </p>
          <p dir="rtl" lang="ar">
            وقت التأكيد:{" "}
            {arrival.confirmedAt
              ? new Date(arrival.confirmedAt).toLocaleString()
              : "—"}
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {MARKETPLACE_LIST.map((marketplace) => (
              <p key={marketplace.key}>
                ✓ {marketplace.name} | {marketplace.arabic}
              </p>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
