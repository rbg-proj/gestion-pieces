import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Smartphone, 
  Banknote,
  AlertCircle, CheckCircle, AlertTriangle
} from 'lucide-react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Receipt from "@/pages/Receipt";
import { useAuth } from '../contexts/AuthContext'; // Added import for useAuth
import { initOfflineDB } from "@/lib/offlineDB";


// Fonction utilitaire (hors composant)
function generateInvoiceNumber(id: string | number, prefix = 'Fac') {
  if (!id) return ''; // Ou null selon mon cas
  return `${prefix}-${String(new Date().getFullYear()).slice(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(id).slice(0, 6).toUpperCase()}`;
}

interface Product {
  id: string;
  name: string;
  selling_price: number; // enregistré en USD
  stock: number;
  barcode: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number; // stocké en CDF pour UI et converti au USD lors de l'enregistrement
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
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  });
  const [saleCompleted, setSaleCompleted] = useState(false);
  const [printedCart, setPrintedCart] = useState<CartItem[]>([]);
  const [printedTotal, setPrintedTotal] = useState(0);
  const [printedCustomerName, setPrintedCustomerName] = useState<string | null>(null);
  const [printedPaymentMethod, setPrintedPaymentMethod] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const { user } = useAuth();
  const [isCustomerConfirmed, setIsCustomerConfirmed] = useState(false);
  const [customerNotFound, setCustomerNotFound] = useState(false);

  // Pagination
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

