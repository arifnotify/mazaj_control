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
        setProducts(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Products
          </h1>
          <p className="text-gray-500 mt-1">
            Manage all your shop products
          </p>
        </div>

        <a
          href="/products/new"
          className="rounded-lg bg-black px-5 py-3 text-white font-medium"
        >
          + Add Product
        </a>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-gray-500">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <h2 className="text-xl font-semibold">
              No products yet
            </h2>

            <p className="text-gray-500 mt-2">
              Add your first product to get started.
            </p>

            <a
              href="/products/new"
              className="inline-block mt-5 rounded-lg bg-black px-5 py-3 text-white"
            >
              Add Product
            </a>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4">SKU</th>
                <th className="text-left p-4">Product</th>
                <th className="text-left p-4">Category</th>
                <th className="text-left p-4">Price</th>
                <th className="text-left p-4">Stock</th>
                <th className="text-left p-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-b">
                  <td className="p-4">{product.sku}</td>

                  <td className="p-4 font-medium">
                    {product.name}
                  </td>

                  <td className="p-4">
                    {product.category || "-"}
                  </td>

                  <td className="p-4">
                    QAR {product.price.toFixed(2)}
                  </td>

                  <td className="p-4">
                    {product.stock}
                  </td>

                  <td className="p-4">
                    {product.active ? (
                      <span className="text-green-600">
                        Active
                      </span>
                    ) : (
                      <span className="text-red-600">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}