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
  sale_date: string;
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
      console.error(error);
      return;
    }

    setData(data || []);
    setPage(1);
  };

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const paginatedData = data.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const totalProfit = data.reduce((sum, row) => sum + Number(row.profit), 0);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(value);

  return (
    <div style={{ padding: 30, maxWidth: 1000, margin: "auto" }}>
      <h2 style={{ marginBottom: 20 }}>📊 Rapport des bénéfices journaliers</h2>

      {/* 🔎 Filtres */}
      <div
        style={{
          display: "flex",
          gap: 15,
          flexWrap: "wrap",
          marginBottom: 25,
          alignItems: "flex-end",
        }}
      >
        <div>
          <label>Du</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label>Au</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        <button onClick={fetchProfit} style={buttonStyle}>
          {loading ? "Chargement..." : "Filtrer"}
        </button>
      </div>

      {/* 💰 Carte Résumé */}
      {data.length > 0 && (
        <div style={cardStyle}>
          <div>
            <div style={{ fontSize: 14, color: "#666" }}>Bénéfice total</div>
            <div style={{ fontSize: 26, fontWeight: "bold" }}>
              {formatMoney(totalProfit)}
            </div>
          </div>
          <div style={{ fontSize: 14, color: "#666" }}>
            Période : {startDate} → {endDate}
          </div>
        </div>
      )}

      {/* 📈 Graphique */}
      {data.length > 0 && (
        <div style={chartCardStyle}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sale_date" />
              <YAxis />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#4f46e5"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 📊 Tableau */}
      {data.length > 0 && (
        <div style={tableCardStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Bénéfice</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row) => (
                <tr key={row.sale_date} style={{ borderTop: "1px solid #eee" }}>
                  <td style={tdStyle}>{row.sale_date}</td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>
                    {formatMoney(row.profit)}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid #ddd", fontWeight: "bold" }}>
                <td style={tdStyle}>TOTAL</td>
                <td style={tdStyle}>{formatMoney(totalProfit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 📄 Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)} style={buttonStyle}>
            ←
          </button>
          <span style={{ alignSelf: "center" }}>
            Page {page} / {totalPages}
          </span>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)} style={buttonStyle}>
            →
          </button>
        </div>
      )}
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #ccc",
  display: "block",
};

const buttonStyle: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 6,
  border: "none",
  background: "#4f46e5",
  color: "white",
  cursor: "pointer",
  fontWeight: 500,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  padding: 20,
  borderRadius: 10,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  marginBottom: 25,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const chartCardStyle: React.CSSProperties = {
  background: "white",
  padding: 20,
  borderRadius: 10,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  marginBottom: 25,
};

const tableCardStyle: React.CSSProperties = {
  background: "white",
  padding: 20,
  borderRadius: 10,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

const thStyle: React.CSSProperties = {
  padding: 10,
  fontSize: 14,
  color: "#555",
};

const tdStyle: React.CSSProperties = {
  padding: 10,
};

export default DailyProfitReport;