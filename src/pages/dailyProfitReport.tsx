import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface DailyProfit {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

const ITEMS_PER_PAGE = 7;

const DailyProfitReport: React.FC = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<DailyProfit[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchProfit = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);

    const { data: rows, error } = await supabase
      .from("sale_items")
      .select(`
        quantity,
        unit_price,
        products ( purchase_price ),
        sales!inner ( sale_date )
      `)
      .gte("sales.sale_date", startDate)
      .lte("sales.sale_date", endDate);

    setLoading(false);

    if (error || !rows) {
      console.error(error);
      return;
    }

    // 🧠 Grouper par date
    const grouped: Record<string, DailyProfit> = {};

    rows.forEach((item: any) => {
      const date = item.sales.sale_date;
      const quantity = item.quantity;
      const unitPrice = item.unit_price;
      const purchasePrice = item.products.purchase_price;

      const revenue = unitPrice * quantity;
      const cost = purchasePrice * quantity;
      const profit = revenue - cost;

      if (!grouped[date]) {
        grouped[date] = { date, revenue: 0, cost: 0, profit: 0 };
      }

      grouped[date].revenue += revenue;
      grouped[date].cost += cost;
      grouped[date].profit += profit;
    });

    const result = Object.values(grouped).sort((a, b) =>
      a.date < b.date ? 1 : -1
    );

    setData(result);
    setPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const paginatedData = data.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>Rapport des bénéfices journaliers</h2>

      {/* 🔎 Filtres */}
      <div style={{ marginBottom: 20, display: "flex", gap: 10 }}>
        <div>
          <label>Du :</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label>Au :</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button onClick={fetchProfit}>Filtrer</button>
      </div>

      {/* 📊 Tableau */}
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <table border={1} cellPadding={8} cellSpacing={0} width="100%">
          <thead style={{ background: "#f3f3f3" }}>
            <tr>
              <th>Date</th>
              <th>Chiffre d'affaires</th>
              <th>Coût d'achat</th>
              <th>Bénéfice</th>
              <th>Marge (%)</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row) => (
              <tr key={row.date}>
                <td>{row.date}</td>
                <td>{row.revenue.toFixed(2)}</td>
                <td>{row.cost.toFixed(2)}</td>
                <td>{row.profit.toFixed(2)}</td>
                <td>
                  {row.revenue > 0
                    ? ((row.profit / row.revenue) * 100).toFixed(1)
                    : 0}
                  %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 📄 Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            ← Précédent
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
};

export default DailyProfitReport;