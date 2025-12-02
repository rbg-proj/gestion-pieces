import { useEffect, useState, useRef } from "react";
import Receipt from "@/pages/Receipt";
import {
  Search,
  ArrowUpDown,
  MoreVertical
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/hooks/useAuth";


export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortByDateAsc, setSortByDateAsc] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#a0522d", "#d2691e", "#4682b4", "#9acd32", "#dc143c", "#20b2aa"];
  const { user } = useAuth();
  
  

  const todayLocal = new Date();
  todayLocal.setHours(0, 0, 0, 0);

  // → format YYYY-MM-DD en LOCAL
  const todayISO = todayLocal.toLocaleDateString("fr-CA");
  


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
          customers ( full_name ),
          sale_items ( id ),
          exchange_rate,
          profiles:user_id ( name )
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
          exchange_rate: sale.exchange_rate ?? 1,   // Récupération du Taux de change
          agent: sale.profiles?.name || "Non trouvé",
          status:
          sale.payment_method === "cash" || sale.payment_method === "mobile_money"
              ? "Payé"
              : "A checker",
        }));

        setOrders(formattedOrders);
      }
      setLoading(false);
    };

    fetchOrders();
  }, []);

  const fetchSaleItems = async (orderId: number) => {
    try {
      const { data, error } = await supabase
        .from("sale_items")
        .select(`id, quantity, unit_price, products ( name )`)
        .eq("sale_id", orderId);

      if (error) {
        console.error("Erreur lors du chargement des articles :", error.message);
      } else {
        setSaleItems(data);
      }
    } catch (err) {
      console.error("Erreur inattendue lors du chargement des articles", err);
    }
  };

  const [selectedOrderInfo, setSelectedOrderInfo] = useState<{
    customerName: string;
    paymentMethod: string;
    date: string;
    total: number;
    exchange_rate: number;
    agent: string; 
  } | null>(null);


  
  const filteredOrders = orders
  .filter((order) => {

   
    const orderDateString = order.date.toLocaleDateString("fr-CA");


    // 🚫 ROLE EMPLOYEE : voir uniquement les ventes du jour
    if (user?.role !== "admin" && user?.role !== "manager") {
      return orderDateString === todayISO;
    }

    // ✅ POUR ADMIN + MANAGER → filtres normaux
    const orderDate = new Date(order.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    const inDateRange =
      (!start || orderDate >= start) &&
      (!end || orderDate <= end);

    const customer = order.customer.toLowerCase();
    const matchesClient = customer.includes(clientFilter.toLowerCase());

    const orderId = order.id.toLowerCase();
    const searchTerm = search.toLowerCase();
    const matchesSearch =
      customer.includes(searchTerm) ||
      orderId.includes(searchTerm);

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

  const ventesData = Object.entries(ventesParClient).map(([client, total]) => ({
    client,
    total,
  }));
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Rapport des ventes</h1>
        
      </div>

      <div className="flex flex-wrap gap-4">
        <span className="flex items-center gap-2">Vente Du</span>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-40"
          placeholder="Date de début"
          disabled={user?.role !== "admin" && user?.role !== "manager"}
        />
        <span className="flex items-center gap-2">Au</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-40"
          placeholder="Date de fin"
          disabled={user?.role !== "admin" && user?.role !== "manager"}
        />
        <Input
          placeholder="Filtrer par client"
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="h-64">
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={ventesData.slice(0, 5)}
        dataKey="total"
        nameKey="client"
        cx="30%"
        cy="50%"
        outerRadius={80}
        fill="#8884d8"
        label={({ name }) => name}
      >
        {ventesData.slice(0, 5).map((_, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
    </PieChart>
  </ResponsiveContainer>
  {ventesData.length > 5 && (
    <p className="text-xs text-gray-500 mt-1">Affichage des 5 premiers clients seulement</p>
  )}
         
</div>

<div>
<div className="space-y-2">
        <p className="text-sm font-medium">Nombre Total de ventes : {filteredOrders.length}</p>
        <p className="text-sm font-medium">
          Montant Total des ventes : {totalVente.toLocaleString("fr-FR")} $
        </p>
     </div>
    </div>

<Card>
  <CardContent className="p-4">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            className="cursor-pointer select-none"
            onClick={() => setSortByDateAsc(!sortByDateAsc)}
          >
            Date <ArrowUpDown className="inline ml-1 h-4 w-4" />
          </TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Total vente</TableHead>
          <TableHead>Nb Articles</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Mode Paiement</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6}>Chargement des ventes ...</TableCell>
          </TableRow>
        ) : currentOrders.length > 0 ? (
          currentOrders.map((order) => (
            <TableRow
              key={order.rawId}
              onClick={() => {
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
              }}
              className={`cursor-pointer hover:bg-muted/50 ${
                selectedOrderId === order.rawId ? "bg-muted/70" : ""
              }`}
            >
              <TableCell>{order.date.toLocaleDateString()} </TableCell>
              <TableCell>{order.customer}</TableCell>
              <TableCell>{order.total.toLocaleString("fr-FR")} $</TableCell>
              <TableCell>{order.items}</TableCell>
              <TableCell>
                <Badge variant={order.status === "Payé" ? "success" : "secondary"}>
                  {order.status}
                </Badge>
              </TableCell>
              <TableCell>{order.paymentMethod}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6}>Aucune vente trouvée.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>

    {totalPages > 1 && (
      <div className="flex justify-between items-center mt-4">
        <button
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Précédent
        </button>
        <span className="text-sm text-gray-700">
          Page {currentPage} / {totalPages}
        </span>
        <button
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Suivant
        </button>
      </div>
    )}

{filteredOrders.length > 0 && (
  <div className="text-sm text-gray-600 mt-2">
    Affichage de Ventes{" "}
    {indexOfFirstRow + 1} à{" "}
    {Math.min(indexOfLastRow, filteredOrders.length)} sur{" "}
    {filteredOrders.length} Ventes totales
  </div>
)}
  </CardContent>
</Card>

      <Dialog open={!!selectedOrderId} onOpenChange={() => {
        setSelectedOrderId(null);
        setSelectedOrderInfo(null);
      }}>
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
              
                total={selectedOrderInfo.total * (selectedOrderInfo.exchange_rate ?? 1)}   //  conversion du total
                customerName={selectedOrderInfo.customerName}
                paymentMethod={selectedOrderInfo.paymentMethod}
                date={selectedOrderInfo.date}

              //  userName={user?.name || ''}
                userName={selectedOrderInfo.agent}
              //  userName={sale.profiles.full_name}     // ⬅️ L’agent correct !
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
    </div>
  );
}