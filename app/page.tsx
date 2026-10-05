export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-5">
        <h1 className="text-2xl font-bold mb-8">
          Mazaj Control
        </h1>

        <nav className="space-y-2">
          <div className="bg-gray-700 rounded-lg p-3">
            Dashboard
          </div>

          <div className="p-3 hover:bg-gray-800 rounded-lg">
            Products
          </div>

          <div className="p-3 hover:bg-gray-800 rounded-lg">
            Categories
          </div>

          <div className="p-3 hover:bg-gray-800 rounded-lg">
            Marketplaces
          </div>

          <div className="p-3 hover:bg-gray-800 rounded-lg">
            Issues
          </div>

          <div className="p-3 hover:bg-gray-800 rounded-lg">
            Employees
          </div>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-900">
          Dashboard
        </h2>

        <p className="text-gray-500 mt-1">
          Product Control Center
        </p>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-5 mt-8">

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-gray-500">Total Products</p>
            <h3 className="text-3xl font-bold mt-2">0</h3>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-gray-500">Healthy Products</p>
            <h3 className="text-3xl font-bold text-green-600 mt-2">
              0
            </h3>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-gray-500">Problems</p>
            <h3 className="text-3xl font-bold text-red-600 mt-2">
              0
            </h3>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-gray-500">Open Issues</p>
            <h3 className="text-3xl font-bold text-orange-500 mt-2">
              0
            </h3>
          </div>

        </div>

        {/* Marketplaces */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold">
            Marketplace Status
          </h3>

          <div className="grid grid-cols-4 gap-4 mt-5">

            <div className="border rounded-lg p-5">
              <h4 className="font-bold">Talabat</h4>
              <p className="text-green-600 mt-2">
                ● Connected
              </p>
            </div>

            <div className="border rounded-lg p-5">
              <h4 className="font-bold">Snoonu</h4>
              <p className="text-green-600 mt-2">
                ● Connected
              </p>
            </div>

            <div className="border rounded-lg p-5">
              <h4 className="font-bold">Rafeeq</h4>
              <p className="text-yellow-600 mt-2">
                ● Not Connected
              </p>
            </div>

            <div className="border rounded-lg p-5">
              <h4 className="font-bold">Keeta</h4>
              <p className="text-yellow-600 mt-2">
                ● Not Connected
              </p>
            </div>

          </div>
        </div>

        {/* Issues */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold">
            Recent Issues
          </h3>

          <div className="mt-5 text-gray-500">
            No issues found.
          </div>
        </div>

      </main>
    </div>
  );
}