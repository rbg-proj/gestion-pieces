import { useEffect, useState, useRef, useCallback } from "react";
import Receipt from "@/pages/Receipt";
import {
  ArrowUpDown,
  FileSpreadsheet,
  Eye,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from "xlsx";
import { formatCurrency } from "@/utils/formatCurrency";

export default function OrdersPage() {
  const { user } = useAuth();

  // Filters
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortByDateAsc, setSortByDateAsc] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Modal & Sale Details
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderInfo, setSelectedOrderInfo] = useState<any | null>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [saleDetails, setSaleDetails] = useState<any[]>([]);
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#a0522d", "#d2691e", "#4682b4", "#9acd32", "#dc143c", "#20b2aa"];
  
  const todayLocal = new Date();
  todayLocal.setHours(0, 0, 0, 0);
  const todayISO = todayLocal.toLocaleDateString("fr-CA");

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<any | null>(null);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(2800);
  const [products, setProducts] = useState<any[]>([]);
  const [searchArticle, setSearchArticle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Temporary UI state for stock check (to disable input while verifying)
  const [checkingIndex, setCheckingIndex] = useState<number | null>(null);
  const [addingProductIdChecking, setAddingProductIdChecking] = useState<number | null>(null);

  // --- Fetch orders (declarée ici pour la réutiliser) ---
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          sale_date,
          total_amount,
          payment_method,
          customers(full_name),
          sale_items(id),
          exchange_rate,
          profiles:user_id(name)
        `);

      if (error) {
        console.error("Erreur lors du chargement des ventes :", error.message);
        setOrders([]);
      } else {
        const formattedOrders = (data || []).map((sale: any) => ({
          id: `VTE-${sale.id}`,
          rawId: sale.id,
          customer: sale.customers?.full_name || "Introuvable",
          date: sale.sale_date ? new Date(sale.sale_date) : new Date(),
          total: Number(sale.total_amount || 0),
          items: sale.sale_items?.length || 0,
          paymentMethod: sale.payment_method || "Inconnu",
          exchange_rate: sale.exchange_rate ?? 1,
          agent: sale.profiles?.name || "Non trouvé",
          status: sale.payment_method === "cash" || sale.payment_method === "mobile_money" ? "Payé" : "A checker",
        }));
        setOrders(formattedOrders);
      }
    } catch (err) {
      console.error("Erreur fetchOrders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Fetch exchange rate and products
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: rateData } = await supabase
          .from("exchange_rates")
          .select("rate")
          .order("created_at", { ascending: false })
          .limit(1);
    
        if (rateData?.length > 0) setExchangeRate(Number(rateData[0].rate));
    
        const { data: productsData } = await supabase
          .from("products")
          .select("id, name, selling_price");
    
        setProducts(productsData || []);
      } catch (err) {
        console.error("Erreur loadData:", err);
      }
    };
    
    loadData();
  }, []);

  const fetchSaleDetails = async (saleId: number) => {
    try {
      const { data, error } = await supabase
        .from("sale_items")
        .select(`quantity, unit_price, products(name)`)
        .eq("sale_id", saleId);

      if (error) {
        console.error("Erreur chargement détails :", error.message);
        setSaleDetails([]);
        return;
      }

      setSaleDetails(data || []);
    } catch (err) {
      console.error("Erreur fetchSaleDetails:", err);
      setSaleDetails([]);
    }
  };

  const fetchSaleItems = async (orderId: number) => {
    try {
      const { data, error } = await supabase
        .from("sale_items")
        .select(`id, quantity, unit_price, products(name)`)
        .eq("sale_id", orderId);

      if (error) {
        console.error("Erreur chargement articles :", error.message);
        setSaleItems([]);
      } else {
        setSaleItems(data || []);
      }
    } catch (err) {
      console.error("Erreur fetchSaleItems:", err);
      setSaleItems([]);
    }
  };

  // Filter & sort orders
  const filteredOrders = orders
    .filter((order) => {
      const orderDateString = order.date instanceof Date ? order.date.toLocaleDateString("fr-CA") : new Date(order.date).toLocaleDateString("fr-CA");

      if (user?.role !== "admin" && user?.role !== "manager") {
        return orderDateString === todayISO;
      }

      const orderDate = new Date(order.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);

      const inDateRange = (!start || orderDate >= start) && (!end || orderDate <= end);
      const matchesClient = order.customer.toLowerCase().includes(clientFilter.toLowerCase());
      const searchTerm = search.toLowerCase();
      const matchesSearch = order.customer.toLowerCase().includes(searchTerm) || order.id.toLowerCase().includes(searchTerm);

      return inDateRange && matchesClient && matchesSearch;
    })
    .sort((a, b) => {
      const aDate = new Date(a.date).getTime();
      const bDate = new Date(b.date).getTime();
      return sortByDateAsc ? aDate - bDate : bDate - aDate;
    });

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / rowsPerPage));
    
  const totalVente = filteredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const ventesParClient = filteredOrders.reduce((acc, order) => {
    acc[order.customer] = (acc[order.customer] || 0) + Number(order.total || 0);
    return acc;
  }, {} as Record<string, number>);
  const ventesData = Object.entries(ventesParClient).map(([client, total]) => ({ client, total }));

  // Vérifier si le stock d’un produit est suffisant
  const checkStock = async (productId: number, requestedQty: number) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("stock")
        .eq("id", productId)
        .single();
      
      if (error) return { ok: false, stock: 0, error };
    
      const available = data.stock ?? 0;
    
      return {
        ok: requestedQty <= available,
        stock: available
      };
    } catch (err) {
      console.error("Erreur checkStock:", err);
      return { ok: false, stock: 0, error: err };
    }
  };

  // Handle update order (edits)
  const handleUpdateOrder = async () => {
    if (!editOrder) return;
  
    setIsSaving(true);
  
    try {
      // 1. Charger ANCIENS items pour comparer
      const { data: oldItems = [], error: oldErr } = await supabase
        .from("sale_items")
        .select("id, product_id, quantity")
        .eq("sale_id", editOrder.id);

      if (oldErr) throw oldErr;
  
      // Convertir en maps pour comparaison rapide
      const oldMap: Record<string, any> = {};
      (oldItems || []).forEach((item: any) => (oldMap[String(item.product_id)] = item));
  
      const newItems = (editOrder.items || []).map((it: any) => ({
        product_id: it.product_id ?? it.product_id,
        quantity: Number(it.quantity || 0),
        unit_price: Number(it.unit_price || 0),
        tempId: it.id, // may be undefined for newly added items
      }));
      const newMap: Record<string, any> = {};
      newItems.forEach((item: any) => (newMap[String(item.product_id)] = item));
  
      // 2. TRAITER LES SUPPRESSIONS → RESTAURER LE STOCK
      for (const old of oldItems) {
        if (!newMap[String(old.product_id)]) {
          // → Cet article a été supprimé
          await supabase.rpc("increase_stock", {
            p_product_id: old.product_id,
            p_qty: old.quantity,
          });

          await supabase.from("sale_items").delete().eq("id", old.id);
        }
      }
  
      // 3. METTRE À JOUR OU AJOUTER LES ITEMS
      for (const newItem of newItems) {
        const old = oldMap[String(newItem.product_id)];

        if (old) {
          // → L’article existait déjà
          const diff = Number(newItem.quantity) - Number(old.quantity);

          if (diff !== 0) {
            if (diff > 0) {
              await supabase.rpc("decrease_stock", {
                p_product_id: newItem.product_id,
                p_qty: diff,
              });
            } else {
              await supabase.rpc("increase_stock", {
                p_product_id: newItem.product_id,
                p_qty: Math.abs(diff),
              });
            }
          }

          await supabase
            .from("sale_items")
            .update({
              quantity: newItem.quantity,
              unit_price: newItem.unit_price,
            })
            .eq("id", old.id);
        } else {
          // → NOUVEL ARTICLE AJOUTÉ
          await supabase.rpc("decrease_stock", {
            p_product_id: newItem.product_id,
            p_qty: newItem.quantity,
          });

          await supabase.from("sale_items").insert({
            sale_id: editOrder.id,
            product_id: newItem.product_id,
            quantity: newItem.quantity,
            unit_price: newItem.unit_price,
          });
        }
      }
  
      // 4. Mettre à jour le total de la vente
      const newTotal = (editOrder.items || []).reduce(
        (sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
        0
      );

      await supabase
        .from("sales")
        .update({ total_amount: newTotal })
        .eq("id", editOrder.id);
  
      // 5. Rafraîchir
      setEditModalOpen(false);
      setEditOrder(null);
      await fetchOrders();
      alert("Vente mise à jour avec succès !");
    } catch (error) {
      console.error("Erreur update:", error);
      alert("Erreur lors de la mise à jour de la vente.");
    } finally {
      setIsSaving(false);
    }
  };

  // SUPPRESSION VENTE + RESTAURATION STOCK
  const deleteOrder = async (orderId: number) => {
    if (!window.confirm("Voulez-vous VRAIMENT SUPPRIMER cette vente ?\nLe stock sera automatiquement restauré.")) {
      return;
    }
    
    try {
      // 1️⃣ Récupérer les items de la vente
      const { data: saleItems, error: saleItemsError } = await supabase
        .from("sale_items")
        .select("product_id, quantity")
        .eq("sale_id", orderId);
    
      if (saleItemsError) {
        console.error("Erreur récupération sale_items:", saleItemsError);
        alert("Erreur lors de la récupération de la vente.");
        return;
      }
    
      // 2️⃣ Restaurer le stock produit par produit
      for (const item of saleItems) {
        const { error: stockError } = await supabase.rpc("increase_stock", {
          p_product_id: item.product_id,
          p_qty: item.quantity,
        });
    
        if (stockError) {
          console.error("Erreur restauration stock:", stockError);
          alert("Erreur restauration stock pour un produit.");
          return;
        }
      }
    
      // 3️⃣ Supprimer les sale_items
      await supabase.from("sale_items").delete().eq("sale_id", orderId);
    
      // 4️⃣ Supprimer la vente elle-même
      const { error: deleteError } = await supabase
        .from("sales")
        .delete()
        .eq("id", orderId);
    
      if (deleteError) {
        console.error("Erreur suppression vente:", deleteError);
        alert("Erreur suppression de la vente.");
        return;
      }
    
      // 5️⃣ Recharger données UI
      fetchOrders();
      alert("Vente supprimée et stock restauré avec succès !");
    } catch (error) {
      console.error(error);
      alert("Erreur inattendue.");
    }
  };

  // Handler pour changement de quantité dans le modal d'édition
  const handleQuantityChange = async (productId: number, newQty: number, index: number) => {
    if (!editOrder) return;
    if (!Number.isFinite(newQty) || newQty < 0) return;

    const currentItems = editOrder.items || [];
    const oldQty = Number(currentItems[index]?.quantity || 0);

    // si on augmente, vérifier le stock avant de valider le changement
    if (newQty > oldQty) {
      const diff = newQty - oldQty;
      setCheckingIndex(index);
      try {
        const check = await checkStock(productId, diff);
        if (!check.ok) {
          alert(`Stock insuffisant pour "${currentItems[index]?.productName || productId}". Stock disponible : ${check.stock}`);
          return;
        }
      } catch (err) {
        console.error("Erreur lors du checkStock:", err);
        alert("Impossible de vérifier le stock pour le moment.");
        return;
      } finally {
        setCheckingIndex(null);
      }
    }

    // Appliquer la modification localement
    const updated = [...currentItems];
    updated[index] = { ...updated[index], quantity: newQty };
    setEditOrder({ ...editOrder, items: updated });
  };

  // Handler pour changement de prix unitaire (simple mise à jour locale)
  const handleUnitPriceChange = (index: number, newPrice: number) => {
    if (!editOrder) return;
    const updated = [...(editOrder.items || [])];
    updated[index] = { ...updated[index], unit_price: newPrice };
    setEditOrder({ ...editOrder, items: updated });
  };

  // Ajouter un article depuis la liste produit en vérifiant le stock (1 par défaut)
  const handleAddProductToEdit = async (p: any) => {
    if (!editOrder) return;
    const productId = p.id;
    const initialQty = 1;

    setAddingProductIdChecking(productId);
    try {
      const check = await checkStock(productId, initialQty);
      if (!check.ok) {
        alert(`Impossible d'ajouter "${p.name}" — stock insuffisant (disponible: ${check.stock}).`);
        return;
      }

      const updated = [...(editOrder.items || []), {
        product_id: p.id,
        productName: p.name,
        quantity: initialQty,
        unit_price: Number(p.selling_price || 0)
      }];
      setEditOrder({ ...editOrder, items: updated });
    } catch (err) {
      console.error("Erreur checkStock lors de l'ajout:", err);
      alert("Impossible de vérifier le stock pour le moment.");
    } finally {
      setAddingProductIdChecking(null);
    }
  };

  // Export Excel
  const exportToExcel = () => {
    const exportData = filteredOrders.map((order) => ({
      "N° Vente": order.id,
      Date: order.date instanceof Date ? order.date.toLocaleDateString("fr-FR") : new Date(order.date).toLocaleDateString("fr-FR"),
      Client: order.customer,
      "Montant ($)": order.total,
      "Nb Articles": order.items,
      "Mode Paiement": order.paymentMethod,
      Statut: order.status,
      Agent: order.agent,
      "Taux Change": order.exchange_rate,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rapport Ventes");
    XLSX.writeFile(workbook, `Rapport_Ventes_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.xlsx`);
  };

  const actionsVisible = user?.role === "admin" || user?.role === "manager";
  const columnsCount = actionsVisible ? 7 : 6;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Rapport des ventes</h1>
        <button
          onClick={exportToExcel}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-150 ease-in-out"
        >
          <FileSpreadsheet size={16} className="mr-2" /> Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <span className="flex items-center gap-2">Vente Du</span>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" disabled={!actionsVisible} />
        <span className="flex items-center gap-2">Au</span>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" disabled={!actionsVisible} />
        <Input placeholder="Filtrer par client" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="w-64" />
      </div>

      {/* Pie chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={ventesData.slice(0, 5)} dataKey="total" nameKey="client" cx="30%" cy="50%" outerRadius={80} fill="#8884d8">
              {ventesData.slice(0, 5).map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        {ventesData.length > 5 && <p className="text-xs text-gray-500 mt-1">Affichage des 5 premiers clients seulement</p>}
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Nombre Total de ventes : {filteredOrders.length}</p>
        <p className="text-sm font-medium">Montant Total des ventes : {totalVente.toLocaleString("fr-FR")} $</p>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => setSortByDateAsc(!sortByDateAsc)}>Date <ArrowUpDown className="inline ml-1 h-4 w-4" /></TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Total vente</TableHead>
                <TableHead>Nb Articles</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Mode Paiement</TableHead>
                {actionsVisible && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={columnsCount}>Chargement des ventes ...</TableCell></TableRow>
              ) : currentOrders.length > 0 ? (
                currentOrders.map((order) => (
                  <TableRow key={order.rawId} className={`cursor-pointer hover:bg-muted/50`} onClick={() => {
                    setSelectedOrderId(order.rawId);
                    fetchSaleItems(order.rawId);
                    setSelectedOrderInfo({
                      customerName: order.customer,
                      paymentMethod: order.paymentMethod,
                      date: order.date instanceof Date ? order.date.toISOString() : new Date(order.date).toISOString(),
                      total: order.total,
                      exchange_rate: order.exchange_rate,
                      agent: order.agent,
                    });
                  }}>
                    <TableCell>{order.date instanceof Date ? order.date.toLocaleDateString() : new Date(order.date).toLocaleDateString()}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>{Number(order.total || 0).toLocaleString("fr-FR")} $</TableCell>
                    <TableCell>{order.items}</TableCell>
                    <TableCell><Badge variant={order.status === "Payé" ? "success" : "secondary"}>{order.status}</Badge></TableCell>
                    <TableCell>{order.paymentMethod}</TableCell>
                    
                    {actionsVisible && (
                    <TableCell className="text-center">
                      <div className="py-3 px-0 flex items-center justify-start gap-2">
                        
                        <button onClick={(e) => { e.stopPropagation(); setSelectedSale(order); fetchSaleDetails(order.rawId); }} 
                          className="p-2 rounded-full hover:bg-blue-100 transition-colors duration-200 text-blue-600 hover:text-blue-800" 
                          title="Voir les détails"><Eye size={18} />
                        </button>

                        {/* Modifier */} 
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                        
                            // 1️⃣ Charger articles de la vente
                            const { data: items = [] } = await supabase
                              .from("sale_items")
                              .select(`id, quantity, unit_price, product_id, products(name)`)
                              .eq("sale_id", order.rawId);
                        
                            // 2️⃣ Charger produits disponibles
                            const { data: prods = [] } = await supabase
                              .from("products")
                              .select(`id, name, selling_price`);
                        
                            setProductsList(prods || []);
                        
                            // 3️⃣ Construire un editOrder PROPRE et SOLIDE
                            setEditOrder({
                              id: order.rawId,
                              customer: order.customer,
                              paymentMethod: order.paymentMethod,
                              exchange_rate: order.exchange_rate,
                              items: (items || []).map((it: any) => ({
                                id: it.id,
                                product_id: it.product_id,
                                productName: it.products?.name || "",
                                quantity: Number(it.quantity || 0),
                                unit_price: Number(it.unit_price || 0)
                              }))
                            });
                        
                            // 4️⃣ Ouvrir le modal
                            setEditModalOpen(true);
                          }}
                          className="p-2 rounded-full hover:bg-yellow-100 transition-colors duration-200 text-yellow-600 hover:text-yellow-800"
                          title="Modifier la vente"
                        >
                          <Pencil size={18} />
                        </button>
                        
                      {/* Supprimer */} 
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteOrder(order.rawId);
                        }}
                        className="p-2 rounded-full hover:bg-blue-100 transition-colors duration-200 text-blue-600 hover:text-blue-800"
                        title="Attention --> Suppression"
                      >
                        <Trash2 size={18} />
                      </button>

                      </div>
                    </TableCell>
                    )}
                  </TableRow>
                ))
              ) : <TableRow><TableCell colSpan={columnsCount}>Aucune vente trouvée.</TableCell></TableRow>}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Précédent</button>
              <span className="text-sm text-gray-700">Page {currentPage} / {totalPages}</span>
              <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Suivant</button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-lg animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-lg">
                  {selectedSale.customer?.charAt(0) ?? "?"}
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold">Détails de la Vente</h2> 
                 
                  <p className="text-sm text-gray-500">Numéro : {selectedSale.id}</p>
                  <p className="text-sm text-gray-500">Date vente : {selectedSale.date instanceof Date ? selectedSale.date.toLocaleDateString() : new Date(selectedSale.date).toLocaleDateString()}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedSale(null); setSaleDetails([]); }} className="text-gray-400 hover:text-gray-500"><X size={20} /></button>
            </div>

            {/* Payment + Total */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-medium">{selectedSale.customer}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Montant total</p>
                <p className="font-semibold">       
                {Number(selectedSale.total || 0).toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} $ </p> 
              </div>
              <div>
                <p className="text-sm text-gray-500">Méthode Paiement</p>
                <p className="font-medium">{selectedSale.paymentMethod}</p>
              </div>
            </div>

            {/* Items Table */}
            <h3 className="font-medium text-gray-900 mb-4">Articles vendus</h3>
            <div className="overflow-y-auto max-h-72 border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Libellé</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qté</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix vente</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {saleDetails.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">Chargement...</td>
                    </tr>
                  ) : saleDetails.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.products?.name}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">{item.quantity}</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">{(Number(item.unit_price || 0) * (selectedOrderInfo?.exchange_rate ?? 1)).toLocaleString("fr-FR")} $</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Dialog */}
      <Dialog open={!!selectedOrderId} onOpenChange={() => { setSelectedOrderId(null); setSelectedOrderInfo(null); setSaleItems([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails de la vente</DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto pr-2" ref={printRef}>
            {saleItems.length > 0 && selectedOrderInfo && (
              <Receipt
                cart={saleItems.map(item => ({
                  name: item.products?.name || 'Produit inconnu',
                  quantity: item.quantity,
                  price: Number(item.unit_price || 0) * (selectedOrderInfo.exchange_rate ?? 1)
                }))}
                total={Number(selectedOrderInfo.total || 0) * (selectedOrderInfo.exchange_rate ?? 1)}
                customerName={selectedOrderInfo.customerName}
                paymentMethod={selectedOrderInfo.paymentMethod}
                date={selectedOrderInfo.date}
                userName={selectedOrderInfo.agent}
                exchangeRate={selectedOrderInfo.exchange_rate}
                invoiceNumber={`Dupli Fac-${String(new Date().getFullYear()).slice(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(selectedOrderId ?? '').slice(0, 6).toUpperCase()}`}
              />
            )}
          </div>

          <div className="mt-4 text-right">
            <Button onClick={handlePrint}>Imprimer le duplicata</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      {editModalOpen && editOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl shadow-lg">

            {/* HEADER */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">Modifier la vente #{editOrder.id}</h2>
              <button
                onClick={() => { setEditModalOpen(false); setEditOrder(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={22} />
              </button>
            </div>

            {/* BODY SCROLLABLE */}
            <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">

              {/* Client */}
              <div>
                <label className="text-sm text-gray-600">Client</label>
                <Input value={editOrder.customer || ""} readOnly className="bg-gray-100" />
              </div>

              {/* Paiement */}
              <div>
                <label className="text-sm text-gray-600">Méthode de paiement</label>
                <Input value={editOrder.paymentMethod || ""} readOnly className="bg-gray-100" />
              </div>

              {/* ARTICLES EXISTANTS */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Articles vendus</h3>

                <div className="space-y-4">
                  {(editOrder.items || []).map((item: any, index: number) => (
                    <div key={item.id ?? index} className="border rounded-md p-3 bg-gray-50">

                      <div className="flex justify-between items-center mb-3">
                        <strong>{item.productName || item.product_id || "Article"}</strong>

                        <button
                          onClick={() => {
                            const updatedItems = (editOrder.items || []).filter((_, i) => i !== index);
                            setEditOrder({ ...editOrder, items: updatedItems });
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* Quantité + prix */}
                      <div className="grid grid-cols-3 gap-4">

                        {/* Quantité */}
                        <div>
                          <label className="text-sm">Quantité</label>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value || "0", 10) || 0;
                              // Use handler which checks stock before allowing increases
                              handleQuantityChange(item.product_id, qty, index);
                            }}
                            disabled={checkingIndex === index}
                            className="no-spinner"
                          />
                        </div>

                        {/* Prix USD */}
                        <div>
                          <label className="text-sm">Prix USD</label>
                          <Input
                            readOnly
                            type="text"
                            value={formatCurrency(item.unit_price,"USD"}
                            onChange={(e) => {
                              const p = parseFloat(e.target.value || "0") || 0;
                              handleUnitPriceChange(index, p);
                            }}
                          />
                        </div>

                        {/* Prix FC basé sur exchange_rates */}
                        <div>
                          <label className="text-sm">Prix FC</label>
                          <Input
                            type="number"
                            className="bg-gray-200"
                            value={((Number(item.unit_price || 0) * Number(exchangeRate || 1))).toLocaleString("fr-FR")}
                          />
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AJOUT D'UN ARTICLE */}
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Ajouter un article</h3>

                {/* Recherche */}
                <Input
                  placeholder="Rechercher un article..."
                  value={searchArticle}
                  onChange={(e) => setSearchArticle(e.target.value)}
                />

                {/* Liste filtrée */}
                <div className="border rounded-md mt-2 max-h-48 overflow-y-auto">
                  {products
                    .filter(p => (p.name || "").toLowerCase().includes(searchArticle.toLowerCase()))
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleAddProductToEdit(p)}
                        className={`p-2 hover:bg-blue-50 cursor-pointer ${addingProductIdChecking === p.id ? "opacity-60 pointer-events-none" : ""}`}
                      >
                        {p.name} — {p.selling_price} $  
                        ({(Number(p.selling_price || 0) * Number(exchangeRate || 1)).toLocaleString("fr-FR")} FC)
                      </div>
                    ))}
                </div>
              </div>

              {/* TOTAL */}
              <div className="text-right text-xl font-semibold mt-6">
                Total : {( (editOrder.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0) ).toLocaleString("fr-FR")} $
              </div>

            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => { setEditModalOpen(false); setEditOrder(null); }}
                className="px-4 py-2 bg-gray-200 rounded-md"
              >
                Annuler
              </button>

              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
                onClick={handleUpdateOrder}
                disabled={isSaving}
              >
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </button>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
