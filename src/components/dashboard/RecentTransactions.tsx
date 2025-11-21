import React from 'react';
import { Check, X, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  customer: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: Date;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions }) => {
  const statusColors = {
    completed: {
      bg: 'bg-success-50',
      text: 'text-success-700',
      icon: <Check size={14} className="text-success-500" />,
    },
    pending: {
      bg: 'bg-warning-50',
      text: 'text-warning-700',
      icon: <span className="block h-2 w-2 rounded-full bg-warning-500"></span>,
    },
    failed: {
      bg: 'bg-error-50',
      text: 'text-error-700',
      icon: <X size={14} className="text-error-500" />,
    },
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm h-full animate-slide-up">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Transactions recentes</h3>
        <p className="text-sm text-gray-500">Derniers achats du client</p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="px-5 py-4 hover:bg-gray-50 transition-colors duration-150 ease-in-out">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  {transaction.customer.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{transaction.customer}</p>
                  <p className="text-xs text-gray-500">{format(transaction.date, 'MMM d, yyyy • h:mm a')}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="mr-4 text-right">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(transaction.amount)}</p>
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[transaction.status].bg} ${statusColors[transaction.status].text}`}>
                    <span className="mr-1">{statusColors[transaction.status].icon}</span>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </div>
                </div>
                
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="px-5 py-3 border-t border-gray-200">
        <a href="#view-all" className="text-sm font-medium text-primary-600 hover:text-primary-500">
          Voir toutes les transactions
        </a>
      </div>
    </div>
  );
};

export default RecentTransactions;