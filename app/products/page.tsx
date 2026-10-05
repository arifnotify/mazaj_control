"use client";

import { useEffect, useState } from "react";

type Product = {
  _id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  active: boolean;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <a
              href="/"
              className="text-sm text-gray-500 hover:text-black"
            >
              ← Dashboard
            </a>

            <h1 className="text-3xl font-bold text-gray-900 mt-3">
              Products
            </h1>

            <p className="text-gray-500 mt-1">
              Manage all your shop products
            </p>
          </div>

          <a
            href="/products/new"
            className="rounded-lg bg-black px-5 py-3 text-white font-medium hover:bg-gray-800"
          >
            + Add Product
          </a>
        </div>

        {/* Product Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">

          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">

              <h2 className="text-xl font-semibold text-gray-900">
                No products yet
              </h2>

              <p className="text-gray-500 mt-2">
                Add your first product to get started.
              </p>

              <a
                href="/products/new"
                className="inline-block mt-5 rounded-lg bg-black px-5 py-3 text-white"
              >
                + Add Product
              </a>

            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">

                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold">
                      SKU
                    </th>

                    <th className="text-left p-4 text-sm font-semibold">
                      Product
                    </th>

                    <th className="text-left p-4 text-sm font-semibold">
                      Category
                    </th>

                    <th className="text-left p-4 text-sm font-semibold">
                      Price
                    </th>

                    <th className="text-left p-4 text-sm font-semibold">
                      Stock
                    </th>

                    <th className="text-left p-4 text-sm font-semibold">
                      Status
                    </th>

                    <th className="text-left p-4 text-sm font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product._id}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >

                      {/* SKU */}
                      <td className="p-4 text-sm text-gray-600">
                        {product.sku}
                      </td>

                      {/* Product */}
                      <td className="p-4">
                        <div className="font-medium text-gray-900">
                          {product.name}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4 text-sm text-gray-600">
                        {product.category || "-"}
                      </td>

                      {/* Price */}
                      <td className="p-4 text-sm font-medium">
                        QAR {Number(product.price).toFixed(2)}
                      </td>

                      {/* Stock */}
                      <td className="p-4 text-sm">
                        {product.stock}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {product.active ? (
                          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-4">
                        <a
                          href={`/products/${product._id}`}
                          className="inline-block rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                        >
                          View
                        </a>
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}

        </div>

        {/* Product Count */}
        {!loading && products.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            Total Products: {products.length}
          </div>
        )}

      </div>
    </main>
  );
}