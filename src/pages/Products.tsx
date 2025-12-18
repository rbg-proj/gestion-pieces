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

  /* Filters */
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [minStock, setMinStock] = useState<number | "">("");
  const [maxStock, setMaxStock] = useState<number | "">("");

  /* Pagination */
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /* Form */
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const initialFormState = {
    name: "",
    barcode: "",
    purchase_price: 0,
    selling_price: 0,
    image_url: "",
    category_id: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  /* Category modal */
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");

  /* =======================
     LOAD DATA
  ======================= */
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*, category:categories (id, name)")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      setError("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    setCategories(data || []);
  };

  /* =======================
     FORM SUBMIT
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
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("name", payload.name);

        if (existing && existing.length > 0) {
          toast.error("Un produit avec ce nom existe déjà");
          nameInputRef.current?.focus();
          return;
        }

        const { error } = await supabase.from("products").insert([payload]);
        if (error) throw error;

        toast.success("Article ajouté");
      }

      setIsFormOpen(false);
      setEditingProduct(null);
      setFormData(initialFormState);
      fetchProducts();
    } catch (err) {
      toast.error("Erreur lors de l’enregistrement");
    }
  };

  /* =======================
     DELETE PRODUCT
  ======================= */
  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet article ?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) {
      toast.success("Article supprimé");
      fetchProducts();
    }
  };

  /* =======================
     IMAGE UPLOAD
  ======================= */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = `products/${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file);

    if (error) {
      toast.error("Erreur upload image");
      return;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    setFormData((p) => ({ ...p, image_url: data.publicUrl }));
  };

  /* =======================
     FILTERS & PAGINATION
  ======================= */
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm);

    const matchCategory =
      selectedCategory === "all" || p.category_id === selectedCategory;

    const matchMin = minStock === "" || p.stock >= minStock;
    const matchMax = maxStock === "" || p.stock <= maxStock;

    return matchSearch && matchCategory && matchMin && matchMax;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / itemsPerPage)
  );

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* =======================
     EXPORTS
  ======================= */
  const exportToExcel = async () => {
    const xlsx = await import("xlsx");
    const ws = xlsx.utils.json_to_sheet(
      filteredProducts.map((p) => ({
        Nom: p.name,
        Catégorie: p.category?.name,
        Achat: p.purchase_price,
        Vente: p.selling_price,
        Stock: p.stock,
      }))
    );
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Produits");
    xlsx.writeFile(wb, "Produits.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [["Produit", "Catégorie", "Achat", "Vente", "Stock"]],
      body: filteredProducts.map((p) => [
        p.name,
        p.category?.name,
        p.purchase_price,
        p.selling_price,
        p.stock,
      ]),
    });
    doc.save("Produits.pdf");
  };

  /* =======================
     RENDER
  ======================= */
  if (loading)
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Articles</h1>

      <div className="flex gap-3 flex-wrap">
        <button onClick={exportToExcel} className="btn btn-success">
          Export Excel
        </button>
        <button onClick={exportToPDF} className="btn btn-danger">
          Export PDF
        </button>
        <button
          onClick={() => {
            setEditingProduct(null);
            setFormData(initialFormState);
            setIsFormOpen(true);
          }}
          className="btn btn-primary"
        >
          <PlusCircle size={16} /> Nouvel article
        </button>
      </div>

      {/* TABLE */}
      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th>Nom</th>
            <th>Catégorie</th>
            <th>Achat</th>
            <th>Vente</th>
            <th>Stock</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {paginatedProducts.map((p) => (
            <tr key={p.id} className="border-t">
              <td>{p.name}</td>
              <td>{p.category?.name}</td>
              <td>{p.purchase_price}</td>
              <td>{p.selling_price}</td>
              <td>
                {p.stock < 10 && (
                  <AlertTriangle className="inline text-red-500 mr-1" />
                )}
                {p.stock}
              </td>
              <td>
                <Edit
                  className="cursor-pointer"
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
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Products;
