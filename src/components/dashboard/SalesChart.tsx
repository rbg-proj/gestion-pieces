import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface SalesChartProps {
  data: Array<{
    name: string;
    sales: number;
    orders: number;
  }>;
  type?: 'area' | 'bar';
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const SalesChart: React.FC<SalesChartProps> = ({ data, type = 'area' }) => {
  const renderChart = () => {
    if (type === 'area') {
      return (
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0066FF" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6B7280', fontSize: 12 }} 
          />
          <YAxis 
            tickFormatter={formatCurrency} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6B7280', fontSize: 12 }} 
          />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <Tooltip 
            formatter={(value) => [formatCurrency(value as number), 'Sales']}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: 'none', 
              borderRadius: '0.375rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              padding: '0.75rem' 
            }}
          />
          <Area 
            type="monotone" 
            dataKey="sales" 
            stroke="#0066FF" 
            fillOpacity={1} 
            fill="url(#colorSales)" 
          />
        </AreaChart>
      );
    }
    
    return (
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#6B7280', fontSize: 12 }} 
        />
        <YAxis 
          tickFormatter={formatCurrency} 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#6B7280', fontSize: 12 }} 
        />
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <Tooltip 
          formatter={(value, name) => [
            name === 'sales' ? formatCurrency(value as number) : value,
            name === 'sales' ? 'Sales' : 'Orders'
          ]}
          contentStyle={{ 
            backgroundColor: 'white', 
            border: 'none', 
            borderRadius: '0.375rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            padding: '0.75rem' 
          }}
        />
        <Legend />
        <Bar dataKey="sales" fill="#0066FF" name="Ventes" radius={[4, 4, 0, 0]} />
      </BarChart>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-5 h-full animate-slide-up">
      <h3 className="text-lg font-medium text-gray-900">Vue des ventes</h3>
      <p className="text-sm text-gray-500 mb-4">7 derniers jours</p>
      <div className="h-64 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesChart;