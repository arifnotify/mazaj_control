"use client";

import { FormEvent, useEffect, useState } from "react";

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
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] =
    useState<Employee["role"]>("employee");

  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadEmployees() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/employees");

      if (!response.ok) {
        throw new Error("Failed to load employees");
      }

      const data = await response.json();

      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Employees load করা যায়নি"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setRole("employee");
    setEditingId(null);
  }

  function startEdit(employee: Employee) {
    setEditingId(employee._id);
    setName(employee.name);
    setEmail(employee.email);
    setPhone(employee.phone || "");
    setRole(employee.role);

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Employee name দিন");
      return;
    }

    if (!email.trim()) {
      setError("Employee email দিন");
      return;
    }

    try {
      setSaving(true);

      const url = editingId
        ? `/api/employees/${editingId}`
        : "/api/employees";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            (editingId
              ? "Failed to update employee"
              : "Failed to create employee")
        );
      }

      setSuccess(
        editingId
          ? "Employee successfully updated"
          : "Employee successfully added"
      );

      resetForm();

      await loadEmployees();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(employee: Employee) {
    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/employees/${employee._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            active: !employee.active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update employee"
        );
      }

      setSuccess(
        `${employee.name} is now ${
          !employee.active ? "Active" : "Inactive"
        }`
      );

      await loadEmployees();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Employee update করা যায়নি"
      );
    }
  }

  async function deleteEmployee(employee: Employee) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${employee.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/employees/${employee._id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete employee"
        );
      }

      setSuccess(
        `${employee.name} deleted successfully`
      );

      if (editingId === employee._id) {
        resetForm();
      }

      await loadEmployees();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Employee delete করা যায়নি"
      );
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Employees
          </h1>

          <p className="mt-2 text-gray-500">
            Manage your Mazaj Control employees
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">

          {/* Form */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editingId
                  ? "Edit Employee"
                  : "Add Employee"}
              </h2>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm text-gray-500 hover:text-black"
                >
                  Cancel
                </button>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >

              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Employee name"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="employee@example.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Phone
                </label>

                <input
                  type="text"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  placeholder="+974..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* Role */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Role
                </label>

                <select
                  value={role}
                  onChange={(e) =>
                    setRole(
                      e.target.value as Employee["role"]
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
                >
                  {roles.map((item) => (
                    <option key={item} value={item}>
                      {formatRole(item)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Messages */}
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">
                  {success}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Employee"
                  : "Add Employee"}
              </button>
            </form>
          </div>

          {/* Employee List */}
          <div className="lg:col-span-2">

            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">

              <div className="border-b px-6 py-5">
                <h2 className="text-xl font-semibold">
                  All Employees
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {employees.length} employees
                </p>
              </div>

              {loading ? (
                <div className="p-10 text-center text-gray-500">
                  Loading employees...
                </div>
              ) : employees.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  No employees found.
                </div>
              ) : (
                <div className="divide-y">

                  {employees.map((employee) => (
                    <div
                      key={employee._id}
                      className="flex items-center justify-between gap-4 px-6 py-5"
                    >

                      {/* Employee Info */}
                      <div className="flex items-center gap-4">

                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-700">
                          {employee.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {employee.name}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {employee.email}
                          </p>

                          {employee.phone && (
                            <p className="mt-1 text-xs text-gray-400">
                              {employee.phone}
                            </p>
                          )}

                          <div className="mt-2 flex gap-2">

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
                              {employee.active
                                ? "Active"
                                : "Inactive"}
                            </span>

                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap justify-end gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            startEdit(employee)
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleActive(employee)
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
                        >
                          {employee.active
                            ? "Disable"
                            : "Enable"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteEmployee(employee)
                          }
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                        >
                          Delete
                        </button>

                      </div>
                    </div>
                  ))}

                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}