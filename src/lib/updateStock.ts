import { supabase } from "@/lib/supabase";

export async function updateStock(productId: string, movementType: "in" | "out", quantity: number) {
  if (quantity <= 0) throw new Error("La quantité doit être positive");

  // 1. Récupérer le stock actuel
  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .single();

  if (fetchError || !product) throw new Error("Produit introuvable");

  const currentQty = product.stock_quantity || 0;
  const newQty = movementType === "in" ? currentQty + quantity : currentQty - quantity;

  if (newQty < 0) throw new Error("Stock insuffisant");

  // 2. Enregistrer le mouvement
  const { error: movementError } = await supabase.from("stock_movements").insert({
    product_id: productId,
    movement_type: movementType,
    quantity,
  });
  if (movementError) throw new Error("Erreur lors de l'enregistrement du mouvement");

  // 3. Mettre à jour le stock
  const { error: updateError } = await supabase
    .from("products")
    .update({ stock_quantity: newQty })
    .eq("id", productId);

  if (updateError) throw new Error("Erreur lors de la mise à jour du stock");
}
