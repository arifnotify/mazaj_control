"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/components/LanguageProvider";

type Marketplace = "Talabat" | "Snoonu" | "Rafeeq" | "Keeta";

type ArrivalProduct = {
  _id?: string;
  id?: string;
  sku?: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  englishName?: string;
  arabicName?: string;
  product?: {
    _id?: string;
    sku?: string;
    name?: string;
    nameEn?: string;
    nameAr?: string;
    englishName?: string;
    arabicName?: string;
  };
};

type StockArrival = {
  _id: string;
  id?: string;
  status?: string;
  arrivalNumber?: string;
  reference?: string;
  products?: ArrivalProduct[];
  items?: ArrivalProduct[];
  createdAt?: string;
};

type Employee = {
  _id: string;
  id?: string;
  name: string;
  active?: boolean;
};

const MARKETPLACES: Marketplace[] = [
  "Talabat",
  "Snoonu",
  "Rafeeq",
  "Keeta",
];

const MARKETPLACE_AR: Record<Marketplace, string> = {
  Talabat: "طلبات",
  Snoonu: "سنونو",
  Rafeeq: "رفيق",
  Keeta: "كيتا",
};

function getId(item: { _id?: string; id?: string }) {
  return item._id || item.id || "";
}

function getList<T>(result: unknown, keys: string[]): T[] {
  if (Array.isArray(result)) return result as T[];

  if (result && typeof result === "object") {
    const data = result as Record<string, unknown>;

    for (const key of keys) {
      if (Array.isArray(data[key])) {
        return data[key] as T[];
      }
    }

    if (data.data && Array.isArray(data.data)) {
      return data.data as T[];
    }
  }

  return [];
}

