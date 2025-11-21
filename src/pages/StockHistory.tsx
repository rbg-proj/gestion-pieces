import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';

type StockHistoryItem = {
  id: string;
  product_id: string;
  product_name: string;
  change: number;
  new_stock: number;
  reason?: string;
  created_at: string;
};

export default function StockHistory() {
  const [history, setHistory] = useState<StockHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const paginatedData = history.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('stock_history')
        .select(`
          id,
          change,
          new_stock,
          reason,
          created_at,
          product_id,
          products(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur de chargement :', error.message);
      } else {
        const formatted = data.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.products.name,
          change: item.change,
          new_stock: item.new_stock,
          reason: item.reason,
          created_at: item.created_at,
        }));
        setHistory(formatted);
      }

      setLoading(false);
    };

    fetchHistory();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Historique des stocks</h1>

      {loading ? (
        <p>Chargement...</p>
      ) : history.length === 0 ? (
        <p>Aucun historique disponible.</p>
      ) : (
        <>
          <div className="grid gap-4">
            {paginatedData.map((item) => (
              <Card key={item.id} className="p-4 shadow-md">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{item.product_name}</p>
                    <p className="text-sm text-gray-500">
                      Modif : {item.change > 0 ? '+' : ''}
                      {item.change} → Stock : {item.new_stock}
                    </p>
                    {item.reason && (
                      <p className="text-sm italic text-gray-600">
                        Motif : {item.reason}
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* PAGINATION */}
          <div className="flex justify-center items-center gap-4 mt-4">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </button>

            <span className="text-sm">
              Page {currentPage} / {totalPages}
            </span>

            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
            >
              Suivant
            </button>
          </div>
        </>
      )}
    </div>
  );
}
