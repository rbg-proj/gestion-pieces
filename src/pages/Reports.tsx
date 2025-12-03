import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet,
  TrendingUp,
  Users,
  Package
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

// 2️⃣ Interfaces TypeScript
interface DailySale {
  date: string;
  amount: number;
}

interface ProductSale {
  name: string;
  sales: number;
  revenue: number;
}

interface CustomerStat {
  name: string;
  orders: number;
  spent: number;
}

// 1️⃣ Constantes
const COLORS = ['#0066FF', '#7C3AED', '#06B6D4', '#10B981', '#F59E0B'];
const ITEMS_PER_PAGE = 10;
const MAX_PIE_CHART_ITEMS = 10;

// 2️⃣ Fonctions utilitaires
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getDateRange = (timeRange: 'day' | 'week' | 'month') => {
  const now = new Date();
  let startDate;
  
  switch (timeRange) {
    case 'day':
      startDate = startOfDay(now);
      break;
    case 'week':
      startDate = startOfWeek(now);
      break;
    case 'month':
      startDate = startOfMonth(now);
      break;
    default:
      startDate = startOfWeek(now);
  }
  
  return {
    startDate: startDate.toISOString(),
    endDate: endOfDay(now).toISOString()
  };
};

const exportToExcel = (dailySales: DailySale[], productSales: ProductSale[], topCustomers: CustomerStat[]) => {
  const workbook = XLSX.utils.book_new();

  const salesData = dailySales.map(item => ({
    Date: item.date,
    'Montant Ventes': item.amount,
  }));
  const salesSheet = XLSX.utils.json_to_sheet(salesData);
  XLSX.utils.book_append_sheet(workbook, salesSheet, 'Ventes');

  const productSheet = XLSX.utils.json_to_sheet(productSales);
  XLSX.utils.book_append_sheet(workbook, productSheet, 'Ventes Produits');

  const customerSheet = XLSX.utils.json_to_sheet(topCustomers);
  XLSX.utils.book_append_sheet(workbook, customerSheet, 'Meilleurs Clients');

  XLSX.writeFile(workbook, 'rapport_ventes.xlsx');
};

