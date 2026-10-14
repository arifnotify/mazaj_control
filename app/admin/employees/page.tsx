"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Employee = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "manager" | "employee";
  active: boolean;
};

const roles = ["admin", "manager", "employee"] as const;

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function EmployeesPage() {
  const router = useRouter();

  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Employee["role"]>("employee");
  const [pin, setPin] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadEmployees = useCallback(async () => {
    const response = await fetch("/api/employees", {
      cache: "no-store",
    });

    if (response.status === 401) {
      router.replace("/admin/login");
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load employees");
    }

    setEmployees(Array.isArray(data) ? data : []);
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const response = await fetch("/api/admin/session", {
          cache: "no-store",
        });

        if (!response.ok) {
          router.replace("/admin/login");
          return;
        }

        if (!cancelled) {
          setAuthenticated(true);
          await loadEmployees();
        }
      } catch {
        if (!cancelled) {
          setError("Unable to verify Admin session");
        }
      } finally {
        if (!cancelled) {
          setCheckingAuth(false);
          setLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [loadEmployees, router]);

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setRole("employee");
    setPin("");
    setEditingId(null);
  }

  function startEdit(employee: Employee) {
    setEditingId(employee._id);
    setName(employee.name);
    setEmail(employee.email);
    setPhone(employee.phone || "");
    setRole(employee.role);
    setPin("");
    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required");
      return;
    }

    if (!editingId && !/^\d{3}$/.test(pin)) {
      setError("New employee-এর জন্য ৩ সংখ্যার PIN দিন");
      return;
    }

    if (editingId && pin && !/^\d{3}$/.test(pin)) {
      setError("PIN অবশ্যই ৩ সংখ্যার হতে হবে");
      return;
    }

    try {
      setSaving(true);

      const payload: Record<string, unknown> = {
        name,
        email,
        phone,
        role,
      };

      // New employee: required. Editing: only reset if entered.
      if (!editingId || pin) {
        payload.pin = pin;
      }

      const response = await fetch(
        editingId ? `/api/employees/${editingId}` : "/api/employees",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            (editingId ? "Failed to update employee" : "Failed to create employee")
        );
      }

      setSuccess(
        editingId
          ? pin
            ? "Employee updated and PIN reset successfully"
            : "Employee updated successfully"
          : "Employee created successfully. Give the PIN to the employee securely."
      );

      resetForm();
      await loadEmployees();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(employee: Employee) {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/employees/${employee._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !employee.active }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to update employee");
      }

      setSuccess(
        `${employee.name} is now ${!employee.active ? "Active" : "Inactive"}`
      );
      await loadEmployees();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Employee update failed"
      );
    }
  }

  async function resetEmployeePin(employee: Employee) {
    const newPin = window.prompt(
      `Enter a new 3-digit PIN for ${employee.name}:`
    );

    if (newPin === null) return;

    if (!/^\d{3}$/.test(newPin)) {
      setError("PIN must contain exactly 3 digits");
      return;
    }

    const confirmed = window.confirm(
      `Reset PIN for ${employee.name}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(`/api/employees/${employee._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: newPin }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset PIN");
      }

      setSuccess(`PIN reset successfully for ${employee.name}`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "PIN reset failed"
      );
    }
  }

  async function deleteEmployee(employee: Employee) {
    if (
      !window.confirm(
        `Are you sure you want to delete "${employee.name}"?`
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response = await fetch(`/api/employees/${employee._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete employee");
      }

      setSuccess(`${employee.name} deleted successfully`);

      if (editingId === employee._id) {
        resetForm();
      }

      await loadEmployees();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Employee delete failed"
      );
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  if (checkingAuth || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-500">Checking Admin access...</p>
      </main>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Employee Management
            </h1>
            <p className="mt-2 text-gray-500">
              Manage employees, access status and PIN resets
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-100"
          >
            Lock / Logout
          </button>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-3">
          <section className="rounded-xl border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-5 text-xl font-semibold">
              {editingId ? "Edit Employee" : "Add Employee"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border px-4 py-3 outline-none focus:border-black"
                  placeholder="Employee name"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border px-4 py-3 outline-none focus:border-black"
                  placeholder="employee@example.com"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border px-4 py-3 outline-none focus:border-black"
                  placeholder="+974..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Role</label>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as Employee["role"])
                  }
                  className="w-full rounded-lg border bg-white px-4 py-3 outline-none focus:border-black"
                >
                  {roles.map((item) => (
                    <option key={item} value={item}>
                      {formatRole(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  {editingId ? "New PIN (optional)" : "Employee PIN"}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={3}
                  pattern="[0-9]{3}"
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 3))
                  }
                  className="w-full rounded-lg border px-4 py-3 tracking-widest outline-none focus:border-black"
                  placeholder={editingId ? "Leave blank to keep PIN" : "3 digits"}
                  required={!editingId}
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {editingId
                    ? "Leave blank to keep the existing PIN. Enter 3 digits to reset."
                    : "Admin manually sets a unique or shared 3-digit PIN."}
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Employee"
                    : "Add Employee"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full rounded-lg border px-4 py-3 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </section>

          <section className="overflow-hidden rounded-xl border bg-white shadow-sm lg:col-span-2">
            <div className="border-b px-5 py-5 sm:px-6">
              <h2 className="text-xl font-semibold">All Employees</h2>
              <p className="mt-1 text-sm text-gray-500">
                {employees.length} employees
              </p>
            </div>

            {employees.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                No employees found.
              </div>
            ) : (
              <div className="divide-y">
                {employees.map((employee) => (
                  <article
                    key={employee._id}
                    className="flex flex-col gap-4 px-5 py-5 sm:px-6 xl:flex-row xl:items-center xl:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-700">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {employee.name}
                        </h3>
                        <p className="mt-1 break-all text-sm text-gray-500">
                          {employee.email}
                        </p>
                        {employee.phone && (
                          <p className="mt-1 text-xs text-gray-400">
                            {employee.phone}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            {formatRole(employee.role)}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              employee.active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {employee.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(employee)}
                        className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => resetEmployeePin(employee)}
                        className="rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                      >
                        Reset PIN
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleActive(employee)}
                        className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {employee.active ? "Disable" : "Enable"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteEmployee(employee)}
                        className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}