export default function StockArrivalsPage() {
  const { isArabic } = useLanguage();

  const [arrivals, setArrivals] = useState<StockArrival[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [selectedArrivalId, setSelectedArrivalId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [pin, setPin] = useState("");

  const [checkedMarketplaces, setCheckedMarketplaces] = useState<
    Record<Marketplace, boolean>
  >({
    Talabat: false,
    Snoonu: false,
    Rafeeq: false,
    Keeta: false,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const text = useMemo(
    () => ({
      title: isArabic ? "وصول المخزون" : "Stock Arrivals",
      subtitle: isArabic
        ? "تأكيد استلام المخزون والتحقق من الأسواق"
        : "Confirm stock arrivals and verify marketplaces",
      refresh: isArabic ? "تحديث" : "Refresh",
      loading: isArabic ? "جاري التحميل..." : "Loading...",
      selectArrival: isArabic
        ? "اختر استلام المخزون"
        : "Select Stock Arrival",
      noArrivals: isArabic
        ? "لا توجد عمليات استلام مخزون معلقة"
        : "No pending stock arrivals found",
      selectEmployee: isArabic ? "اختر الموظف" : "Select Employee",
      noEmployees: isArabic
        ? "لا يوجد موظفون نشطون"
        : "No active employees found",
      pin: isArabic
        ? "رمز PIN المكون من 3 أرقام"
        : "3-digit Employee PIN",
      marketplaces: isArabic
        ? "قائمة التحقق من الأسواق"
        : "Marketplace Checklist",
      products: isArabic ? "المنتجات" : "Products",
      sku: isArabic ? "رمز المنتج" : "SKU",
      productName: isArabic ? "اسم المنتج" : "Product Name",
      noProducts: isArabic
        ? "لا توجد منتجات في عملية الاستلام هذه"
        : "No products listed in this arrival",
      confirm: isArabic ? "تأكيد الاستلام" : "Confirm Arrival",
      submitting: isArabic ? "جارٍ التأكيد..." : "Confirming...",
      requiredArrival: isArabic
        ? "يرجى اختيار عملية استلام المخزون"
        : "Please select a stock arrival",
      requiredEmployee: isArabic
        ? "يرجى اختيار الموظف"
        : "Please select an employee",
      requiredPin: isArabic
        ? "يرجى إدخال رمز PIN المكون من 3 أرقام"
        : "Please enter a valid 3-digit PIN",
      requiredMarketplaces: isArabic
        ? "يرجى تحديد الأسواق الأربعة جميعها"
        : "Please check all four marketplaces",
      completed: isArabic
        ? "تم تأكيد استلام المخزون بنجاح"
        : "Stock arrival confirmed successfully",
      loadError: isArabic
        ? "تعذر تحميل البيانات"
        : "Failed to load data",
      confirmError: isArabic
        ? "تعذر تأكيد استلام المخزون"
        : "Failed to confirm stock arrival",
      status: isArabic ? "الحالة" : "Status",
      pending: isArabic ? "قيد الانتظار" : "Pending",
      completedStatus: isArabic ? "مكتمل" : "Completed",
      arrival: isArabic ? "استلام رقم" : "Arrival",
    }),
    [isArabic]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const [arrivalsResponse, employeesResponse] = await Promise.all([
        fetch("/api/stock-arrivals", { cache: "no-store" }),
        fetch("/api/employees/active", { cache: "no-store" }),
      ]);

      if (!arrivalsResponse.ok) {
        throw new Error(text.loadError);
      }

      if (!employeesResponse.ok) {
        throw new Error(text.loadError);
      }

      const arrivalsResult = await arrivalsResponse.json();
      const employeesResult = await employeesResponse.json();

      const arrivalsList = getList<StockArrival>(arrivalsResult, [
        "arrivals",
        "stockArrivals",
        "items",
      ]);

      const employeesList = getList<Employee>(employeesResult, [
        "employees",
        "items",
      ]);

      setArrivals(arrivalsList);
      setEmployees(
        employeesList.filter((employee) => employee.active !== false)
      );

      setSelectedArrivalId((current) =>
        arrivalsList.some((arrival) => getId(arrival) === current)
          ? current
          : ""
      );

      setSelectedEmployeeId((current) =>
        employeesList.some((employee) => getId(employee) === current)
          ? current
          : ""
      );
    } catch (err) {
      console.error("Stock arrivals loading error:", err);
      setError(err instanceof Error ? err.message : text.loadError);
    } finally {
      setLoading(false);
    }
  }, [text.loadError]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedArrival = arrivals.find(
    (arrival) => getId(arrival) === selectedArrivalId
  );

  const arrivalProducts =
    selectedArrival?.products ?? selectedArrival?.items ?? [];

  const allMarketplacesChecked = MARKETPLACES.every(
    (marketplace) => checkedMarketplaces[marketplace]
  );

  function toggleMarketplace(marketplace: Marketplace) {
    setCheckedMarketplaces((current) => ({
      ...current,
      [marketplace]: !current[marketplace],
    }));
  }

  function getProductName(product: ArrivalProduct) {
    const item = product.product ?? product;

    if (isArabic) {
      return (
        item.arabicName ||
        item.nameAr ||
        item.name ||
        item.englishName ||
        item.nameEn ||
        "—"
      );
    }

    return (
      item.englishName ||
      item.nameEn ||
      item.name ||
      item.arabicName ||
      item.nameAr ||
      "—"
    );
  }

  function getProductSku(product: ArrivalProduct) {
    return product.product?.sku || product.sku || "—";
  }

  async function handleConfirm() {
    setError("");
    setSuccess("");

    if (!selectedArrivalId) {
      setError(text.requiredArrival);
      return;
    }

    if (!selectedEmployeeId) {
      setError(text.requiredEmployee);
      return;
    }

    if (!/^\d{3}$/.test(pin)) {
      setError(text.requiredPin);
      return;
    }

    if (!allMarketplacesChecked) {
      setError(text.requiredMarketplaces);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/stock-arrivals/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          arrivalId: selectedArrivalId,
          employeeId: selectedEmployeeId,
          pin,
          marketplaces: checkedMarketplaces,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            text.confirmError
        );
      }

      setSuccess(result.message || text.completed);
      setPin("");
      setCheckedMarketplaces({
        Talabat: false,
        Snoonu: false,
        Rafeeq: false,
        Keeta: false,
      });

      await loadData();
    } catch (err) {
      console.error("Stock arrival confirmation error:", err);
      setError(
        err instanceof Error ? err.message : text.confirmError
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-gray-50 p-4 sm:p-6"
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {text.title}
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {text.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading || submitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {text.refresh}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            {text.loading}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Select stock arrival */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                {text.selectArrival}
              </h2>

              {arrivals.length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                  {text.noArrivals}
                </p>
              ) : (
                <select
                  value={selectedArrivalId}
                  onChange={(event) => {
                    setSelectedArrivalId(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                >
                  <option value="">{text.selectArrival}</option>

                  {arrivals.map((arrival) => {
                    const id = getId(arrival);
                    const label =
                      arrival.arrivalNumber ||
                      arrival.reference ||
                      id;

                    return (
                      <option key={id} value={id}>
                        {text.arrival} {label}
                      </option>
                    );
                  })}
                </select>
              )}

              {selectedArrival && (
                <div className="mt-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-gray-800">
                      {text.products}
                    </h3>

                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                      {text.status}: {text.pending}
                    </span>
                  </div>

                  {arrivalProducts.length === 0 ? (
                    <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                      {text.noProducts}
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full min-w-[300px] text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-start font-medium">
                              {text.productName}
                            </th>
                            <th className="px-4 py-3 text-start font-medium">
                              {text.sku}
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                          {arrivalProducts.map((product, index) => (
                            <tr
                              key={
                                product._id ||
                                product.id ||
                                `${getProductSku(product)}-${index}`
                              }
                            >
                              <td className="px-4 py-3 text-gray-900">
                                {getProductName(product)}
                              </td>

                              <td className="px-4 py-3 text-gray-600">
                                {getProductSku(product)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Employee and PIN */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                {text.selectEmployee}
              </h2>

              {employees.length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                  {text.noEmployees}
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="employee"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      {text.selectEmployee}
                    </label>

                    <select
                      id="employee"
                      value={selectedEmployeeId}
                      onChange={(event) =>
                        setSelectedEmployeeId(event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                    >
                      <option value="">{text.selectEmployee}</option>

                      {employees.map((employee) => (
                        <option
                          key={getId(employee)}
                          value={getId(employee)}
                        >
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="employee-pin"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      {text.pin}
                    </label>

                    <input
                      id="employee-pin"
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={3}
                      pattern="[0-9]{3}"
                      value={pin}
                      onChange={(event) => {
                        const value = event.target.value.replace(
                          /\D/g,
                          ""
                        );
                        setPin(value.slice(0, 3));
                      }}
                      placeholder="•••"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm tracking-[0.4em] outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Marketplace checklist */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">
                {text.marketplaces}
              </h2>

              <p className="mb-5 text-sm text-gray-500">
                {isArabic
                  ? "حدد جميع الأسواق الأربعة قبل تأكيد الاستلام."
                  : "Check all four marketplaces before confirming the arrival."}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {MARKETPLACES.map((marketplace) => (
                  <label
                    key={marketplace}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
                      checkedMarketplaces[marketplace]
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checkedMarketplaces[marketplace]}
                      onChange={() => toggleMarketplace(marketplace)}
                      className="h-5 w-5 rounded border-gray-300 accent-green-600"
                    />

                    <span className="font-medium text-gray-800">
                      {isArabic
                        ? MARKETPLACE_AR[marketplace]
                        : marketplace}
                    </span>

                    <span
                      className={`ms-auto rounded-full px-2 py-1 text-xs ${
                        checkedMarketplaces[marketplace]
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {checkedMarketplaces[marketplace]
                        ? isArabic
                          ? "تم"
                          : "Checked"
                        : isArabic
                          ? "مطلوب"
                          : "Required"}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={
                  submitting ||
                  loading ||
                  arrivals.length === 0 ||
                  employees.length === 0
                }
                className="w-full rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {submitting ? text.submitting : text.confirm}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}