const Reports: React.FC = () => {
  // 1️⃣ États regroupés
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [topCustomers, setTopCustomers] = useState<CustomerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'revenue' | 'sales'>('revenue');
  
  // 6️⃣ États de pagination
  const [productPage, setProductPage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);

  // 3️⃣ Fonctions data
  const fetchData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(timeRange);

      // Récupérer les ventes avec filtrage par date
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('sale_date, total_amount')
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)
        .order('sale_date');

      if (salesError) throw salesError;

      // Grouper les ventes par jour
      const groupedSales = salesData.reduce((acc: Record<string, DailySale>, sale: any) => {
        const date = format(new Date(sale.sale_date), 'MMM dd');
        if (!acc[date]) {
          acc[date] = { date, amount: 0 };
        }
        acc[date].amount += sale.total_amount;
        return acc;
      }, {});

      setDailySales(Object.values(groupedSales));

      // Récupérer les ventes par produit avec filtrage par date
      const { data: productData, error: productError } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          unit_price,
          products (
            name
          ),
          sales!inner (
            sale_date
          )
        `)
        .gte('sales.sale_date', startDate)
        .lte('sales.sale_date', endDate);

      if (productError) throw productError;

      const productStats = productData.reduce((acc: Record<string, ProductSale>, item: any) => {
        const name = item.products?.name;
        if (!acc[name]) {
          acc[name] = { name, sales: 0, revenue: 0 };
        }
        acc[name].sales += item.quantity;
        acc[name].revenue += item.quantity * item.unit_price;
        return acc;
      }, {});

      setProductSales(Object.values(productStats));

      // Récupérer les meilleurs clients avec filtrage par date
      const { data: customerData, error: customerError } = await supabase
        .from('sales')
        .select(`
          total_amount,
          sale_date,
          customers (
            full_name
          )
        `)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate);

      if (customerError) throw customerError;

      const customerStats = customerData.reduce((acc: Record<string, CustomerStat>, sale: any) => {
        const name = sale.customers?.full_name;
        if (!acc[name]) {
          acc[name] = { name, orders: 0, spent: 0 };
        }
        acc[name].orders += 1;
        acc[name].spent += sale.total_amount;
        return acc;
      }, {});

      setTopCustomers(
        Object.values(customerStats)
          .sort((a: CustomerStat, b: CustomerStat) => b.spent - a.spent)
          .slice(0, 50) // Limiter à 50 pour la performance
      );

    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
    } finally {
      setLoading(false);
    }
  };

  // 4️⃣ Mémorisation pour les performances
  const sortedProductSales = useMemo(() => {
    return [...productSales].sort((a, b) => {
      if (sortBy === 'revenue') {
        return b.revenue - a.revenue;
      } else {
        return b.sales - a.sales;
      }
    });
  }, [productSales, sortBy]);

  // 7️⃣ Données limitées pour le graphique
  const pieChartData = useMemo(() => {
    return sortedProductSales.slice(0, MAX_PIE_CHART_ITEMS);
  }, [sortedProductSales]);

  // 6️⃣ Pagination des tableaux
  const paginatedProducts = useMemo(() => {
    const startIndex = (productPage - 1) * ITEMS_PER_PAGE;
    return sortedProductSales.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedProductSales, productPage]);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (customerPage - 1) * ITEMS_PER_PAGE;
    return topCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [topCustomers, customerPage]);

  const productTotalPages = Math.ceil(sortedProductSales.length / ITEMS_PER_PAGE);
  const customerTotalPages = Math.ceil(topCustomers.length / ITEMS_PER_PAGE);

  // Calculs des totaux
  const totalSales = dailySales.reduce((sum, item) => sum + item.amount, 0);
  const totalProducts = productSales.reduce((sum, item) => sum + item.sales, 0);
  const totalCustomers = topCustomers.length;

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  // Reset pagination when data changes
  useEffect(() => {
    setProductPage(1);
    setCustomerPage(1);
  }, [timeRange, sortBy]);

  // 5️⃣ Chargement conditionnel amélioré
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analyse des Ventes</h1>
          <p className="text-sm text-gray-500">Performances commerciales</p>
        </div>
        <div className="flex space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month')}
            className="px-4 py-2 border border-gray-200 rounded-md bg-white text-gray-700 hover:bg-gray-50"
          >
            <option value="day">Aujourd'hui</option>
            <option value="week">Cette Semaine</option>
            <option value="month">Ce Mois</option>
          </select>
          <button
            onClick={() => exportToExcel(dailySales, productSales, topCustomers)}
            className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors duration-150 ease-in-out"
          >
            <FileSpreadsheet size={16} className="mr-2" />
            Exporter Excel
          </button>
        </div>
      </div>

      {/* Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Ventes</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {formatCurrency(totalSales)}
              </p>
            </div>
            <div className="p-3 bg-primary-50 rounded-full">
              <TrendingUp size={24} className="text-primary-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Articles Vendus</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{totalProducts}</p>
            </div>
            <div className="p-3 bg-secondary-50 rounded-full">
              <Package size={24} className="text-secondary-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Clients Actifs</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{totalCustomers}</p>
            </div>
            <div className="p-3 bg-accent-50 rounded-full">
              <Users size={24} className="text-accent-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Tendance des Ventes</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value as number), 'Ventes']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="amount" fill="#0066FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Répartition des Ventes par Produit</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="sales"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {productSales.length > MAX_PIE_CHART_ITEMS && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Affichage des {MAX_PIE_CHART_ITEMS} produits les plus vendus
            </p>
          )}
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Top Produits</h2>
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setSortBy('revenue')}
                className={`px-3 py-1 rounded border text-sm ${
                  sortBy === 'revenue'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                Trier par montant
              </button>
              <button
                onClick={() => setSortBy('sales')}
                className={`px-3 py-1 rounded border text-sm ${
                  sortBy === 'sales'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                Trier par unités
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unités Vendues</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map((product) => (
                  <tr key={product.name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{product.sales}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(product.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination produits */}
          {productTotalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setProductPage(prev => Math.max(1, prev - 1))}
                disabled={productPage === 1}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Précédent
              </button>
              <span className="text-sm text-gray-700">
                Page {productPage} / {productTotalPages}
              </span>
              <button
                onClick={() => setProductPage(prev => Math.min(productTotalPages, prev + 1))}
                disabled={productPage === productTotalPages}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Top Clients</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Achats effectués</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Achat</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.name}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                         <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                            {customer.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                         
                        </div>
                        <div className="ml-4 text-sm text-gray-900">{customer.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{customer.orders}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(customer.spent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination clients */}
          {customerTotalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setCustomerPage(prev => Math.max(1, prev - 1))}
                disabled={customerPage === 1}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Précédent
              </button>
              <span className="text-sm text-gray-700">
                Page {customerPage} / {customerTotalPages}
              </span>
              <button
                onClick={() => setCustomerPage(prev => Math.min(customerTotalPages, prev + 1))}
                disabled={customerPage === customerTotalPages}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;