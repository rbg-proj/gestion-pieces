import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
}

const REASONS = [
  "ENDOMMAGE",
  "PERIME",
  "PERTE",
  "AJUSTEMENT",
];

export default function StockMovement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [type, setType] = useState<"IN" | "OUT">("OUT");
  const [reason, setReason] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, stock")
        .order("name");

      if (data) setProducts(data);
    };

    loadProducts();
  }, []);

  const handleSubmit = async () => {
    if (!product || !reason || quantity <= 0) return;

    if (type === "OUT" && quantity > product.stock_quantity) {
      alert("Stock insuffisant");
      return;
    }

    setLoading(true);

    // 1. Enregistrer le mouvement
    const { error } = await supabase.from("stock_movements").insert({
      product_id: product.id,
      type,
      reason,
      quantity,
      comment,
    });

    if (error) {
      alert("Erreur lors de l'enregistrement");
      setLoading(false);
      return;
    }

    // 2. Mettre à jour le stock
    const newStock =
      type === "OUT"
        ? product.stock_quantity - quantity
        : product.stock_quantity + quantity;

    await supabase
      .from("products")
      .update({ stock_quantity: newStock })
      .eq("id", product.id);

    // reset
    setProduct(null);
    setQuantity(1);
    setReason("");
    setComment("");
    setLoading(false);
    alert("Mouvement enregistré");
  };

  return (
    <div className="max-w-md space-y-4">
      <Select onValueChange={(id) => {
        const p = products.find(p => p.id === id);
        if (p) setProduct(p);
      }}>
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner un produit" />
        </SelectTrigger>
        <SelectContent>
          {products.map(p => (
            <SelectItem key={p.id} value={p.id}>
              {p.name} (Stock: {p.stock_quantity})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={type} onValueChange={(v: "IN" | "OUT") => setType(v)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="OUT">Sortie</SelectItem>
          <SelectItem value="IN">Entrée</SelectItem>
        </SelectContent>
      </Select>

      <Select value={reason} onValueChange={setReason}>
        <SelectTrigger>
          <SelectValue placeholder="Motif" />
        </SelectTrigger>
        <SelectContent>
          {REASONS.map(r => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="number"
        min={1}
        value={quantity}
        onChange={e => setQuantity(Number(e.target.value))}
        placeholder="Quantité"
      />

      <Input
        placeholder="Commentaire (optionnel)"
        value={comment}
        onChange={e => setComment(e.target.value)}
      />

      <Button onClick={handleSubmit} disabled={loading}>
        Valider
      </Button>
    </div>
  );
}
