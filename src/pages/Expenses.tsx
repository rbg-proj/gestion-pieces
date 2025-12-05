/* ======= EXPENSES.TSX — VERSION REFACTO 06-12-25 ======= */

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Pencil,
  Trash2,
  PlusCircle,
  FileSpreadsheet,
  X,
} from "lucide-react";
import ExpenseCategories from "./Expenses-categories";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";

/* ============================================
   TYPES
============================================ */
interface Expense {
  id: number;
  category_id: number;
  category_name?: string;
  description: string;
  amount: number; // Toujours USD dans la DB
  date: string;
  user_id: string | null;
}

interface ExpenseForm {
  category_id: string;
  description: string;
  amount: string;
  currency: "USD" | "FC";
  date: string;
}

/* ============================================
   MAIN COMPONENT
============================================ */
export default function Expenses() {
  const navigate = useNavigate();

  // DATA
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [role, setRole] = useState<string | null>(null);

  // UI
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // PAGINATION
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);

  // FILTERS
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // EXCHANGE RATE
  const [exchangeRate, setExchangeRate] = useState(1);

  // FORM
  const [form, setForm] = useState<ExpenseForm>({
    category_id: "",
    description: "",
    amount: "",
    currency: "USD",
    date: new Date().toISOString().split("T")[0],
  });

  /* ============================================
     LOAD ROLES, CATEGORIES, EXCHANGE RATE
  ============================================ */
  useEffect(() => {
    fetchRole();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (showModal) fetchExchangeRate();
  }, [showModal]);

  useEffect(() => {
    fetchExpenses();
  }, [page, fromDate, toDate]);

  /* ============================================
     FETCH FUNCTIONS
  ============================================ */
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
    const { data } = await supabase
      .from("expense_categories")
      .select("*")
      .order("name");

    setCategories(data || []);
  };

  const fetchExchangeRate = async () => {
    const { data } = await supabase
      .from("exchange_rates")
      .select("rate")
      .order("created_at", { ascending: false })
      .limit(1);

    if (data?.length) setExchangeRate(data[0].rate);
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

    const { data, count } = await query;

    setExpenses(
      (data || []).map((exp: any) => ({
        ...exp,
        category_name: exp.category?.name || "Non défini",
      }))
    );

    setTotalCount(count || 0);
    setLoading(false);
  };

  /* ============================================
     EXPORT EXCEL
  ============================================ */
  const exportExcel = () => {
    const cleaned = expenses.map((e) => ({
      Date: e.date,
      Catégorie: e.category_name,
      Description: e.description,
      Montant_USD: e.amount,
    }));

    const ws = XLSX.utils.json_to_sheet(cleaned);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dépenses");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      "RBG_depenses.xlsx"
    );
  };

  /* ============================================
     FORM HANDLERS
  ============================================ */
  const openModalForCreate = () => {
    setEditId(null);
    setForm({
      category_id: "",
      description: "",
      amount: "",
      currency: "USD",
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
      currency: "USD", // la DB stocke en USD
      date: exp.date,
    });
    setShowModal(true);
  };

  const handleSaveWithConversion = async () => {
    let amountUSD = parseFloat(form.amount);

    if (form.currency === "FC") {
      amountUSD = amountUSD / exchangeRate;
    }

    await handleSave({
      ...form,
      amount: amountUSD,
    });
  };

  const handleSave = async (data: any) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const payload = {
      category_id: Number(data.category_id),
      description: data.description,
      amount: Number(data.amount),
      date: data.date,
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
    if (!confirm("Voulez-vous vraiment supprimer cette dépense ?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    fetchExpenses();
  };

  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + Number(exp.amount || 0),
    0
  );

  /* ============================================
     RENDER
  ============================================ */

  return (
    <div className="p-4 md:p-6">
      {/* ===== TITLE + EXPORT ===== */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg md:text-xl font-bold text-gray-700">
          Dépenses / Sorties Caisse
        </h2>

        <button
          onClick={exportExcel}
          className="text-green-600 hover:text-green-800 transition p-1"
          title="Exporter en Excel"
        >
          <FileSpreadsheet size={18} />
        </button>
      </div>

      {/* ===== FILTERS ===== */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between mt-4 mb-6">

        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col">
            <label className="text-sm">Du</label>
            <input
              type="date"
              className="border p-2 rounded"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm">Au</label>
            <input
              type="date"
              className="border p-2 rounded"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        {(role === "admin" || role === "manager") && (
          <div className="flex gap-2">
            <button
              onClick={openModalForCreate}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusCircle size={18} />
              Ajouter
            </button>

            <button
              onClick={() => setShowCategoryManager(true)}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Pencil size={18} />
              Catégories
            </button>

            <button
              onClick={() => navigate("/cashledger")}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* ===== TOTAL ===== */}
      <div className="flex justify-end mb-4">
        <div className="bg-gray-100 px-4 py-2 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total dépenses :</div>
          <div className="text-xl font-bold text-red-600">
            {totalExpenses.toLocaleString("fr-FR")} $
          </div>
        </div>
      </div>

      {/* ===== TABLE ===== */}
      <div className="overflow-x-auto border rounded-lg shadow">
        <table className="min-w-full text-sm sm:text-base">
          <thead className="bg-gray-100 text-gray-600 uppercase">
            <tr>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Catégorie</th>
              <th className="py-3 px-4 text-left">Description</th>
              <th className="py-3 px-4 text-left">Montant USD</th>
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
                <tr key={exp.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{exp.date}</td>
                  <td className="py-3 px-4">{exp.category_name}</td>
                  <td className="py-3 px-4 break-words max-w-xs">
                    {exp.description}
                  </td>
                  <td className="py-3 px-4 font-semibold text-red-600">
                    {exp.amount} $
                  </td>

                  {(role === "admin" || role === "manager") && (
                    <td className="py-3 px-4 flex justify-center gap-3">
                      <button
                        onClick={() => openModalForEdit(exp)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="text-red-600 hover:text-red-800"
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
        <div className="flex items-center justify-between px-4 py-2">
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

      {/* ============================================
         MODAL — FORM
      ============================================ */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 p-3 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative mt-10">

            {/* CLOSE */}
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setShowModal(false)}
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold mb-4">
              {editId ? "Modifier la dépense" : "Ajouter une dépense"}
            </h3>

            {/* FORM */}
            <div className="flex flex-col gap-3">

              {/* Category */}
              <select
                className="border p-2 rounded"
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value })
                }
              >
                <option value="">-- Choisir une catégorie --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Description */}
              <input
                className="border p-2 rounded"
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />

              {/* Amount + Currency */}
              <div className="flex gap-2">

                {/* Amount */}
                <input
                  type="number"
                  className="border p-2 rounded w-full"
                  placeholder="Montant"
                  value={form.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    const autoCurrency =
                      parseFloat(value) >= 4000 ? "FC" : "USD";
                    setForm({
                      ...form,
                      amount: value,
                      currency: autoCurrency,
                    });
                  }}
                />

                {/* Currency */}
                <select
                  className="border p-2 rounded w-24"
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value as "USD" | "FC" })
                  }
                >
                  <option value="USD">$</option>
                  <option value="FC">Fc</option>
                </select>
              </div>

              {/* Exchange Rate */}
              <p className="text-xs text-gray-500">
                Taux du jour :{" "}
                <span className="font-bold">{exchangeRate} FC / 1$</span>
              </p>

              {/* Date */}
              <input
                type="date"
                className="border p-2 rounded"
                value={form.date}
                onChange={(e) =>
                  setForm({ ...form, date: e.target.value })
                }
              />
            </div>

            {/* SAVE */}
            <button
              onClick={handleSaveWithConversion}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* ============================================
         MODAL — CATEGORY MANAGER
      ============================================ */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 p-3 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl relative mt-10">

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
