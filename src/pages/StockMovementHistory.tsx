import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const PAGE_SIZE = 20;

interface Product {
  id: string;
  name: string;
}

export default function StockMovementsHistory() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // filtres
  const [productId, setProductId] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name")
      .order("name")
      .then(({ data }) => data && setProducts(data));
  }, []);

  // Recherche produit côté serveur
  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, stock")
        .ilike("name", `%${query}%`)
        .limit(10);

      if (data) setResults(data);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const fetchData = async () => {
    setLoading(true);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("stock_movements")
      .select(
        `
        id,
        type,
        reason,
        quantity,
        created_at,
        products ( name )
        `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (productId) query = query.eq("product_id", productId);
    if (type) query = query.eq("type", type);
    if (reason) query = query.eq("reason", reason);
    if (fromDate) query = query.gte("created_at", fromDate);
    if (toDate) query = query.lte("created_at", toDate + " 23:59:59");

    const { data, count, error } = await query.range(from, to);

    if (!error && data) {
      setData(data);
      setTotal(count ?? 0);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [page, productId, type, reason, fromDate, toDate]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const resetFilters = () => {
    setQuery("");
    setResults([]);
    setProductId(null);
    setType(null);
    setReason(null);
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  return (
    <div className="space-y-4">

      {/* FILTRES */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <Select onValueChange={setProductId} value={productId ?? ""}>
          <SelectTrigger>
            <SelectValue placeholder="Produit" />
          </SelectTrigger>
          <SelectContent>
            {products.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={setType} value={type ?? ""}>
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="IN">Entrée</SelectItem>
            <SelectItem value="OUT">Sortie</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={setReason} value={reason ?? ""}>
          <SelectTrigger>
            <SelectValue placeholder="Motif" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ENDOMMAGE">Endommagé</SelectItem>
            <SelectItem value="PERIME">Périmé</SelectItem>
            <SelectItem value="PERTE">Perte</SelectItem>
            <SelectItem value="RETOUR">Retour</SelectItem>
             <SelectItem value="AJUSTEMENT">Ajustement</SelectItem>
          </SelectContent>
        </Select>

        <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={resetFilters}>
          Réinitialiser
        </Button>
      </div>

      {/* TABLE */}
      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Date</th>
            <th className="p-2">Produit</th>
            <th className="p-2">Type</th>
            <th className="p-2">Motif</th>
            <th className="p-2 text-right">Qté</th>
          </tr>
        </thead>
        <tbody>
          {data.map(m => (
            <tr key={m.id} className="border-t">
              <td className="p-2">
                {new Date(m.created_at).toLocaleDateString()}
              </td>
              <td className="p-2">{m.products?.name}</td>
              <td className="p-2">{m.type}</td>
              <td className="p-2">{m.reason}</td>
              <td className="p-2 text-right">{m.quantity}</td>
            </tr>
          ))}

          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={5} className="p-4 text-center text-gray-500">
                Aucun résultat
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* PAGINATION */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Page {page} / {totalPages || 1}
        </span>

        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
