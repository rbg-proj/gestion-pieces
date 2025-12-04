import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useParams } from "react-router-dom";

export default function AddCashEntry() {
  const navigate = useNavigate();
  const { id } = useParams(); // ⬅️ récupère l'id si mode édition

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isEditMode = Boolean(id); // vrai si on édite

  // Charger les données existantes si mode édition
  useEffect(() => {
    if (!isEditMode) return;

    const loadEntry = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("cash_entries")
        .select("description, amount")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Erreur chargement :", error);
        setErrorMsg("Impossible de charger cette entrée.");
      } else if (data) {
        setDescription(data.description);
        setAmount(data.amount);
      }

      setLoading(false);
    };

    loadEntry();
  }, [id, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!description.trim()) {
      setErrorMsg("La description est obligatoire.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setErrorMsg("Le montant doit être supérieur à 0.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isEditMode) {
        // 🔄 MODE MODIFICATION
        const { error } = await supabase
          .from("cash_entries")
          .update({
            description,
            amount: Number(amount),
            user_id: user?.id || null,
          })
          .eq("id", id);

        if (error) throw error;
      } else {
        // ➕ MODE AJOUT
        const { error } = await supabase.from("cash_entries").insert({
          description,
          amount: Number(amount),
          user_id: user?.id || null,
        });

        if (error) throw error;
      }

      navigate("/cashledger");
    } catch (err: any) {
      console.error("Erreur :", err);
      setErrorMsg(err.message || "Une erreur s'est produite.");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto relative">
      {/* Bouton fermer */}
      <button
        onClick={() => navigate("/cashledger")}
        className="absolute top-4 right-4 text-red-500 hover:text-red-700 font-bold text-xl transition-colors"
      >
        X
      </button>

      <h1 className="text-xl font-bold mb-4">
        {isEditMode ? "Modifier une Entrée" : "Nouvelle Entrée en Caisse"}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 p-4 border rounded-lg bg-white shadow"
      >
        {errorMsg && (
          <p className="text-red-600 text-sm bg-red-100 p-2 rounded">
            {errorMsg}
          </p>
        )}

        <div>
          <label className="block font-medium mb-1">Description</label>
          <input
            type="text"
            className="w-full border px-3 py-2 rounded focus:outline-none"
            placeholder="Ex: Approvisionnement, dépôt…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Montant</label>
          <input
            type="number"
            className="w-full border px-3 py-2 rounded focus:outline-none"
            placeholder="0"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value ? Number(e.target.value) : "")
            }
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading
            ? "Enregistrement..."
            : isEditMode
            ? "Mettre à jour"
            : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
