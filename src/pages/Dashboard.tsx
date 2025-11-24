// Dashboard.tsx avec liste défilante intégrée et titre amélioré

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { DollarSign, ShoppingCart, Package, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const Dashboard = () => {
  const [dailySales, setDailySales] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSalesCount, setTotalSalesCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // Daily sales
    const { data: salesData } = await supabase.rpc("get_daily_sales");
    setDailySales(salesData || []);

    // Total revenue
    const { data: revenueData } = await supabase
      .from("sales")
      .select("total_price");

    const total = revenueData?.reduce((sum: number, sale: any) => sum + sale.total_price, 0) || 0;
    setTotalRevenue(total);
    setTotalSalesCount(revenueData?.length || 0);

    // Product count
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });
    setProductCount(count || 0);

    // Low stock products (<= 5)
    const { data: lowStock } = await supabase
      .from("products")
      .select("id, name, stock")
      .lte("stock", 5)
      .order("stock", { ascending: true });
    setLowStockProducts(lowStock || []);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-4 bg-white shadow rounded-lg flex items-center justify-between">
          <div>
            <p className="text-gray-500">Total Ventes</p>
            <h3 className="text-2xl font-bold">{totalSalesCount}</h3>
          </div>
          <ShoppingCart className="text-blue-500" />
        </div>

        <div className="p-4 bg-white shadow rounded-lg flex items-center justify-between">
          <div>
            <p className="text-gray-500">Revenu Total</p>
            <h3 className="text-2xl font-bold">{totalRevenue} FC</h3>
          </div>
          <DollarSign className="text-green-500" />
        </div>

        <div className="p-4 bg-white shadow rounded-lg flex items-center justify-between">
          <div>
            <p className="text-gray-500">Produits</p>
            <h3 className="text-2xl font-bold">{productCount}</h3>
          </div>
          <Package className="text-orange-500" />
        </div>

        <div className="p-4 bg-white shadow rounded-lg flex items-center justify-between">
          <div>
            <p className="text-gray-500">Stock critique</p>
            <h3 className="text-2xl font-bold text-red-600">{lowStockProducts.length}</h3>
          </div>
          <TrendingUp className="text-red-500" />
        </div>
      </div>

      {/* Chart + Low stock list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique */}
        <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventes par jour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Liste critique défilante */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-md font-bold text-red-700 mb-4 px-3 py-1 rounded-md border border-red-300 bg-red-50 transition transform hover:scale-105 hover:shadow-md duration-300">
            ⚠️ Produits critiques / Faible stock
          </h3>

          <div className="relative h-64 overflow-hidden group">
            <div className="animate-scroll group-hover:[animation-play-state:paused]">
              <ul className="space-y-2">
                {lowStockProducts.concat(lowStockProducts).map((product: any, index: number) => (
                  <li
                    key={product.id + "-" + index}
                    className="flex justify-between items-center border-b pb-1"
                  >
                    <div className="flex items-center gap-2">
                      {product.stock === 0 && <span className="text-red-600 text-lg">⚠️</span>}
                      <span>{product.name}</span>
                    </div>
                    <span
                      className={`font-semibold ${product.stock === 0 ? "text-red-600" : "text-orange-500"}`}
                    >
                      {product.stock}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
