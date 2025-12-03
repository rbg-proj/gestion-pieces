import { useEffect, useState } from "react";
import { supabase } from '../lib/supabase';
import { Pencil, Trash2, PlusCircle } from "lucide-react";

interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  date: string;
  user_id: string | null;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetchRole();
    fetchExpenses();
  }, []);

  const fetchRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setRole(data?.role || null);
  };

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (!error && data) setExpenses(data);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-700">Dépenses / Sorties Caisse</h2>

        {(role === "admin" || role === "manager") && (
          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
            <PlusCircle size={18} />
            Ajouter une dépense
          </button>
        )}
      </div>

      <div className="overflow-x-auto shadow rounded-lg border border-gray-200">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
            <tr>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Catégorie</th>
              <th className="py-3 px-4 text-left">Description</th>
              <th className="py-3 px-4 text-left">Montant</th>
              { (role === "admin" || role === "manager") && (
                <th className="py-3 px-4 text-center">Actions</th>
              ) }
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">Chargement...</td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">Aucune dépense enregistrée</td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="border-b hover:bg-gray-50 transition">
                  <td className="py-3 px-4">{exp.date}</td>
                  <td className="py-3 px-4">{exp.category}</td>
                  <td className="py-3 px-4">{exp.description}</td>
                  <td className="py-3 px-4 font-semibold text-red-600">{exp.amount} $</td>

                  {(role === "admin" || role === "manager") && (
                    <td className="py-3 px-4 flex items-center justify-center gap-4">
                      <button className="text-blue-600 hover:text-blue-800 transition">
                        <Pencil size={18} />
                      </button>
                      <button className="text-red-600 hover:text-red-800 transition">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
