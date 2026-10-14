"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!pin) {
      setError("Enter Admin PIN");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Admin login failed");
      }

      router.replace("/admin/employees");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-5">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border bg-white p-8 shadow-sm"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Mazaj Control
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Admin authentication required
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Admin PIN
          </label>
          <input
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            autoComplete="current-password"
            placeholder="Enter Admin PIN"
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-black"
            required
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-black px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Checking..." : "Unlock Admin Page"}
        </button>
      </form>
    </main>
  );
}