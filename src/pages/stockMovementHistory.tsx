import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StockMovementsHistory() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select(`
          id,
          type,
          reason,
          quantity,
          created_at,
          products ( name )
        `)
        .order("created_at", { ascending: false });

      if (data) setData(data);
    };

    load();
  }, []);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th>Date</th>
          <th>Produit</th>
          <th>Type</th>
          <th>Motif</th>
          <th>Qté</th>
        </tr>
      </thead>
      <tbody>
        {data.map(m => (
          <tr key={m.id}>
            <td>{new Date(m.created_at).toLocaleDateString()}</td>
            <td>{m.products?.name}</td>
            <td>{m.type}</td>
            <td>{m.reason}</td>
            <td>{m.quantity}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
