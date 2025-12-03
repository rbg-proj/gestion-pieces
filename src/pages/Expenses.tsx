import { useEffect, useState } from "react";
import { supabase } from '../lib/supabase';
import { Pencil, Trash2, PlusCircle, X } from "lucide-react";

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

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    category: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

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

  const fetchExpenses = async (filter?: { from?: string; to?: string }) => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .match({})
      .gte(filter?.from ? "date" : undefined, filter?.from || undefined)
      .lte(filter?.to ? "date" : undefined, filter?.to || undefined)
      .order("date", { ascending: false });

    if (!error && data) setExpenses(data);
    setLoading(false);
  };

  const openModalForCreate = () => {
    setEditId(null);
    setForm({ category: "", description: "", amount: "", date: new Date().toISOString().split("T")[0] });
    setShowModal(true);
  };

  const openModalForEdit = (exp: Expense) => {
    setEditId(exp.id);
    setForm({
      category: exp.category,
      description: exp.description,
      amount: String(exp.amount),
      date: exp.date,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const payload = {
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      date: form.date,
      user_id: user.id,
    };

    if (editId) {
      await supabase.from("expenses").update(payload).eq("id", editId);
    } else {
      await supabase.from("expenses").insert([payload]);
    }

    setShowModal(false);
    fetchExpenses();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette dépense ?")) return;

    await supabase.from("expenses").delete().eq("id", id);
    fetchExpenses();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Du</label>
            <input
              type="date"
              className="border p-2 rounded"
              onChange={(e) => {
                const from = e.target.value;
                fetchExpenses({ from });
              }}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Au</label>
            <input
              type="date"
              className="border p-2 rounded"
              onChange={(e) => {
                const to = e.target.value;
                fetchExpenses({ to });
              }}
            />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-700">Dépenses / Sorties Caisse</h2>

        {(role === "admin" || role === "manager") && (
          <button
            onClick={openModalForCreate}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          >
            <PlusCircle size={18} />
            Ajouter une dépense
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow rounded-lg border border-gray-200">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
            <tr>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Catégorie</th>
              <th className="py-3 px-4 text-left">Description</th>
              <th className="py-3 px-4 text-left">Montant</th>
              {(role === "admin" || role === "manager") && (
                <th className="py-3 px-4 text-center">Actions</th>
              )}
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
                      <button onClick={() => openModalForEdit(exp)} className="text-blue-600 hover:text-blue-800 transition">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => handleDelete(exp.id)} className="text-red-600 hover:text-red-800 transition">
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative animate-fadeIn">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setShowModal(false)}
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold mb-4">
              {editId ? "Modifier la dépense" : "Ajouter une dépense"}
            </h3>

            {/* Inputs */}
            <div className="flex flex-col gap-3">
              <input
                className="border p-2 rounded"
                placeholder="Catégorie"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />

              <input
                className="border p-2 rounded"
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <input
                type="number"
                className="border p-2 rounded"
                placeholder="Montant"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />

              <input
                type="date"
                className="border p-2 rounded"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <button
              onClick={handleSave}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
