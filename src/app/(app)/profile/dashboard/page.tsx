"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Heart,
  Bookmark,
  TrendingUp,
  Map,
  Package,
  Check,
  X,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import ProductEditorModal from "@/components/profile/product-editor-modal";
import type { Product, ProductImage } from "@/types";
import styles from "./dashboard.module.css";

interface AnalyticsData {
  profile_views: number;
  post_views: number;
  appreciates: number;
  picks: number;
  product_clicks: number;
  map_opens: number;
  follower_count: number;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [products, setProducts] = useState<(Product & { images: ProductImage[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Product editor modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<(Product & { images: ProductImage[] }) | null>(null);

  // Inline editor states
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<string>("");
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Analytics
      const analyticsRes = await fetch("/api/profile/analytics");
      if (!analyticsRes.ok) throw new Error("Failed to load analytics");
      const analyticsJson = await analyticsRes.json();
      setAnalytics(analyticsJson.analytics);

      // 2. Fetch Products
      const productsRes = await fetch("/api/profile/products");
      if (!productsRes.ok) throw new Error("Failed to load products");
      const productsJson = await productsRes.json();
      setProducts(productsJson.products || []);
    } catch (err) {
      console.error("[Dashboard] Fetch error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If user is loaded and not a seller, redirect back
    if (user && profile && profile.role !== "seller") {
      router.replace("/profile");
      return;
    }
    
    if (user) {
      fetchData();
    }
  }, [user, profile]);

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (prod: Product & { images: ProductImage[] }) => {
    setEditingProduct(prod);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");
      
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  // Inline Stock Edit
  const startStockEdit = (id: string, val: number) => {
    setEditingStockId(id);
    setTempStock(val.toString());
    // Close other edits
    setEditingPriceId(null);
  };

  const saveStockEdit = async (id: string) => {
    const stockVal = parseInt(tempStock);
    if (isNaN(stockVal) || stockVal < 0) {
      alert("Invalid stock number");
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: stockVal }),
      });
      if (!res.ok) throw new Error("Failed to update stock");
      
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, stock: stockVal, status: stockVal > 0 ? "active" : "out_of_stock" }
            : p
        )
      );
      setEditingStockId(null);
    } catch (err) {
      alert("Failed to update stock");
    }
  };

  // Inline Price Edit
  const startPriceEdit = (id: string, val: number) => {
    setEditingPriceId(id);
    setTempPrice(val.toString());
    // Close other edits
    setEditingStockId(null);
  };

  const savePriceEdit = async (id: string) => {
    const priceVal = parseFloat(tempPrice);
    if (isNaN(priceVal) || priceVal < 0) {
      alert("Invalid price number");
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: priceVal }),
      });
      if (!res.ok) throw new Error("Failed to update price");
      
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, price: priceVal } : p))
      );
      setEditingPriceId(null);
    } catch (err) {
      alert("Failed to update price");
    }
  };

  if (loading && !analytics) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={() => router.push("/profile")} className={styles.backBtn} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className={styles.title}>Seller Dashboard</h1>
            <p className={styles.subtitle}>Track your performance and manage inventory</p>
          </div>
        </div>
        <button onClick={fetchData} className={styles.refreshBtn} aria-label="Refresh Data">
          <RefreshCw size={18} />
        </button>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <p>{error}</p>
          <button onClick={fetchData} className={styles.retryBtn}>Retry</button>
        </div>
      )}

      {/* Analytics Section */}
      <div className={styles.analyticsSection}>
        <h2 className={styles.sectionTitle}>Overview & Analytics</h2>
        <div className={styles.statsGrid}>
          {/* Card 1: Views */}
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
              <Eye size={20} className={styles.statIcon} style={{ color: "#3b82f6" }} />
            </div>
            <div className={styles.statText}>
              <span className={styles.statValue}>{analytics?.post_views || 0}</span>
              <span className={styles.statLabel}>Post Views</span>
            </div>
          </div>

          {/* Card 2: Appreciates */}
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
              <Heart size={20} className={styles.statIcon} style={{ color: "#ef4444" }} />
            </div>
            <div className={styles.statText}>
              <span className={styles.statValue}>{analytics?.appreciates || 0}</span>
              <span className={styles.statLabel}>Appreciates</span>
            </div>
          </div>

          {/* Card 3: Saved/Picks */}
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}>
              <Bookmark size={20} className={styles.statIcon} style={{ color: "#10b981" }} />
            </div>
            <div className={styles.statText}>
              <span className={styles.statValue}>{analytics?.picks || 0}</span>
              <span className={styles.statLabel}>Picks / Saves</span>
            </div>
          </div>

          {/* Card 4: Product Clicks */}
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}>
              <ShoppingBag size={20} className={styles.statIcon} style={{ color: "#f59e0b" }} />
            </div>
            <div className={styles.statText}>
              <span className={styles.statValue}>{analytics?.product_clicks || 0}</span>
              <span className={styles.statLabel}>Product Clicks</span>
            </div>
          </div>

          {/* Card 5: Map Redirects */}
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}>
              <Map size={20} className={styles.statIcon} style={{ color: "#8b5cf6" }} />
            </div>
            <div className={styles.statText}>
              <span className={styles.statValue}>{analytics?.map_opens || 0}</span>
              <span className={styles.statLabel}>Map Opens</span>
            </div>
          </div>

          {/* Card 6: Followers */}
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: "rgba(236, 72, 153, 0.1)" }}>
              <TrendingUp size={20} className={styles.statIcon} style={{ color: "#ec4899" }} />
            </div>
            <div className={styles.statText}>
              <span className={styles.statValue}>{analytics?.follower_count || 0}</span>
              <span className={styles.statLabel}>Followers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Management */}
      <div className={styles.inventorySection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Manage Products</h2>
          <button onClick={handleCreateProduct} className={styles.addBtn}>
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>

        {products.length === 0 ? (
          <div className={styles.emptyState}>
            <Package size={48} className={styles.emptyIcon} />
            <h3>No products listed yet</h3>
            <p>List your creations to display them on your profile and link them to your posts.</p>
            <button onClick={handleCreateProduct} className={styles.emptyAddBtn}>
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className={styles.productTableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th className={styles.actionsHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => {
                  const hasImage = prod.images && prod.images.length > 0;
                  const thumb = hasImage ? prod.images[0].image_url : "";
                  const isStockEditing = editingStockId === prod.id;
                  const isPriceEditing = editingPriceId === prod.id;

                  return (
                    <tr key={prod.id}>
                      {/* Product Thumbnail & Title */}
                      <td>
                        <div className={styles.productCell}>
                          <div className={styles.productThumb}>
                            {hasImage ? (
                              <img src={thumb} alt={prod.title} />
                            ) : (
                              <Package size={20} style={{ opacity: 0.3 }} />
                            )}
                          </div>
                          <div className={styles.productInfo}>
                            <div className={styles.productTitle}>{prod.title}</div>
                            <div className={styles.productId}>ID: {prod.id.substring(0, 8)}</div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span className={styles.categoryBadge}>
                          {prod.category_id ? "Active Category" : "None"}
                        </span>
                      </td>

                      {/* Price */}
                      <td>
                        {isPriceEditing ? (
                          <div className={styles.inlineEditor}>
                            <span>₹</span>
                            <input
                              type="number"
                              value={tempPrice}
                              onChange={(e) => setTempPrice(e.target.value)}
                              className={styles.inlineInput}
                              autoFocus
                            />
                            <button onClick={() => savePriceEdit(prod.id)} className={styles.confirmBtn} aria-label="Confirm">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingPriceId(null)} className={styles.cancelInlineBtn} aria-label="Cancel">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => startPriceEdit(prod.id, prod.price)}
                            className={styles.editableCell}
                            title="Click to edit Price"
                          >
                            ₹{prod.price.toFixed(2)}
                            <Edit2 size={10} className={styles.editIconCell} />
                          </div>
                        )}
                      </td>

                      {/* Stock */}
                      <td>
                        {isStockEditing ? (
                          <div className={styles.inlineEditor}>
                            <input
                              type="number"
                              value={tempStock}
                              onChange={(e) => setTempStock(e.target.value)}
                              className={styles.inlineInput}
                              autoFocus
                            />
                            <button onClick={() => saveStockEdit(prod.id)} className={styles.confirmBtn} aria-label="Confirm">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingStockId(null)} className={styles.cancelInlineBtn} aria-label="Cancel">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => startStockEdit(prod.id, prod.stock)}
                            className={styles.editableCell}
                            title="Click to edit Stock"
                          >
                            {prod.stock}
                            <Edit2 size={10} className={styles.editIconCell} />
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            prod.stock > 0 ? styles.statusActive : styles.statusOutOfStock
                          }`}
                        >
                          {prod.stock > 0 ? "In Stock" : "Out of Stock"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className={styles.actionsCell}>
                          <button
                            onClick={() => handleEditProduct(prod)}
                            className={styles.iconBtn}
                            title="Edit Product"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className={styles.iconBtnDelete}
                            title="Delete Product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Creator & Editor Modal */}
      <ProductEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        onSave={fetchData}
      />
    </div>
  );
}
