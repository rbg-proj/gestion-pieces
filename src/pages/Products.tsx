import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  PlusCircle,
  Edit,
  Trash,
  AlertTriangle,
  Loader2,
  X,
  Package,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* =======================
   TYPES
======================= */
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

/* =======================
   COMPONENT
======================= */
const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  /* =======================
     FORM STATE
  ======================= */
  const initialFormState = {
    name: "",
    barcode: "",
    purchase_price: 0,
    selling_price: 0,
    image_url: "",
    category_id: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  /* =======================
     PAGINATION
  ======================= */
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /* =======================
     LOAD DATA
  ======================= */
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(id, name)")
      .order("name");

    if (error) {
      setError("Erreur lors du chargement des produits");
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    setCategories(data || []);
  };

  /* =======================
     CREATE / UPDATE
  ======================= */
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        name: formData.name.trim(),
        barcode: formData.barcode,
        purchase_price: Number(formData.purchase_price),
        selling_price: Number(formData.selling_price),
        image_url: formData.image_url || null,
        category_id: formData.category_id,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);

        if (error) throw error;

        toast.success("Article mis à jour");
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        toast.success("Article créé");

        // Stock initial = 0 ➜ aucun mouvement nécessaire
      }

      setIsFormOpen(false);
      setEditingProduct(null);
      setFormData(initialFormState);
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  /* =======================
     DELETE
  ======================= */
  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet article ?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast.error("Impossible de supprimer");
    } else {
      toast.success("Article supprimé");
      fetchProducts();
    }
  };

  /* =======================
     FILTERS
  ======================= */
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm);

    const matchCategory =
      selectedCategory === "all" || p.category_id === selectedCategory;

    return matchSearch && matchCategory;
  });

  const indexOfLast = currentPage * itemsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfLast - itemsPerPage,
    indexOfLast
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / itemsPerPage)
  );

  /* =======================
     RENDER
  ======================= */
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Articles</h1>

        <button
          onClick={() => {
            setIsFormOpen(true);
            setEditingProduct(null);
            setFormData(initialFormState);
          }}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded"
        >
          <PlusCircle size={18} />
          Nouvel article
        </button>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          placeholder="Recherche..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded px-3 py-2"
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Nom</th>
              <th className="p-2">Catégorie</th>
              <th className="p-2 text-right">Achat</th>
              <th className="p-2 text-right">Vente</th>
              <th className="p-2 text-right">Stock</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {currentProducts.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2 flex items-center gap-2">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-gray-400" />
                  )}
                  {p.name}
                </td>
                <td className="p-2">{p.category?.name}</td>
                <td className="p-2 text-right">
                  ${p.purchase_price.toFixed(2)}
                </td>
                <td className="p-2 text-right">
                  ${p.selling_price.toFixed(2)}
                </td>
                <td className="p-2 text-right">
                  {p.stock < 10 && (
                    <AlertTriangle className="inline w-4 h-4 text-red-500 mr-1" />
                  )}
                  {p.stock}
                </td>
                <td className="p-2 text-right space-x-2">
                  <button
                    onClick={() => {
                      setEditingProduct(p);
                      setFormData({
                        name: p.name,
                        barcode: p.barcode,
                        purchase_price: p.purchase_price,
                        selling_price: p.selling_price,
                        image_url: p.image_url || "",
                        category_id: p.category_id,
                      });
                      setIsFormOpen(true);
                    }}
                    className="text-blue-600"
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-600"
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}

            {currentProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Aucun article
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded p-6 relative">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-3 right-3"
            >
              <X />
            </button>

            <h2 className="text-lg font-semibold mb-4">
              {editingProduct ? "Modifier" : "Nouvel article"}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <input
                ref={nameInputRef}
                required
                placeholder="Nom"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              />

              <input
                placeholder="Code-barres"
                value={formData.barcode}
                onChange={(e) =>
                  setFormData({ ...formData, barcode: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              />

              <select
                required
                value={formData.category_id}
                onChange={(e) =>
                  setFormData({ ...formData, category_id: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              >
                <option value="">Catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Prix achat"
                  value={formData.purchase_price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      purchase_price: Number(e.target.value),
                    })
                  }
                  className="border px-3 py-2 rounded"
                />

                <input
                  type="number"
                  placeholder="Prix vente"
                  value={formData.selling_price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      selling_price: Number(e.target.value),
                    })
                  }
                  className="border px-3 py-2 rounded"
                />
              </div>

              {/* 🔒 STOCK NON MODIFIABLE */}
              {editingProduct && (
                <div className="bg-gray-100 px-3 py-2 rounded text-sm text-gray-700">
                  Stock actuel : <strong>{editingProduct.stock}</strong>
                  <br />
                  <span className="text-xs text-gray-500">
                    Pour modifier le stock, aller sur "Mouvement Stock" dans le menu lateral
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2 rounded"
              >
                Enregistrer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
