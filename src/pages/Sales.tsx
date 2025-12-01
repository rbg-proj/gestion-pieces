import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Smartphone,
  Banknote,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import Receipt from '@/pages/Receipt';
import { useAuth } from "@/hooks/useAuth";
import { initOfflineDB } from '@/lib/offlineDB';

// Génère un n° facture lisible
function generateInvoiceNumber(id: string | number | null, prefix = 'Fac') {
  if (!id) return '';
  return `${prefix}-${String(new Date().getFullYear()).slice(2)}${String(
    new Date().getMonth() + 1
  ).padStart(2, '0')}-${String(id).slice(0, 6).toUpperCase()}`;
}

interface Product {
  id: string;
  name: string;
  selling_price: number; // stocké en USD dans la base
  stock: number;
  barcode: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number; // en CDF pour l'UI (unit price affiché)
  quantity: number;
}

const Sales: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState('0');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  });

  const [saleCompleted, setSaleCompleted] = useState(false);
  const [printedCart, setPrintedCart] = useState<CartItem[]>([]);
  const [printedTotal, setPrintedTotal] = useState<number>(0); // en CDF
  const [printedCustomerName, setPrintedCustomerName] = useState<string | null>(null);
  const [printedPaymentMethod, setPrintedPaymentMethod] = useState<string>('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const { user } = useAuth();
  const [isCustomerConfirmed, setIsCustomerConfirmed] = useState(false);
  const [customerNotFound, setCustomerNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Exchange rate (CDF per 1 USD). Récupéré depuis exchange_rates.
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  // printedRate : taux utilisé pour l'impression de la vente courante (garantit que le reçu affiche le bon taux même si le taux change plus tard)
  const [printedRate, setPrintedRate] = useState<number | null>(null);

  // --- Filtrage / pagination produits
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm)
  );

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchExchangeRate();
    fetchProducts();
  }, []);

  // Récupère le dernier taux (méthode publique)
  const fetchLatestRate = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération du taux:', error);
        return;
      }

      if (data && data.rate) {
        setExchangeRate(Number(data.rate));
      }
    } catch (err) {
      console.error('fetchLatestRate error', err);
    }
  };

  // Même fonction mais renvoyant uniquement rate et gérant erreurs silencieuses
  const fetchExchangeRate = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && (error as any).code !== 'PGRST116') {
        console.warn('Erreur en récupérant le taux de change :', (error as any).message || error);
        return;
      }

      if (data && data.rate) {
        setExchangeRate(Number(data.rate));
      }
    } catch (err) {
      console.warn('fetchExchangeRate error', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('products').select('*').order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue...');
    } finally {
      setLoading(false);
    }
  };

  // Ajoute un produit au panier — le prix affiché est en CDF (selling_price * rate)
  const addToCart = (product: Product) => {
    setSaleCompleted(false);
    setShowReceiptModal(false);

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      // Si le taux n'est pas chargé, on utilise 1 par défaut (évite d'ajouter 0). Mieux : charger le taux avant vente.
      const effectiveRate = exchangeRate ?? 1;
      const priceInCDF = Number((product.selling_price ?? 0) * effectiveRate);

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...prevCart,
        {
          id: product.id,
          name: product.name,
          price: priceInCDF,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (id: string, change: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            const product = products.find((p) => p.id === id);
            const maxQty = product ? product.stock : item.quantity;
            const newQty = Math.min(maxQty, item.quantity + change);
            return { ...item, quantity: Math.max(0, newQty) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const getDisplayedStock = (product: Product) => {
    const cartItem = cart.find((item) => item.id === product.id);
    return product.stock - (cartItem?.quantity || 0);
  };

  // Look up client par téléphone
  const handleCustomerLookup = async () => {
    if (!customerPhone) return;
    setSaleCompleted(false);
    setShowReceiptModal(false);
    setIsCustomerConfirmed(true);

    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, full_name')
        .eq('phone', customerPhone)
        .single();

      if (error && (error as any).code !== 'PGRST116') {
        setError((error as any).message || 'Erreur recherche client');
        return;
      }

      if (customer) {
        setSelectedCustomerId(customer.id);
        setCustomerName(customer.full_name ?? null);
        toast.success(`Client trouvé : ${customer.full_name ?? customerPhone}`);
      } else {
        // Aucun client trouvé → client standard
        setSelectedCustomerId('0');
        setCustomerName('Standard');
        setCustomerNotFound(false);
        toast('Aucun client trouvé. Utilisation du client standard', { icon: '⚠️' });
      }
    } catch (err) {
      console.error('handleCustomerLookup error', err);
      setError('Erreur recherche client');
    }
  };

  // Finalise la vente : insère sale + sale_items, met à jour stock, prépare reçu
  const handleCompleteSale = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSaleCompleted(false);
    toast.loading('Validation de la vente en cours… Veuillez patienter.', { id: 'sale-progress' });

    try {
      if (cart.length === 0 || !selectedPayment) {
        // reset isSubmitting and exit early
        toast.dismiss('sale-progress');
        toast.error('Ajoutez au moins un article et sélectionnez un mode de paiement.');
        setIsSubmitting(false);
        return;
      }

      // Re-fetch latest rate to ensure accuracy at time of sale
      let rate = exchangeRate;
      try {
        const { data } = await supabase
          .from('exchange_rates')
          .select('rate')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (data && data.rate) rate = Number(data.rate);
      } catch (e) {
        // ignore network hiccups here, we'll check rate validity below
      }

      if (!rate || rate <= 0) {
        throw new Error('Taux de change nul ou invalide. Vérifiez-le svp !');
      }

      // total en CDF (UI) -> converti en USD pour la base
      const totalCDF = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const totalUSD = totalCDF / rate;

      // Insertion dans sales
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([
          {
            total_amount: totalUSD,
            payment_method: selectedPayment,
            customer_id: selectedCustomerId,
            exchange_rate: rate,
            sale_date: new Date().toISOString(), // ✅ ajout de la date système
            user_id: user?.id, // ✅ ajout de l’agent qui a fait la vente
          },
        ])
        .select()
        .single();

      if (saleError) throw saleError;
      if (!saleData || !saleData.id) throw new Error('Impossible de créer la vente');

      // Prépare sale_items (unit_price enregistré en USD)
      const saleItemsToInsert = cart.map((item) => ({
        sale_id: saleData.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price / rate,
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsToInsert);
      if (itemsError) throw itemsError;

      // Update stock pour chaque article
      for (const item of cart) {
        const { data: productData, error: fetchError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single();

        if (fetchError) throw fetchError;
        const newStock = (productData.stock ?? 0) - item.quantity;

        const { error: updateError } = await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
        if (updateError)
          throw new Error(`Erreur mise à jour du stock pour ${item.id}: ${(updateError as any).message}`);
      }

      // Préparation du reçu : on mémorise le taux effectivement utilisé (printedRate)
      setSelectedSaleId(saleData.id);
      setPrintedCart([...cart]);
      setPrintedTotal(totalCDF); // total en CDF — Receipt attend total en FC
      setPrintedCustomerName(customerName);
      setPrintedPaymentMethod(selectedPayment);
      setPrintedRate(rate ?? null);

      // reset du panier / UI
      setCart([]);
      setSelectedPayment('');
      await fetchProducts();

      setCustomerPhone('');
      setSelectedCustomerId(null);
      setCustomerName(null);

      setSaleCompleted(true);
      setShowReceiptModal(true);

      toast.success('Vente complétée avec succès !', { id: 'sale-progress' });
    } catch (err) {
      console.error('handleCompleteSale error', err);
      toast.error('Une erreur est survenue lors de la validation.', { id: 'sale-progress' });
      setError(err instanceof Error ? err.message : 'Une erreur est survenue...');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Totaux côté UI (CDF)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.0;
  const total = subtotal + tax;

  // Pagination helpers
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };
  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 bg-gray-50 min-h-screen">
      {/* Products Section */}
      <div className="md:w-2/3 bg-white rounded-lg shadow-sm p-4">
        {typeof exchangeRate === 'number' && exchangeRate > 0 && (
          <div className="mb-3 p-2 bg-blue-100 border border-blue-300 rounded text-blue-800 text-sm font-medium flex items-center justify-between">
            <span>
              💱 Taux du jour : <span className="font-bold">{exchangeRate.toLocaleString('fr-FR')}</span> CDF pour 1
              USD
            </span>

            <button
              type="button"
              onClick={fetchLatestRate}
              className="ml-3 px-3 py-1 text-sm border rounded hover:bg-blue-50"
            >
              🔄 Rafraîchir
            </button>
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Entrez le nom de l'article ou son barcode..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Grille produits */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {paginatedProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 transition-colors duration-200 text-left bg-white shadow-sm"
              disabled={getDisplayedStock(product) <= 0}
            >
              <h6 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2 min-h-[2.5rem]">
                {product.name}
              </h6>

              <p className="text-lg font-bold text-primary-600">
                {Number((product.selling_price ?? 0) * (exchangeRate ?? 1)).toFixed(0)} Fc
              </p>

              <p
                className={`text-sm font-medium flex items-center gap-1 ${
                  getDisplayedStock(product) === 0 ? 'text-red-600' : getDisplayedStock(product) <= 5 ? 'text-orange-500' : 'text-black'
                }`}
              >
                {getDisplayedStock(product) === 0 ? (
                  <>
                    <AlertCircle size={16} />
                    Stock épuisé
                  </>
                ) : getDisplayedStock(product) <= 5 ? (
                  <>
                    <AlertTriangle size={16} />
                    Stock faible : {getDisplayedStock(product)}
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    En stock : {getDisplayedStock(product)}
                  </>
                )}
              </p>
            </button>
          ))}
        </div>

        <div className="flex justify-center items-center mt-4 space-x-4">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="text-sm font-medium">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      </div>

      {/* Section Panier */}
      <div className="md:w-1/3 bg-white rounded-lg shadow-sm p-4 flex flex-col">
        <div className="flex items-center mb-4">
          <ShoppingCart className="text-primary-500 mr-2" size={26} />
          <h2 className="text-xl font-semibold">Articles sélectionnés</h2>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 max-h-[380px]">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-2 border-b">
              <div className="flex-1">
                <h6 className="font-medium">{item.name}</h6>

                {/* Zone de saisie - prix unitaire modifiable (en CDF)*/}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Prix:</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={item.price}
                    onChange={(e) => {
                      const newPrice = parseFloat(e.target.value);
                      if (!isNaN(newPrice) && newPrice >= 0) {
                        setCart((prevCart) => prevCart.map((i) => (i.id === item.id ? { ...i, price: newPrice } : i)));
                      }
                    }}
                    className="w-28 text-center border border-gray-300 rounded px-1 py-0.5 text-sm"
                  />
                  <span>Fc</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 rounded-full hover:bg-gray-100">
                  <Minus size={16} />
                </button>

                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => {
                    const newQuantity = parseInt(e.target.value, 10);
                    if (!isNaN(newQuantity) && newQuantity > 0) {
                      updateQuantity(item.id, newQuantity - item.quantity);
                    }
                  }}
                  className="w-12 text-center border border-gray-300 rounded px-1 py-0.5 text-sm"
                />

                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 rounded-full hover:bg-gray-100">
                  <Plus size={16} />
                </button>
                <button onClick={() => removeFromCart(item.id)} className="p-1 text-error-500 rounded-full hover:bg-error-50">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Sous Total</span>
            <span>{Number(subtotal ?? 0).toFixed(0)} Fc</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>TVA (0%)</span>
            <span>{Number(tax ?? 0).toFixed(0)} Fc</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total Général</span>
            <span>{Number(total ?? 0).toFixed(0)} Fc</span>
          </div>
        </div>

        {/* Bas de la Section Panier */}
        <div className="mt-4 space-y-2">
          <h3 className="font-medium mb-2">Phone Client (0 pour Client Standard)</h3>
          <div className="flex items-center gap-2">
            <input
              type="tel"
              placeholder="Entrer le téléphone client"
              className="flex-1 px-3 py-2 border rounded-md h-[42px]"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                setIsCustomerConfirmed(false);
              }}
              required
            />

            <button
                onClick={handleCustomerLookup}
                className={`px-4 h-[42px] flex items-center justify-center text-white rounded-md 
                  ${customerPhone.trim() === '' 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-primary-500 hover:bg-primary-600'
                  }`}
                disabled={customerPhone.trim() === ''}
              >
                Retrouver
              </button>
            </div>
          
          

          {isCustomerConfirmed && (
            <p className="text-sm text-green-600">Client trouvé ✅ {customerName && `: ${customerName}`}</p>
          )}

          {customerNotFound && (
            <p className="text-sm text-red-600">❌ Aucun client trouvé avec ce numéro.</p>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="font-medium mb-2">Methode de Paiement</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedPayment('card')}
              className={`p-2 flex flex-col items-center rounded-lg border ${
                selectedPayment === 'card' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
              }`}
              disabled
            >
              <CreditCard size={20} className={selectedPayment === 'card' ? 'text-primary-500' : 'text-gray-500'} />
              <span className="text-sm mt-1">Card</span>
            </button>
            <button
              onClick={() => setSelectedPayment('cash')}
              className={`p-2 flex flex-col items-center rounded-lg border ${
                selectedPayment === 'cash' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
              }`}
            >
              <Banknote size={20} className={selectedPayment === 'cash' ? 'text-primary-500' : 'text-gray-500'} />
              <span className="text-sm mt-1">Cash</span>
            </button>
            <button
              onClick={() => setSelectedPayment('mobile')}
              className={`p-2 flex flex-col items-center rounded-lg border ${
                selectedPayment === 'mobile' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
              }`}
              disabled
            >
              <Smartphone size={20} className={selectedPayment === 'mobile' ? 'text-primary-500' : 'text-gray-500'} />
              <span className="text-sm mt-1">Mobile</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleCompleteSale}
          className={`mt-4 w-full py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            isSubmitting ? 'opacity-60 cursor-wait' : ''
          }`}
          disabled={isSubmitting || cart.length === 0 || !selectedPayment || !isCustomerConfirmed}
          data-tip={
            isSubmitting
              ? 'Validation en cours...'
              : cart.length === 0 || !selectedPayment || !isCustomerConfirmed
              ? 'Veuillez ajouter un article, trouver le client et/ou sélectionner un mode de paiement'
              : ''
          }
        >
          {isSubmitting ? '⏳ Validation...' : 'Valider'}
        </button>

        <ReactTooltip place="top" effect="solid" />
      </div>

      {/* Modal reçu / facture */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <div className="max-h-[70vh] overflow-y-auto pr-2">
            <Receipt
              ref={receiptRef}
              cart={printedCart}
              total={printedTotal} // en CDF
              customerName={printedCustomerName}
              paymentMethod={printedPaymentMethod}
              //date={new Date().toLocaleString()}
              date={new Date().toISOString()}
              invoiceNumber={generateInvoiceNumber(selectedSaleId)}
              userName={user?.name || ''}
              exchangeRate={printedRate ?? undefined}
            />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowReceiptModal(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                Fermer
              </button>
              <button onClick={handlePrint} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Imprimer la Facture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
