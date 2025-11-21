import React, { useState, useEffect } from 'react';
import {
  Search, PlusCircle, Edit, Trash, AlertTriangle, Loader2, X, Package
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      setCategories(data);
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
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

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
          await supabase.from('stock_history').insert([{ product_id: editingProduct.id, old_stock: oldStock, new_stock: newStock, change: newStock - oldStock, reason: 'Mise à jour manuelle' }]);
        }
        response = await supabase.from('products').update(dataToSend).eq('id', editingProduct.id);
      } else {
        response = await supabase.from('products').insert([dataToSend]);
        if (response.data && response.data[0]) {
          const newProduct = response.data[0];
          await supabase.from('stock_history').insert([{ product_id: newProduct.id, old_stock: 0, new_stock: newProduct.stock, change: newProduct.stock, reason: 'Ajout initial' }]);
        }
      }
      if (response.error) throw response.error;

      setIsFormOpen(false);
      setEditingProduct(null);
      setFormData(initialFormState);
      fetchProducts();
    } catch (err) {
      console.error('Error submitting product form:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue !');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce produit ?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue !');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error } = await supabase.storage.from('product-images').upload(filePath, file);
    if (error) return console.error('Erreur upload image', error.message);

    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
    if (data?.publicUrl) setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.barcode.includes(searchTerm);

    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;

    const matchesStockMin = minStock === '' || product.stock >= minStock;
    const matchesStockMax = maxStock === '' || product.stock <= maxStock;

    return matchesSearch && matchesCategory && matchesStockMin && matchesStockMax;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  if (loading) {
    return (
    <div>
      {/* Affichage compteur */}
      <div className="text-sm text-gray-600 mb-2">
        Affichage de Produits {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredProducts.length)} sur {filteredProducts.length} Produits
      </div>
    
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const formatPrice = (price: number) => new Intl.NumberFormat('fr-CD', { style: 'currency', currency: 'CDF' }).format(price);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Les Articles</h1>
        <button
          onClick={() => {
            setIsFormOpen(true);
            setEditingProduct(null);
            setFormData(initialFormState);
          }}
          className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
        >
          <PlusCircle size={16} className="mr-2" /> Nouvel Article
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>
      )}

      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Recherche par nom ou barcode"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="flex-1 border rounded-md px-3 py-2"
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
          placeholder="Stock min"
          value={minStock}
          onChange={(e) => {
