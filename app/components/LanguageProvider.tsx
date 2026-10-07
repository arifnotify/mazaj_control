"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type Language = "en" | "ar";

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  isArabic: boolean;
  t: (key: string) => string;
};

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    products: "Products",
    categories: "Categories",
    issues: "Issues",
    employees: "Employees",

    addProduct: "Add Product",
    editProduct: "Edit Product",
    productDetails: "Product Details",

    sku: "SKU",
    name: "Name",
    description: "Description",
    category: "Category",
    price: "Price",
    stock: "Stock",
    image: "Image",
    status: "Status",

    active: "Active",
    inactive: "Inactive",
    available: "Available",
    unavailable: "Unavailable",

    save: "Save",
    update: "Update",
    delete: "Delete",
    cancel: "Cancel",
    edit: "Edit",
    view: "View",
    back: "Back",
    refresh: "Refresh",
    search: "Search",

    total: "Total",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",

    marketplace: "Marketplace",
    marketplaces: "Marketplaces",
    syncStatus: "Sync Status",
    connected: "Connected",
    notConnected: "Not Connected",
    pending: "Pending",
    synced: "Synced",
    failed: "Failed",

    issue: "Issue",
    issuesFound: "Issues Found",
    reportIssue: "Report Issue",

    priceMismatch: "Price mismatch",
    nameMismatch: "Name mismatch",
    descriptionMismatch: "Description mismatch",
    imageMismatch: "Image mismatch",
    categoryMismatch: "Category mismatch",
    availabilityMismatch: "Availability mismatch",

    englishName: "English Name",
    arabicName: "Arabic Name",
    englishDescription: "English Description",
    arabicDescription: "Arabic Description",
    englishCategory: "English Category",
    arabicCategory: "Arabic Category",

    loading: "Loading...",
    noProducts: "No products found",
    noCategories: "No categories found",
    noIssues: "No issues found",

    confirmDelete: "Are you sure you want to delete this?",
    language: "Language",
    english: "English",
    arabic: "العربية",
  },

  ar: {
    dashboard: "لوحة التحكم",
    products: "المنتجات",
    categories: "الفئات",
    issues: "المشاكل",
    employees: "الموظفون",

    addProduct: "إضافة منتج",
    editProduct: "تعديل المنتج",
    productDetails: "تفاصيل المنتج",

    sku: "رمز المنتج",
    name: "الاسم",
    description: "الوصف",
    category: "الفئة",
    price: "السعر",
    stock: "المخزون",
    image: "الصورة",
    status: "الحالة",

    active: "نشط",
    inactive: "غير نشط",
    available: "متوفر",
    unavailable: "غير متوفر",

    save: "حفظ",
    update: "تحديث",
    delete: "حذف",
    cancel: "إلغاء",
    edit: "تعديل",
    view: "عرض",
    back: "رجوع",
    refresh: "تحديث",
    search: "بحث",

    total: "الإجمالي",
    lowStock: "مخزون منخفض",
    outOfStock: "نفد المخزون",

    marketplace: "السوق",
    marketplaces: "الأسواق",
    syncStatus: "حالة المزامنة",
    connected: "متصل",
    notConnected: "غير متصل",
    pending: "قيد الانتظار",
    synced: "تمت المزامنة",
    failed: "فشل",

    issue: "مشكلة",
    issuesFound: "المشاكل الموجودة",
    reportIssue: "الإبلاغ عن مشكلة",

    priceMismatch: "اختلاف السعر",
    nameMismatch: "اختلاف الاسم",
    descriptionMismatch: "اختلاف الوصف",
    imageMismatch: "اختلاف الصورة",
    categoryMismatch: "اختلاف الفئة",
    availabilityMismatch: "اختلاف التوفر",

    englishName: "الاسم بالإنجليزية",
    arabicName: "الاسم بالعربية",
    englishDescription: "الوصف بالإنجليزية",
    arabicDescription: "الوصف بالعربية",
    englishCategory: "الفئة بالإنجليزية",
    arabicCategory: "الفئة بالعربية",

    loading: "جاري التحميل...",
    noProducts: "لم يتم العثور على منتجات",
    noCategories: "لم يتم العثور على فئات",
    noIssues: "لم يتم العثور على مشاكل",

    confirmDelete: "هل أنت متأكد أنك تريد حذف هذا؟",
    language: "اللغة",
    english: "English",
    arabic: "العربية",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("mazaj-language");

    if (savedLanguage === "en" || savedLanguage === "ar") {
      setLanguageState(savedLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";

    localStorage.setItem("mazaj-language", language);
  }, [language]);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      isArabic: language === "ar",
      t,
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}