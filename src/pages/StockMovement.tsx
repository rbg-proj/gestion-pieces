import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StockMovementHistory from "@/pages/StockMovementHistory";

interface Product {
  id: string;
  name: string;
  stock: number;
}

const REASONS = ["ENDOMMAGE", "PERIME", "PERTE", "RETOUR", "AJUSTEMENT"];

export default function StockMovement() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [type, setType] = useState<"IN" | "OUT">("OUT");
  const [reason, setReason] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

  // Soumission mouvement de stock
  const handleSubmit = async () => {
    if (!selected || quantity <= 0 || !reason) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (type === "OUT" && quantity > selected.stock) {
      alert("Stock insuffisant");
      return;
    }

    setLoading(true);

    // Insérer le mouvement
    await supabase.from("stock_movements").insert({
      product_id: selected.id,
      type,
      reason,
      quantity,
      comment,
    });

    // Mettre à jour le stock
    const newStock =
      type === "OUT"
        ? selected.stock - quantity
        : selected.stock + quantity;

    await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", selected.id);

    // Reset formulaire
    setSelected(null);
    setQuery("");
    setResults([]);
    setQuantity(1);
    setReason("");
    setComment("");
    setLoading(false);

    alert("Mouvement enregistré");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Colonne formulaire */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Mouvement de stock</h2>
        
         {/* Bouton afficher l'historique */}
        <Button
          variant="outline"
          onClick={() => setShowHistory(s => !s)}
        >
          {showHistory ? "Masquer l'historique" : "Voir l'historique"}
        </Button>
     

        {/* Champ produit */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Produit</label>
          <Input
            placeholder="Rechercher un produit (min 3 lettres)"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelected(null);
            }}
          />
        </div>

        {/* Résultats auto-complétion */}
        {results.length > 0 && (
          <div className="border rounded bg-white max-h-40 overflow-auto">
            {results.map(p => (
              <div
                key={p.id}
                className="p-2 cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  setSelected(p);
                  setResults([]);
                  setQuery(p.name);
                }}
              >
                {p.name} — Stock: {p.stock}
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div className="text-sm text-gray-600">
            Stock actuel : {selected.stock}
          </div>
        )}

        {/* Type mouvement */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Type de mouvement</label>
          <select
            className="border rounded px-2 py-1 w-full"
            value={type}
            onChange={e => setType(e.target.value as "IN" | "OUT")}
          >
            <option value="OUT">Sortie</option>
            <option value="IN">Entrée</option>
          </select>
        </div>

        {/* Motif */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Motif</label>
          <select
            className="border rounded px-2 py-1 w-full"
            value={reason}
            onChange={e => setReason(e.target.value)}
          >
            <option value="">Sélectionner un motif</option>
            {REASONS.map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Quantité */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Quantité</label>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
          />
        </div>

        {/* Commentaire */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Commentaire</label>
          <Input
            placeholder="Commentaire (optionnel)"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>

        {/* Bouton valider */}
        <Button onClick={handleSubmit} disabled={loading}>
          Valider
        </Button>
         </div>

       

      {/* Colonne historique */}
      {showHistory && (
        <div className="border-l pl-4 max-h-[80vh] overflow-y-auto">
          <StockMovementHistory />
        </div>
      )}
    </div>
  );
}
