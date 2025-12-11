import { useEffect, useState, useRef } from "react";
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

  //Modification d'une vente
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<any | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);



  // Fetch Orders
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
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
      } else {
        const formattedOrders = data.map((sale) => ({
          id: `VTE-${sale.id}`,
          rawId: sale.id,
          customer: sale.customers?.full_name || "Introuvable",
          date: new Date(sale.sale_date),
          total: sale.total_amount,
          items: sale.sale_items?.length || 0,
          paymentMethod: sale.payment_method || "Inconnu",
          exchange_rate: sale.exchange_rate ?? 1,
          agent: sale.profiles?.name || "Non trouvé",
          status: sale.payment_method === "cash" || sale.payment_method === "mobile_money" ? "Payé" : "A checker",
        }));
        setOrders(formattedOrders);
      }
      setLoading(false);
    };

    fetchOrders();
  }, []);

  const fetchSaleDetails = async (saleId: number) => {
    const { data, error } = await supabase
      .from("sale_items")
      .select(`quantity, unit_price, products(name)`)
      .eq("sale_id", saleId);

    if (error) {
      console.error("Erreur chargement détails :", error.message);
      return;
    }

    setSaleDetails(data);
  };

  const fetchSaleItems = async (orderId: number) => {
    const { data, error } = await supabase
      .from("sale_items")
      .select(`id, quantity, unit_price, products(name)`)
      .eq("sale_id", orderId);

    if (error) {
      console.error("Erreur chargement articles :", error.message);
    } else {
      setSaleItems(data);
    }
  };

  // Filter & sort orders
  const filteredOrders = orders
    .filter((order) => {
      const orderDateString = order.date.toLocaleDateString("fr-CA");

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
      const aDate = new Date(a.date);
      const bDate = new Date(b.date);
      return sortByDateAsc ? aDate - bDate : bDate - aDate;
    });

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);

  const totalVente = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const ventesParClient = filteredOrders.reduce((acc, order) => {
    acc[order.customer] = (acc[order.customer] || 0) + order.total;
    return acc;
  }, {} as Record<string, number>);
  const ventesData = Object.entries(ventesParClient).map(([client, total]) => ({ client, total }));

  // Export Excel
  const exportToExcel = () => {
    const exportData = filteredOrders.map((order) => ({
      "N° Vente": order.id,
      Date: order.date.toLocaleDateString("fr-FR"),
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
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" disabled={user?.role !== "admin" && user?.role !== "manager"} />
        <span className="flex items-center gap-2">Au</span>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" disabled={user?.role !== "admin" && user?.role !== "manager"} />
        <Input placeholder="Filtrer par client" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="w-64" />
      </div>

      {/* Pie chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={ventesData.slice(0, 5)} dataKey="total" nameKey="client" cx="30%" cy="50%" outerRadius={80} fill="#8884d8" label={({ name }) => name}>
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
                {(user?.role === "admin" || user?.role === "manager") &&                                   <TableHead>Actions</TableHead>}
                
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7}>Chargement des ventes ...</TableCell></TableRow>
              ) : currentOrders.length > 0 ? (
                currentOrders.map((order) => (
                  <TableRow key={order.rawId} className={`cursor-pointer hover:bg-muted/50`} onClick={() => {
                    setSelectedOrderId(order.rawId);
                    fetchSaleItems(order.rawId);
                    setSelectedOrderInfo({
                      customerName: order.customer,
                      paymentMethod: order.paymentMethod,
                      date: order.date.toISOString(),
                      total: order.total,
                      exchange_rate: order.exchange_rate,
                      agent: order.agent,
                    });
                  }}>
                    <TableCell>{order.date.toLocaleDateString()}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>{order.total.toLocaleString("fr-FR")} $</TableCell>
                    <TableCell>{order.items}</TableCell>
                    <TableCell><Badge variant={order.status === "Payé" ? "success" : "secondary"}>{order.status}</Badge></TableCell>
                    <TableCell>{order.paymentMethod}</TableCell>
                    
                    {(user?.role === "admin" || user?.role === "manager") && (
                    <TableCell className="text-center">
                      <div className="py-3 px-0 flex items-center justify-start gap-2">
                        
                        <button onClick={(e) => { e.stopPropagation();                                                 setSelectedSale(order); 
                          fetchSaleDetails(order.rawId); }} 
                          className="p-2 rounded-full hover:bg-blue-100 transition-colors duration-200 text-blue-600 hover:text-blue-800" 
                          title="Voir les détails"><Eye size={18} />
                        </button>

                        {/* Modifier */} 
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setEditOrder(order);
                            
                          // Charger articles de la vente
                          const { data: items } = await supabase
                            .from("sale_items")
                            .select(`id, quantity, unit_price, product_id, products(name)`)
                            .eq("sale_id", order.rawId);
                      
                          setEditItems(items || []);
                  
                          // Charger liste des produits →
                          const { data: prods } = await supabase
                            .from("products")
                            .select(`id, name, selling_price`);

                          setProductsList(prods || []);
                          setEditModalOpen(true);
                        }}
                        className="p-2 rounded-full hover:bg-yellow-100 transition-colors duration-200 text-yellow-600 hover:text-yellow-800"
                        title="Modifier la vente"
                      >
                        <Pencil size={18} />
                      </button>
                        
                      {/* Supprimer */} 
                      <button onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm("Voulez-vous SUPPRIMER DEFINITIVEMENT cette vente ?")) return;
                          const { error } = await supabase.from("sales").delete().eq("id", order.rawId);
                          if (error) console.error("Erreur suppression de la vente :", error.message);
                          else setOrders((prev) => prev.filter((o) => o.rawId !== order.rawId));
                        }} className="p-2 rounded-full hover:bg-blue-100 transition-colors duration-200 text-blue-600 hover:text-blue-800" title="Attention --> Suppression">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </TableCell>
                    )}
                  </TableRow>
                ))
              ) : <TableRow><TableCell colSpan={7}>Aucune vente trouvée.</TableCell></TableRow>}
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
                  {selectedSale.customer.charAt(0)}
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold">Détails de la Vente</h2> 
                 
                  <p className="text-sm text-gray-500">Numéro : {selectedSale.id}</p>
                  <p className="text-sm text-gray-500">Date vente : {new Date(selectedSale.date).toLocaleDateString()}</p>
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
                {selectedSale.total.toLocaleString("fr-FR", {
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
                      <td className="px-6 py-4 text-right text-sm text-gray-900">{(item.unit_price * (selectedOrderInfo?.exchange_rate ?? 1)).toLocaleString("fr-FR")} $</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Dialog */}
      <Dialog open={!!selectedOrderId} onOpenChange={() => { setSelectedOrderId(null); setSelectedOrderInfo(null); }}>
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
                  price: item.unit_price * (selectedOrderInfo.exchange_rate ?? 1)
                }))}
                total={selectedOrderInfo.total * (selectedOrderInfo.exchange_rate ?? 1)}
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


      {editModalOpen && editOrder && (
  <div className="max-h-[80vh] bg-black bg-opacity-50 flex items-center justify-center overflow-y-auto p-4 z-50">
    <div className="bg-white rounded-lg w-full max-w-3xl p-6 shadow-lg">

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Modifier la vente {editOrder.id}</h2>
        <button
          onClick={() => { setEditModalOpen(false); }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={22} />
        </button>
      </div>

      {/* Client & Paiement */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm text-gray-600">Client</label>
          <Input
            value={editOrder.customer}
            onChange={(e) => setEditOrder({ ...editOrder, customer: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Méthode de paiement</label>
          <select
            className="border rounded-md p-2 w-full"
            value={editOrder.paymentMethod}
            onChange={(e) => setEditOrder({ ...editOrder, paymentMethod: e.target.value })}
          >
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="credit">Crédit</option>
          </select>
        </div>
      </div>

      {/* Ligne Articles */}
      <h3 className="font-semibold mb-2">Articles vendus</h3>

      <div className="max-h-96 overflow-y-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Produit</th>
              <th className="p-3 text-center">Qté</th>
              <th className="p-3 text-right">Prix ($)</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3"></th>
            </tr>
          </thead>

          <tbody>
            {editItems.map((item, index) => (
              <tr key={item.id} className="border-b">
                <td className="p-3">
                  <select
                    className="p-2 border rounded-md w-full"
                    value={item.product_id}
                    onChange={(e) => {
                      const prod = productsList.find(p => p.id == e.target.value);
                      const newItems = [...editItems];
                      newItems[index].product_id = prod.id;
                      newItems[index].unit_price = prod.selling_price;
                      newItems[index].products = { name: prod.name };
                      setEditItems(newItems);
                    }}
                  >
                    {productsList.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </td>

                <td className="p-3 text-center">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...editItems];
                      newItems[index].quantity = parseInt(e.target.value || "0");
                      setEditItems(newItems);
                    }}
                  />
                </td>

                <td className="p-3 text-right">
                  <Input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => {
                      const newItems = [...editItems];
                      newItems[index].unit_price = parseFloat(e.target.value || "0");
                      setEditItems(newItems);
                    }}
                  />
                </td>

                <td className="p-3 text-right font-semibold">
                  {(item.unit_price * item.quantity).toLocaleString("fr-FR")}
                </td>

                <td className="p-3 text-right">
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => {
                      setEditItems(prev => prev.filter((_, i) => i !== index));
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ajouter un article */}
      <div className="mt-4">
        <button
          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          onClick={() => {
            if (productsList.length === 0) return;
            setEditItems(prev => [
              ...prev,
              {
                id: null,
                product_id: productsList[0].id,
                quantity: 1,
                unit_price: productsList[0].selling_price,
                products: { name: productsList[0].name }
              }
            ]);
          }}
        >
          + Ajouter un article
        </button>
      </div>

      {/* Total */}
      <div className="text-right mt-6 text-lg font-bold">
        Total :{" "}
        {editItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
          .toLocaleString("fr-FR")}{" "}
        $
      </div>

      {/* Buttons */}
      <div className="flex justify-end mt-6 gap-2">
        <button
          onClick={() => setEditModalOpen(false)}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
        >
          Annuler
        </button>

        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          onClick={async () => {

            const newTotal = editItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

            // 1) Update sale
            await supabase
              .from("sales")
              .update({
                total_amount: newTotal,
                payment_method: editOrder.paymentMethod
              })
              .eq("id", editOrder.rawId);

            // 2) Update sale_items
            for (const item of editItems) {
              if (item.id) {
                await supabase
                  .from("sale_items")
                  .update({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price
                  })
                  .eq("id", item.id);
              } else {
                await supabase
                  .from("sale_items")
                  .insert({
                    sale_id: editOrder.rawId,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price
                  });
              }
            }

            // 3) Mise à jour instantanée tableau Orders
            setOrders(prev =>
              prev.map(o =>
                o.rawId === editOrder.rawId
                  ? { ...o, total: newTotal, paymentMethod: editOrder.paymentMethod }
                  : o
              )
            );

            setEditModalOpen(false);
          }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
