// Fichier Expenses.tsx corrigé et complet
// ------------------------------------------------------
// ⚠️ Toutes les erreurs liées aux dates, filtres, pagination,
//     undefined, etc. ont été corrigées.
// ------------------------------------------------------

import { useEffect, useState } from "react";
import { supabase } from '../lib/supabase';
import { Pencil, Trash2, PlusCircle, X } from "lucide-react";
import ExpenseCategories from './Expenses-categories';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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

  // Modal Dépense
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    category: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Modal Catégories
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Filtres dates (correction : != undefined)
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchRole();
  }, []);

  useEffect(() => {
    fetchExpenses(); // recharge lorsque page, fromDate ou toDate changent
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

  // Export Excel
  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(expenses);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dépenses");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array"
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    saveAs(blob, "depenses.xlsx");
  };

  const fetchExpenses = async () => {
    setLoading(true);

    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("expenses")
      .select("*", { count: "exact" })
      .order("date", { ascending: false })
      .range(from, to);

    // Application correcte des filtres
    if (fromDate) query = query.gte("date", fromDate);
    if (toDate) query = query.lte("date", toDate);

    const { data, count, error } = await query;

    if (error) {
      console.error("Supabase Error:", error);
      setExpenses([]);
      setLoading(false);
      return;
    }

    setExpenses(data || []);
    setTotalCount(count || 0);
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

      {/* Filtres Dates corrigés */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Du</label>
            <input
              type="date"
              className="border p-2 rounded"
              value={fromDate || ""}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Au</label>
            <input
              type="date"
              className="border p-2 rounded"
              value={toDate || ""}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(0);
              }}
            />
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-700">Dépenses / Sorties Caisse</h2>

        {(role === "admin" || role === "manager") && (
          <div className="flex gap-2">
            {/* Bouton Gérer Catégories */}
            <button
              onClick={() => setShowCategoryManager(true)}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
            >
              <PlusCircle size={18} /> Gérer Catégories
            </button>

            {/* Ajouter Dépense */}
            <button
              onClick={openModalForCreate}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
            >
              <PlusCircle size={18} /> Ajouter une dépense
            </button>
          </div>
        )}
      </div>

      {/* Export Excel */}
      <button
        onClick={exportExcel}
        className="px-3 py-2 bg-green-600 text-white rounded mb-3"
      >
        📤 Exporter Excel
      </button>

      {/* Tableau */}
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
              <tr><td colSpan={5} className="py-6 text-center text-gray-500">Chargement...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-gray-500">Aucune dépense enregistrée</td></tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="border-b hover:bg-gray-50 transition">
                  <td className="py-3 px-4">{exp.date}</td>
                  <td className="py-3 px-4">{exp.category}</td>
                  <td className="py-3 px-4">{exp.description}</td>
                  <td className="py-3 px-4 font-semibold text-red-600">{exp.amount} $</td>

                  {(role === "admin" || role === "manager") && (
                    <td className="py-3 px-4 flex items-center justify-center gap-4">
                      <button onClick={() => openModalForEdit(exp)} className="text-blue-600 hover:text-blue-800 transition"><Pencil size={18} /></button>
                      <button onClick={()
