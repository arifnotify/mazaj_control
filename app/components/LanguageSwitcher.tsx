"use client";

import { useLanguage } from "./LanguageProvider";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
          language === "en"
            ? "bg-gray-900 text-white"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        English
      </button>

      <button
        type="button"
        onClick={() => setLanguage("ar")}
        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
          language === "ar"
            ? "bg-gray-900 text-white"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        العربية
      </button>
    </div>
  );
}