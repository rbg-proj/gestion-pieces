import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, Eye, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";

interface LedgerItem {
  id?: string;        // ⬅️ UUID de l’entrée ou dépense
  date: string;
  description: string;
  entry: number;
  exit: number;
  balance?: number;
  editable?: boolean; // ⬅️ Modif ou Suppr Appro caisse & Dépenses
}

export default function CashLedger() {
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [filtered, setFiltered] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedEntries = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Sorting
  const [sortField, setSortField] = useState<keyof LedgerItem>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleDelete = async (item: LedgerItem) => {
        if (!window.confirm("Voulez-vous vraiment SUPPRIMER cette entrée ?")) return;
        await supabase.from("cash_entries").delete().eq("id", item.id);      
        loadLedger(); // recharger après suppression
      };


  useEffect(() => {
    loadLedger();
  }, []);

  const loadLedger = async () => {
    setLoading(true);

    try {
      // 1️⃣ Ventes (Entrées)
      const { data: dailySales, error: salesError } = await supabase
            .rpc("get_daily_sales");
          
          if (salesError) console.error("Erreur ventes journalières :", salesError);
          
          const salesRows: LedgerItem[] =
            dailySales?.map((s) => ({
              date: s.day,
              description: "Vente journalière",
              entry: Number(s.total),
              exit: 0,
              editable: false, // ⬅️ impossible à modifier/supprimer
            })) || [];


      // 2️⃣ Dépenses (Sorties)
      const { data: expenses } = await supabase
        .from("expenses")
        .select("id, date, description, amount");

      const expenseRows: LedgerItem[] =
        expenses?.map((e) => ({
          date: e.date,
          description: `Dépense - ${e.description || "Non spécifiée"}`,
          entry: 0,
          exit: Number(e.amount),
          editable: false, // ⬅️ modifiable
        })) || [];

      // 3️⃣ Entrées manuelles
      const { data: entries } = await supabase
        .from("cash_entries")
        .select("id, date, description, amount");

      const entryRows: LedgerItem[] =
        entries?.map((c) => ({
          id: c.id,
          date: c.date,
          description: `Appro caisse - ${c.description}`,
          entry: Number(c.amount),
          exit: 0,
          editable: true, // ⬅️ modifiable
        })) || [];

      // Fusion
      const combined = [...salesRows, ...expenseRows, ...entryRows];

      // Tri initial par date
      combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      

      // Solde cumulatif
      let balance = 0;
      const finalRows = combined.map((row) => {
        balance += row.entry - row.exit;
        return { ...row, balance };
      });

      setLedger(finalRows);
      setFiltered(finalRows);
    } catch (error) {
      console.error("Erreur chargement ledger :", error);
    }

    setLoading(false);
  };

  // Apply search, date filter, sort
  useEffect(() => {
    let result = [...ledger];

    // Recherche
    if (search.trim() !== "") {
      result = result.filter((e) =>
        e.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtre par date
    if (startDate) result = result.filter((e) => e.date >= startDate);
    if (endDate) result = result.filter((e) => e.date <= endDate);

    // Tri
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "date") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Recalcul solde cumulatif
    let balance = 0;
    result = result.map((row) => {
      balance += row.entry - row.exit;
      return { ...row, balance };
    });

    setFiltered(result);
    setPage(1);
  }, [search, startDate, endDate, sortField, sortOrder, ledger]);

  const handleSort = (field: keyof LedgerItem) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: keyof LedgerItem }) => {
    if (sortField !== field) return <span className="opacity-30">↕</span>;
    return <span>{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  // Totaux dynamiques
  const totalEntry = filtered.reduce((acc, curr) => acc + curr.entry, 0);
  const totalExit = filtered.reduce((acc, curr) => acc + curr.exit, 0);
  const totalBalance = filtered.length
    ? filtered[filtered.length - 1].balance
    : 0;

  return (
    <div className="p-6">

      {/* 🔹 En-tête avec bouton */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Journal de Caisse</h1>

        <div className="flex gap-2">
        <button
          onClick={() => navigate("/addcashentry")}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" /> Entrée Caisse
        </button>
        
        <button
          onClick={() => navigate("/expenses")}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition flex items-center"
        >
          <Eye className="w-4 h-4 mr-1" /> Sorties
        </button>
        </div>  
      </div>

      {/* 🔹 Filtres */}
      <Card className="mb-4">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Recherche</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
              <input
                type="text"
                className="pl-8 w-full border rounded-md p-2"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Du</label>
            <input
              type="date"
              className="w-full border rounded-md p-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Au</label>
            <input
              type="date"
              className="w-full border rounded-md p-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 🔹 Tableau */}
      {loading ? (
        <p>Chargement en cours ...</p>
      ) : (
        <>
          <div className="overflow-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th
                    className="p-3 text-left font-semibold cursor-pointer"
                    onClick={() => handleSort("date")}
                  >
                    Date <SortIcon field="date" />
                  </th>
                  <th
                    className="p-3 text-left font-semibold cursor-pointer"
                    onClick={() => handleSort("description")}
                  >
                    Description <SortIcon field="description" />
                  </th>
                  <th
                    className="p-3 text-right font-semibold cursor-pointer"
                    onClick={() => handleSort("entry")}
                  >
                    Entrée <SortIcon field="entry" />
                  </th>
                  <th
                    className="p-3 text-right font-semibold cursor-pointer"
                    onClick={() => handleSort("exit")}
                  >
                    Sortie <SortIcon field="exit" />
                  </th>
                  <th className="p-3 text-right font-semibold">Solde</th>
                  
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-500">
                      Aucune entrée trouvée.
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3">{item.date}</td>
                      <td className="p-3">{item.description}</td>
                      <td className="p-3 text-right text-green-600">
                         {item.entry > 0 ? formatCurrency(item.entry,"USD") :""}
                      </td>
                      <td className="p-3 text-right text-red-600">
                        {item.exit > 0 ? formatCurrency(item.exit,"USD") :""}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(item.balance, "USD")}
                      </td>
                      <td className="p-3 text-center">
                          {item.editable ? (
                            <div className="flex justify-center gap-3">
                              <button
                                onClick={() => item.id && navigate(`/addcashentry/${item.id}`)}
                                className="text-blue-600 hover:scale-110 transition"
                              >
                                ✏️
                              </button>
                        
                              <button
                                onClick={() => handleDelete(item)}
                                className="text-red-600 hover:scale-110 transition"
                              >
                                🗑️
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span> // pas d’action pour les ventes journalières
                          )}
                        </td>

                    </tr>
                  ))
                )}
                {/* 🔹 Totaux dynamiques */}
                <tr>
                  <td>
                  </td>
                  
                  <td className="p-3 text-right font-bold">
                    T O T A L
                  </td>
                  
                  <td className="p-3 text-right text-green-600 font-bold">
                    {formatCurrency(totalEntry, "USD")}
                  </td>
                   
                  <td className="p-3 text-right text-red-600 font-bold">
                    {formatCurrency(totalExit, "USD")}
                  
                  </td>

                  <td className="p-3 text-right font-bold">
                    {formatCurrency(totalBalance, "USD")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 🔹 Pagination */}
      <div className="flex justify-between items-center mt-4">
        <button
          className="px-3 py-2 bg-gray-200 rounded disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Précédent
        </button>
        <span>
          Page {page} / {totalPages || 1}
        </span>
        <button
          className="px-3 py-2 bg-gray-200 rounded disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Suivant
        </button>
      </div>
    </div>
  );
} 
