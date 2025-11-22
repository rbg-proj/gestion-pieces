import React, { useState, useEffect } from 'react';
import {
  Search, PlusCircle, Edit, Trash, AlertTriangle, Loader2, X, Package
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// -------------------------
// TYPES
// -------------------------
interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  barcode: string;
  purchase_price: number;
  selling_price: number;
  stock: number;
  image_url?: string;
  category_id: string;
  category?: Category;
}

// -------------------------
// COMPONENT
// -------------------------
const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // filtres stock
  const [minStock, setMinStock] = useState<number | ''>('');
  const [maxStock, setMaxStock] = useState<number | ''>('');

  const initialFormState = {
    name: '',
    barcode: '',
    purchase_price: 0,
    selling_price: 0,
    stock: 0,
    image_url: '',
    category_id: '',
  };
  const [formData, setFormData] = useState(initialFormState);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // -------------------------
  // LOAD DATA
  // -------------------------
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) {
      console.error('Erreur chargement catégories', error);
      setError('Erreur lors du chargement des catégories');
    } else {
      setCategories(data || []);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories (id, name)')
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // FORM SUBMIT
  // -------------------------
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSend = {
        name: formData.name,
        barcode: formData.barcode,
        purchase_price: Number(formData.purchase_price),
        selling_price: Number(formData.selling_price),
        stock: Number(formData.stock),
        image_url: formData.image_url || null,
        category_id: formData.category_id,
      };

      let response;
      if (editingProduct) {
        const oldStock = editingProduct.stock;
        const newStock = formData.stock;

        if (oldStock !== newStock) {
          await supabase.from('stock_history').insert([{
            product_id: editingProduct.id,
            old_stock: oldStock,
            new_stock: newStock,
            change: newStock - oldStock,
            reason: 'Mise à jour manuelle',
          }]);
        }
        response = await supabase
          .from('products')
          .update(dataToSend)
          .eq('id', editingProduct.id);
      } else {
        // // Vérification nom existant
          const { data: existing, error: checkError } = await supabase
            .from('products')
            .select('id')
            .eq('name', formData.name.trim());
        
          if (checkError) {
            setToastMessage("Erreur lors de la vérification du nom");
            setIsFormOpen(false);
            setTimeout(() => setToastMessage(null), 3000);
            return;
          }
        
          if (existing && existing.length > 0) {
            setToastMessage("Un produit portant ce nom existe déjà !");
            //setIsFormOpen(false);
            setTimeout(() => setToastMessage(null), 4000);
            return;
          }

      // 🔵 Si tout est bon, on peut insérer
        response = await supabase.from('products').insert([dataToSend]);
        if (response.data && response.data[0]) {
          const newProduct = response.data[0];
          await supabase.from('stock_history').insert([{
            product_id: newProduct.id,
            old_stock: 0,
            new_stock: newProduct.stock,
            change: newProduct.stock,
            reason: 'Ajout initial',
          }]);
        }
      }

      if ((response as any).error) throw (response as any).error;

      setIsFormOpen(false);
      setEditingProduct(null);
      setFormData(initialFormState);
      fetchProducts();

    } catch (err) {
      console.error('Error submitting:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue !');
    }
  };

  // -------------------------
  // DELETE
  // -------------------------
  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce produit ?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      fetchProducts();
    } catch (err) {
      console.error('Error deleting:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue !');
    }
  };

  // -------------------------
  // IMAGE UPLOAD
  // -------------------------
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error } = await supabase.storage.from('product-images').upload(filePath, file);
    if (error) {
      console.error('Erreur upload :', error.message);
      return;
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
    if (data?.publicUrl) {
      setFormData((prev) => ({ ...prev, image_url: data.publicUrl }));
    }
  };

  // -------------------------
  // FILTERS & PAGINATION
  // -------------------------
  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm);

    const matchesCategory =
      selectedCategory === 'all' || product.category_id === selectedCategory;

    const matchesStockMin = minStock === '' || product.stock >= minStock;
    const matchesStockMax = maxStock === '' || product.stock <= maxStock;

    return matchesSearch && matchesCategory && matchesStockMin && matchesStockMax;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [filteredProducts.length, totalPages]);

  // -------------------------
  // EXPORT EXCEL
  // -------------------------
  const exportToExcel = () => {
    import('xlsx').then((xlsx) => {
      const exportData = filteredProducts.map((p) => ({
        Nom: p.name,
        CodeBarre: p.barcode,
        Categorie: p.category?.name || '',
        PrixAchat: p.purchase_price,
        PrixVente: p.selling_price,
        Stock: p.stock,
      }));

      const worksheet = xlsx.utils.json_to_sheet(exportData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Articles');

      xlsx.writeFile(workbook, 'RBG Liste articles.xlsx');
    });
  };

  // -------------------------
  // EXPORT PDF
  // -------------------------
  const exportToPDF = () => {
    const jsPDF = require('jspdf');
    require('jspdf-autotable');

    const doc = new jsPDF();

    const tableColumn = ['Nom', 'Catégorie', 'Prix Achat', 'Prix Vente', 'Stock'];
    const tableRows: any[] = [];

    filteredProducts.forEach((p) => {
      tableRows.push([
        p.name,
        p.category?.name || '',
        p.purchase_price,
        p.selling_price,
        p.stock,
      ]);
    });

    doc.text('RBG Liste des Articles', 14, 15);
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save('articles.pdf');
  };

  // -------------------------
  // PRICE FORMAT
  // -------------------------
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(price);

  const startDisplay = filteredProducts.length === 0 ? 0 : indexOfFirstItem + 1;
  const endDisplay = Math.min(indexOfLastItem, filteredProducts.length);

  // -------------------------
  // RENDER
  // -------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

return (
    <div className="space-y-6">

      {/* Toast d'affichage message */}
      {toastMessage && (
      <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999]">
    <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-xl text-lg animate-fade">
        {toastMessage}
          </div>
          </div>
              )}


      {/* HEADER + EXPORT BUTTONS */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tous nos Articles</h1>

        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Export Excel
          </button>

          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Export PDF
          </button>

          <button
            onClick={() => {
              setIsFormOpen(true);
              setEditingProduct(null);
              setFormData(initialFormState);
            }}
            className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
          >
            <PlusCircle size={16} className="mr-2" /> Créer un Article
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>
      )}

      {/* FILTERS */}
      <div className="flex gap-4 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Recherche par nom ou barcode"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="flex-1 min-w-[200px] border rounded-md px-3 py-2"
        />

        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentPage(1);
          }}
          className="border rounded-md px-3 py-2"
        >
          <option value="all">Toutes</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Tri Stock min"
          value={minStock}
          onChange={(e) => {
            const val = e.target.value;
            setMinStock(val === '' ? '' : Number(val));
            setCurrentPage(1);
          }}
          className="w-32 border rounded-md px-2 py-2"
        />

        <input
          type="number"
          placeholder="Tri Stock max"
          value={maxStock}
          onChange={(e) => {
            const val = e.target.value;
            setMaxStock(val === '' ? '' : Number(val));
            setCurrentPage(1);
          }}
          className="w-32 border rounded-md px-2 py-2"
        />

        <button
          onClick={() => {
            setMinStock('');
            setMaxStock('');
            setCurrentPage(1);
          }}
          className="border rounded-md px-3 py-2 bg-gray-100"
        >
          Réinitialiser Stock
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Nom</th>
              <th className="px-4 py-2 text-left">Catégorie</th>
              <th className="px-4 py-2 text-right">Prix Achat</th>
              <th className="px-4 py-2 text-right">Prix Vente</th>
              <th className="px-4 py-2 text-right">Stock</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.map((product) => (
              <tr key={product.id} className="border-b">
                <td className="px-4 py-2 flex items-center gap-2">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 flex justify-center items-center rounded">
                      <Package size={20} className="text-gray-400" />
                    </div>
                  )}
                  {product.name}
                </td>
                <td className="px-4 py-2">{product.category?.name}</td>
                <td className="px-4 py-2 text-right">{formatPrice(product.purchase_price)}</td>
                <td className="px-4 py-2 text-right">{formatPrice(product.selling_price)}</td>
                <td className="px-4 py-2 text-right">
                  {product.stock < 10 && <AlertTriangle size={16} className="text-red-500 inline mr-1" />}
                  {product.stock}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    className="text-blue-500 hover:underline mr-2"
                    onClick={() => {
                      setEditingProduct(product);
                      setFormData({
                        name: product.name,
                        barcode: product.barcode,
                        purchase_price: product.purchase_price,
                        selling_price: product.selling_price,
                        stock: product.stock,
                        image_url: product.image_url || '',
                        category_id: product.category_id,
                      });
                      setIsFormOpen(true);
                    }}
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    className="text-red-500 hover:underline"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}

            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-500">
                  Aucun article trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="text-sm text-gray-600 mt-2">
        Affichage de Produits {startDisplay} à {endDisplay} sur {filteredProducts.length} Produits
      </div>

      {/* PAGINATION */}
      {filteredProducts.length > itemsPerPage && (
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Précédent
          </button>

          <span className="font-medium">
            Page {currentPage} / {totalPages}
          </span>

          <button
            onClick={() =>
              setCurrentPage(currentPage < totalPages ? currentPage + 1 : currentPage)
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}

      {/* FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">

            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-2 right-2 text-gray-500"
            >
              <X size={24} />
            </button>

            <h2 className="text-xl font-semibold mb-4">
              {editingProduct ? 'Modifier l’article' : 'Nouvel article'}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-4">

              <div>
                <label>Nom</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full border px-3 py-2 rounded"
                />
              </div>

              <div>
                <label>Barcode</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full border px-3 py-2 rounded"
                />
              </div>

              <div>
                <label>Catégorie</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                  className="w-full border px-3 py-2 rounded"
                >
                  <option value="">Sélectionnez</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label>Prix d’achat</label>
                  <input
                    type="number"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                    className="w-full border px-3 py-2 rounded"
                  />
                </div>

                <div className="flex-1">
                  <label>Prix de vente</label>
                  <input
                    type="number"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                    className="w-full border px-3 py-2 rounded"
                  />
                </div>
              </div>

              <div>
                <label>Stock</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="w-full border px-3 py-2 rounded"
                />
              </div>

              <div>
                <label>Image (optionnel)</label>
                <input type="file" onChange={handleImageUpload} />
                {formData.image_url && (
                  <img src={formData.image_url} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded" />
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-primary-500 text-white py-2 rounded"
              >
                {editingProduct ? 'Mettre à jour' : 'Ajouter'}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;