// Exchange rate state (CDF per 1 USD). Will be fetched from DB (exchange_rates).
  const [exchangeRate, setExchangeRate] = useState<number>(0);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm)
  );
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );  
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  // Fin Pagination

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
    
  useEffect(() => {
    fetchExchangeRate();
    fetchProducts();
  }, []);

  // Fetch the latest exchange rate from exchange_rates table
  const fetchExchangeRate = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && (error as any).code !== 'PGRST116') {
        console.warn('Erreur en récupérant le taux de change :', error.message || error);
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
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;

      setProducts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue...');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setSaleCompleted(false);
    setShowReceiptModal(false);

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      // Price shown/stored in cart is in CDF (product.selling_price assumed in USD)
      
      const priceInCDF = Number((product.selling_price ?? 0) * (exchangeRate ?? 0));


      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { 
        id: product.id, 
        name: product.name, 
        price: priceInCDF, 
        quantity: 1 
      }];
    });
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === id) {
          const product = products.find(p => p.id === id);
          const maxQty = product ? product.stock : item.quantity;
          const newQty = Math.min(maxQty, item.quantity + change);
          return { ...item, quantity: Math.max(0, newQty) };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const getDisplayedStock = (product: Product) => {
    const cartItem = cart.find(item => item.id === product.id);
    return product.stock - (cartItem?.quantity || 0);
  };

  
  {/*New CustumerLookUp*/}
  const handleCustomerLookup = async () => {
    if (!customerPhone) return;
    setSaleCompleted(false);
    setShowReceiptModal(false);
    setIsCustomerConfirmed(true);

    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, full_name')
      .eq('phone', customerPhone)
      .single();

    if (error && (error as any).code !== 'PGRST116') {
      setError(error.message);
      return;
    }

    if (customer) {
      setSelectedCustomerId(customer.id);
      setCustomerName(customer.full_name ?? null);
      toast.success(`Client trouvé : ${customer.full_name ?? customerPhone}`);
    } else {
      // Aucun client trouvé → on associe le client standard (id = 0)
      setSelectedCustomerId("0");
      setCustomerName("Standard");
      toast(`Aucun client trouvé. Utilisation du client standard`, {
        icon: '⚠️',
      });
    }
  };

  
    {/*Fin LookUp*/}
    
  const handleCompleteSale = async () => {
    setSaleCompleted(false); // cacher l'ancien reçu
    
    try {
      if (cart.length === 0 || !selectedPayment) return;

      // Re-fetch latest rate to ensure we use the most recent rate at moment of sale
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
        // fallback to local state rate
      }

      if (!rate || rate <= 0) {
        throw new Error('Taux de change invalide');
      }

      // total in CDF (cart prices are in CDF)
      const totalCDF = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalUSD = totalCDF / rate;

      // Start a transaction by inserting the sale first
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          total_amount: totalUSD,
          payment_method: selectedPayment,
          customer_id: selectedCustomerId, // peut être null
          exchange_rate: rate,
        }])
        .select()
        .single();
      
      
      if (saleError) throw saleError;
     

      // Insert sale items (unit_price stored in USD)
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price / rate, // convert from CDF -> USD
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      const invoiceNumber = generateInvoiceNumber(saleData.id);
      setSelectedSaleId(saleData.id);
      
      if (itemsError) throw itemsError;

      // Update product stock levels
      for (const item of cart) {
        // Get current stock level
        const { data: productData, error: fetchError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single();

        if (fetchError) throw fetchError;

        if (!productData) {
          throw new Error(`Product ${item.id} not found`);
        }

        const newStock = productData.stock - item.quantity;

        // Update stock level
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.id)
          .select();

        if (updateError) {
          throw new Error(`Failed to update stock for product ${item.id}: ${updateError.message}`);
        }
      }

      // Clear cart and refresh products
      setPrintedCart([...cart]); // sauvegarde du panier (en CDF)
      setPrintedTotal(totalCDF); // sauvegarde du total en CDF pour l'affichage du reçu
      setPrintedCustomerName(customerName);
      setPrintedPaymentMethod(selectedPayment);
      setShowReceiptModal(true);
      setSaleCompleted(true); // déclenche l'affichage du reçu
      setCart([]);
      setSelectedPayment('');
      await fetchProducts();
      setCustomerPhone('');
      setSelectedCustomerId(null);
      setCustomerName(null); // ✅ reset du nom
      toast.success('Vente complétée avec succès ✅');
     

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete sale');
    }
  };
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.0;
  const total = subtotal + tax;

  return (
    <div className="h-screen flex flex-col md:flex-row gap-6 p-4 bg-gray-50">
      {/* Products Section */}
      <div className="md:w-2/3 bg-white rounded-lg shadow-sm p-4">


        {typeof exchangeRate === 'number' && exchangeRate > 0 && (
    <div className="mb-3 p-2 bg-blue-100 border border-blue-300 rounded text-blue-800 text-sm font-medium flex items-center justify-between">
      <span>
        💱 Taux du jour : <span className="font-bold">{exchangeRate}</span> CDF pour 1 USD
      </span>

      <button
        type="button"
        onClick={fetchLatestRate} // doit être défini (voir ci-dessous)
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

       

        {/*Grille affichage des produits*/}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
  {paginatedProducts.map(product => (
    <button
      key={product.id}
      onClick={() => addToCart(product)}
      className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 transition-colors duration-200 text-left bg-white shadow-sm"
      disabled={getDisplayedStock(product) <= 0}
    >
      
      <h6
        className="
          font-medium text-gray-900 
          text-sm sm:text-base
          line-clamp-2
          min-h-[2.5rem]
        "
      >
        {product.name}
      </h6>

      <p className="text-lg font-bold text-primary-600">
        {/* display price in CDF for UI */}
        {Number((product.selling_price ?? 0) * (exchangeRate ?? 0)).toFixed(0)} CDF

      </p>

      <p
        className={`text-sm font-medium flex items-center gap-1 ${
          getDisplayedStock(product) === 0
            ? 'text-red-600'
            : getDisplayedStock(product) <= 5
            ? 'text-orange-500'
            : 'text-black'
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
        
        {/*Fin grille Produits*/}
        
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

          <div className="flex-1 overflow-y-auto mb-4">
          
            {cart.map(item => (
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
                    setCart(prevCart =>
                      prevCart.map(i =>
                        i.id === item.id ? { ...i, price: newPrice } : i
                      )
                    );
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
                        updateQuantity(item.id, newQuantity - item.quantity); // calcul de la différence
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
            <span>Subtotal</span>
            <span>{Number(subtotal ?? 0).toFixed(0)} Fc</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax (0%)</span>
            <span>{Number(tax ?? 0).toFixed(0)} Fc</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{Number(total ?? 0).toFixed(0)} Fc</span>
          </div>
        </div>


      {/* Fin Section Panier */}

      {/* Bas de la Section Panier */}
        <div className="mt-4 space-y-2">
        <h3 className="font-medium mb-2">Phone Client (0 pour Client Standard)</h3>
        <div className="flex items-center gap-2">
          <input
            type="tel"
            placeholder="Entrer le téléphone client"
            className="flex-1 px-3 py-2 border rounded-md"
            value={customerPhone}
            onChange={(e) => {
            setCustomerPhone(e.target.value);
            setIsCustomerConfirmed(false); // Réinitialise la confirmation client
          }}
            required
          />
          
          <button
            onClick={handleCustomerLookup}
            className={`px-4 py-2 text-white rounded-md ${
        customerPhone.trim() === ''
          ? 'bg-gray-300 cursor-not-allowed'
          : 'bg-primary-500 hover:bg-primary-600'
      }`}
      disabled={customerPhone.trim() === ''}  
          >
            Trouver client
          </button>
        </div>
          
        {isCustomerConfirmed && (
            <p className="text-sm text-green-600">
            Client trouvé ✅ {customerName && `: ${customerName}`}
          </p>
            
        )}

          {customerNotFound && (
            <p className="text-sm text-red-600">
              ❌ Aucun client trouvé avec ce numéro.
            </p>
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
  className="mt-4 w-full py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
  disabled={cart.length === 0 || !selectedPayment || !isCustomerConfirmed}
  data-tip={
    cart.length === 0 || !selectedPayment || !isCustomerConfirmed
      ? 'Veuillez ajouter au moins 1 article au panier, Trouver le client et/ou Sélectionner le mode de paiement'
      : ''
  }
>
  Valider
</button>

<ReactTooltip place="top" effect="solid" />

        
      </div>
   
   
  {showReceiptModal && (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <Receipt
          ref={receiptRef}
          cart={printedCart}
          total={printedTotal}
          customerName={printedCustomerName}
          paymentMethod={printedPaymentMethod}
          date={new Date().toLocaleString()}
          invoiceNumber={generateInvoiceNumber(selectedSaleId)}
          userName={user?.name || ''}
          
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setShowReceiptModal(false)}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Fermer
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
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
