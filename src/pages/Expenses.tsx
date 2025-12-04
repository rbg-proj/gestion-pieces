/* ======= VERSION OPTIMISÉE ET RESPONSIVE ======= */

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Pencil, Trash2, PlusCircle, FileSpreadsheet, X } from "lucide-react";
import ExpenseCategories from "./Expenses-categories";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";

interface Expense {
  id: number;
  category_id: number;
  category_name?: string;
  description: string;
  amount: number;
  date: string;
  user_id: string | null;
}

export default function Expenses() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);

  // Filtres
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    category_id: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  useEffect(() => {
    fetchRole();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [page, fromDate, toDate]);

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

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("expense_categories")
      .select("*")
      .order("name", { ascending: true });

    if (!error) setCategories(data || []);
  };

  const fetchExpenses = async () => {
    setLoading(true);

    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("expenses")
      .select(
        `
        id,
        description,
        amount,
        date,
        user_id,
        category_id,
        category:expense_categories(name)
      `,
        { count: "exact" }
      )
      .order("date", { ascending: false })
      .range(from, to);

    if (fromDate) query = query.gte("date", fromDate);
    if (toDate) query = query.lte("date", toDate);

    const { data, count, error } = await query;

    if (!error) {
      setExpenses(
        (data || []).map((exp: any) => ({
          ...exp,
          category_name: exp.category?.name || "Non défini",
        }))
      );
      setTotalCount(count || 0);
    }

    setLoading(false);
  };

  const exportExcel = () => {
    const cleaned = expenses.map((e) => ({
      Date: e.date,
      Catégorie: e.category_name,
      Description: e.description,
      Montant: e.amount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(cleaned);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dépenses");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      "RBG_depenses.xlsx"
    );
  };

  const openModalForCreate = () => {
    setEditId(null);
    setForm({
      category_id: "",
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const openModalForEdit = (exp: Expense) => {
    setEditId(exp.id);
    setForm({
      category_id: String(exp.category_id),
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
      category_id: Number(form.category_id),
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
    if (!confirm("Voulez-vous vraiment SUPPRIMER cette dépense ?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    fetchExpenses();
  };

  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + Number(exp.amount || 0),
    0
  );

  return (
    <div className="p-4 md:p-6">

      <h2 className="text-lg md:text-xl font-bold text-gray-700 text-start">
          Dépenses / Sorties Caisse
      </h2>
      
      {/* ===== HEADER + FILTRES ===== */}
      <div className="flex flex-col gap-4 md:gap-0 md:flex-row md:items-center md:justify-between mb-6">
        
        {/* Filtres */}
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-sm text-gray-600">Du</label>
            <input
              type="date"
              className="border p-2 rounded w-full"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-sm text-gray-600">Au</label>
            <input
              type="date"
              className="border p-2 rounded w-full"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

       

        {(role === "admin" || role === "manager") && (
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={openModalForCreate}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <PlusCircle size={18} /> Ajouter
            </button>

            <button
              onClick={() => setShowCategoryManager(true)}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Pencil size={18} /> Catégories
            </button>

            <button
              onClick={() => navigate("/cashledger")}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <X size={18} />
            </button>

            
          </div>
        )}
      </div>

      {/* TOTAL */}
      <div className="flex justify-end mb-4">
        <div className="bg-gray-100 px-4 py-2 rounded-lg shadow text-start w-full sm:w-auto">
          <div className="text-sm text-gray-500">Total des dépenses :</div>
          <div className="text-xl font-bold text-red-600">
            {totalExpenses.toLocaleString("fr-FR")} $
          </div>
        </div>
      </div>


      {/* ===== TABLE ===== */}
      <div className="overflow-x-auto shadow rounded-lg border border-gray-200">
        <table className="min-w-full text-sm sm:text-base">
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
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  Chargement...
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  Aucune dépense enregistrée
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="border-b hover:bg-gray-50 transition">
                  <td className="py-3 px-4 whitespace-nowrap">{exp.date}</td>
                  <td className="py-3 px-4">{exp.category_name}</td>
                  <td className="py-3 px-4 break-words max-w-xs">{exp.description}</td>
                  <td className="py-3 px-4 font-semibold text-red-600">
                    {exp.amount} $
                  </td>

                  {(role === "admin" || role === "manager") && (
                    <td className="py-3 px-4 flex justify-center gap-3">
                      <button
                        onClick={() => openModalForEdit(exp)}
                        className="text-blue-600 hover:text-blue-800 transition"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="text-red-600 hover:text-red-800 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-4 py-2 gap-3">
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            ◀ Précédent
          </button>

          <span>
            Page {page + 1} / {Math.ceil(totalCount / pageSize) || 1}
          </span>

          <button
            disabled={(page + 1) * pageSize >= totalCount}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Suivant ▶
          </button>
        </div>
      </div>

      {/* ===== MODAL DÉPENSE ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-2">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setShowModal(false)}
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold mb-4">
              {editId ? "Modifier la dépense" : "Ajouter une dépense"}
            </h3>

            <div className="flex flex-col gap-3">
              <select
                className="border p-2 rounded"
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value })
                }
              >
                <option value="">-- Sélectionner une catégorie --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <input
                className="border p-2 rounded"
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />

              <input
                type="number"
                className="border p-2 rounded"
                placeholder="Montant"
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: e.target.value })
                }
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

      {/* ===== MODAL CATÉGORIES ===== */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-3">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setShowCategoryManager(false)}
            >
              <X size={20} />
            </button>
            <ExpenseCategories />
          </div>
        </div>
      )}
    </div>
  );
}
