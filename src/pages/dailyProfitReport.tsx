import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

    const { data, error } = await supabase.rpc("get_daily_profit", {
      start_date: startDate,
      end_date: endDate,
    });
    setLoading(false);

    if (error) {
      console.error("Erreur RPC:", error);
      return;
    }

    setData(data || []);
    setPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const paginatedData = data.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Totaux généraux
  const totals = data.reduce(
    (acc, row) => {
      acc.revenue += row.revenue;
      acc.cost += row.cost;
      acc.profit += row.profit;
      return acc;
    },
    { revenue: 0, cost: 0, profit: 0 }
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

      {/* 📈 Graphique */}
      {data.length > 0 && (
        <div style={{ width: "100%", height: 300, marginBottom: 30 }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sale_date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="profit" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

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

            {/* 🔢 Total général */}
            {data.length > 0 && (
              <tr style={{ fontWeight: "bold", background: "#fafafa" }}>
                <td>TOTAL</td>
                <td>{totals.revenue.toFixed(2)}</td>
                <td>{totals.cost.toFixed(2)}</td>
                <td>{totals.profit.toFixed(2)}</td>
                <td>
                  {totals.revenue > 0
                    ? ((totals.profit / totals.revenue) * 100).toFixed(1)
                    : 0}
                  %
                </td>
              </tr>
            )}
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