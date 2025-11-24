import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package, 
  TrendingUp,
  Wallet,
  Banknote
} from 'lucide-react';
import DashboardCard from '../components/dashboard/DashboardCard';
import SalesChart from '../components/dashboard/SalesChart';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const [salesToday, setSalesToday] = useState(0);
  const [profitToday, setProfitToday] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 💱 Ajout : stockage du taux de change
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchDashboardData();
      } catch (err) {
        console.error('Erreur lors du chargement du dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const fetchDashboardData = async () => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    // 🧾 Total sales today
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('id, total_amount, sale_date')
      .gte('sale_date', startOfDay)
      .lte('sale_date', endOfDay);

    if (salesError) throw salesError;

    const total = salesData.reduce((sum, s) => sum + s.total_amount, 0);
    setSalesToday(total);

    // 🧮 Profit for today's sales
    const saleIds = salesData.map(s => s.id);
    if (saleIds.length > 0) {
      const profit = await calculateProfitForSales(saleIds);
      setProfitToday(profit);
    }

    // 📦 Total products
    const { count: productCountRes, error: productError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    if (productError) throw productError;
    setProductCount(productCountRes || 0);

    // 👥 Total customers
    const { count: customerCountRes, error: customerError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
    if (customerError) throw customerError;
    setCustomerCount(customerCountRes || 0);

    // 📊 Sales of last 7 days
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 6);
    const { data: weekSales, error: weekError } = await supabase
      .from('sales')
      .select('total_amount, sale_date')
      .gte('sale_date', lastWeek.toISOString());

    if (weekError) throw weekError;

    const grouped = Array(7).fill(0).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        name: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        sales: 0,
        orders: 0,
        date: date.toISOString().split('T')[0],
      };
    });

    weekSales.forEach(s => {
      const date = new Date(s.sale_date).toISOString().split('T')[0];
      const day = grouped.find(g => g.date === date);
      if (day) {
        day.sales += s.total_amount;
        day.orders += 1;
      }
    });

    setDailySales(grouped);

    // 💱 AJOUT : récupération du taux de change le plus récent
    const { data: latestRate } = await supabase
      .from("exchange_rates")
      .select("rate")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (latestRate) {
      setExchangeRate(latestRate.rate);
    }
  };

  

  const calculateProfitForSales = async (saleIds: number[]) => {
  const { data: saleItems, error: itemError } = await supabase
    .from('sale_items')
    .select('quantity, product_id, unit_price') // ➜ On récupère unit_price
    .in('sale_id', saleIds);

  if (itemError || !saleItems || saleItems.length === 0) return 0;

  const productIds = [...new Set(saleItems.map(item => item.product_id))];
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, selling_price') // ➜ selling_price n'est plus nécessaire
    .in('id', productIds);

  if (productError || !products) return 0;

  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  return saleItems.reduce((sum, item) => {
    const product = productMap[item.product_id];
    if (!product) return sum;

    const profitPerItem = item.unit_price - product.selling_price;
    return sum + profitPerItem * item.quantity;
  }, 0);
};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Point de Vente - Dashboard</h1>
          <p className="text-sm text-gray-500">Bienvenue {user?.name}!</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-10">Chargement en cours...</div>
      ) : (
        <>
          {/* 🟪 AJOUT : une 5ᵉ card pour le taux */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <DashboardCard 
              title="Total Vente du Jour" 
              value={formatCurrency(salesToday)}
              change={0.0}
              icon={<Banknote size={20} className="text-white" />}
              iconBgColor="bg-primary-500"
            />
            <DashboardCard 
              title="Bénéfice du Jour" 
              value={formatCurrency(profitToday)}
              change={0.0}
              icon={<TrendingUp size={20} className="text-white" />}
              iconBgColor="bg-success-500"
            />

             {/* 💱 Nouveau : taux de change */}
            <DashboardCard 
              title="Taux du Jour (CDF → USD)"
              value={exchangeRate ? exchangeRate.toString() : "--"}
              change={0.0}
              icon={<DollarSign size={20} className="text-white" />}
              iconBgColor="bg-purple-600"
            />
            <DashboardCard 
              title="Nombre total Articles" 
              value={productCount.toString()}
              change={0.0}
              icon={<Package size={20} className="text-white" />}
              iconBgColor="bg-secondary-500"
            />
            <DashboardCard 
              title="Nombre Clients fidèles" 
              value={customerCount.toString()}
              change={0.0}
              icon={<Users size={20} className="text-white" />}
              iconBgColor="bg-accent-500"
            />

           
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Vue des ventes par jour</h2>
                    <p className="text-sm text-gray-500">Performance 7 derniers jours</p>
                  </div>
                </div>
                <div className="h-80">
                  <SalesChart data={dailySales} type="bar" color="#3b82f6" />
                </div>
              </div>
            </div>

            {/* Slot vide laissé inchangé */}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
