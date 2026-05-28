"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Upload, Plus, Trash } from "lucide-react";
import type { Product, ProductImage } from "@/types";
import styles from "./product-editor-modal.module.css";

interface ProductEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: (Product & { images: ProductImage[] }) | null; // If editing
  onSave: () => void;
}

export default function ProductEditorModal({
  isOpen,
  onClose,
  product = null,
  onSave,
}: ProductEditorModalProps) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  const [newSize, setNewSize] = useState("");

  // Variants: array of { name: string, options: string[] }
  const [variants, setVariants] = useState<{ name: string; options: string[] }[]>([]);
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantOptions, setNewVariantOptions] = useState("");

  // Media upload
  const [files, setFiles] = useState<{ file?: File; preview: string; id?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Load existing product if editing
  useEffect(() => {
    if (product) {
      setTitle(product.title);
      setDescription(product.description || "");
      setPrice(product.price.toString());
      setStock(product.stock.toString());
      setCategoryId(product.category_id || "");
      setDeliveryInfo(product.delivery_info || "");
      setSizes(product.sizes || []);
      setVariants(product.variants || []);
      
      const preppedImages = (product.images || []).map((img) => ({
        preview: img.image_url,
        id: img.id,
      }));
      setFiles(preppedImages);
    } else {
      // Clear form for create
      setTitle("");
      setDescription("");
      setPrice("");
      setStock("");
      setCategoryId("");
      setDeliveryInfo("");
      setSizes([]);
      setVariants([]);
      setFiles([]);
    }
    setError(null);
  }, [product, isOpen]);

  // Image Selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setError(null);

    const newFiles: { file: File; preview: string }[] = [];
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      if (file.size > 10 * 1024 * 1024) {
        setError("Image file is too large (max 10MB)");
        continue;
      }
      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }
    setFiles((prev) => [...prev, ...newFiles]);
  };

  // Remove Image
  const removeImage = (index: number) => {
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (prev[index].file) {
        URL.revokeObjectURL(prev[index].preview);
      }
      return updated;
    });
  };

  // Add Size chip
  const addSize = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === "keydown" && (e as React.KeyboardEvent).key !== "Enter") return;
    if (e.type === "keydown") e.preventDefault();

    if (newSize.trim() && !sizes.includes(newSize.trim().toUpperCase())) {
      setSizes([...sizes, newSize.trim().toUpperCase()]);
      setNewSize("");
    }
  };

  // Remove Size chip
  const removeSize = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index));
  };

  // Add Variant
  const addVariant = () => {
    if (!newVariantName.trim() || !newVariantOptions.trim()) return;
    const optionList = newVariantOptions
      .split(",")
      .map((opt) => opt.trim())
      .filter(Boolean);

    setVariants([
      ...variants,
      { name: newVariantName.trim(), options: optionList },
    ]);
    setNewVariantName("");
    setNewVariantOptions("");
  };

  // Remove Variant
  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title.trim()) {
      setError("Product title is required");
      return;
    }
    if (files.length === 0) {
      setError("Please add at least one product image");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      if (product) {
        // Edit existing product
        // Note: For editing in MVP, we update textual fields. Adding/removing images can be handled via PUT API or recreated.
        const response = await fetch(`/api/products/${product.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            price: parseFloat(price) || 0,
            stock: parseInt(stock) || 0,
            category_id: categoryId || null,
            delivery_info: deliveryInfo.trim() || null,
            sizes,
            variants,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to update product");
        }
      } else {
        // Create new product
        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("description", description.trim());
        formData.append("price", price);
        formData.append("stock", stock);
        formData.append("category_id", categoryId);
        formData.append("delivery_info", deliveryInfo);
        formData.append("sizes", JSON.stringify(sizes));
        formData.append("variants", JSON.stringify(variants));

        files.forEach((f) => {
          if (f.file) {
            formData.append("files", f.file);
          }
        });

        const response = await fetch("/api/products", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to create product");
        }
      }

      onSave();
      onClose();
    } catch (err) {
      console.error("Product submission failed:", err);
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.modalTitle}>
            {product ? "Edit Product" : "Add Product"}
          </h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.scrollContent}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            {/* Title */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Product Title *</label>
              <input
                type="text"
                placeholder="e.g. Handmade Leather Wallet"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={styles.input}
                required
              />
            </div>

            {/* Category */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={styles.select}
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price & Stock */}
            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Price (₹) *</label>
                <input
                  type="number"
                  placeholder="Price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={styles.input}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Stock *</label>
                <input
                  type="number"
                  placeholder="Stock quantity"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className={styles.input}
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                placeholder="Product details, materials, crafting process..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={styles.textarea}
                rows={3}
              />
            </div>

            {/* Images Upload */}
            {!product && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Images *</label>
                <div className={styles.imageSelector} onClick={() => fileInputRef.current?.click()}>
                  <Upload size={24} />
                  <span>Upload Photos (max 5)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageSelect}
                    className={styles.hiddenInput}
                  />
                </div>
              </div>
            )}

            {/* Image Previews */}
            {files.length > 0 && (
              <div className={styles.previewGrid}>
                {files.map((file, idx) => (
                  <div key={idx} className={styles.previewWrapper}>
                    <img src={file.preview} alt="Product preview" className={styles.previewImg} />
                    {!product && (
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className={styles.removeImgBtn}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Sizes */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Available Sizes (Optional)</label>
              <div className={styles.sizeInputWrapper}>
                <input
                  type="text"
                  placeholder="e.g. M, L, XL, 10, 11 (Press Enter to add)"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  onKeyDown={addSize}
                  className={styles.input}
                />
                <button type="button" onClick={addSize} className={styles.plusBtn}>
                  <Plus size={16} />
                </button>
              </div>
              {sizes.length > 0 && (
                <div className={styles.chipsWrapper}>
                  {sizes.map((size, idx) => (
                    <span key={idx} className={styles.chip}>
                      {size}
                      <button type="button" onClick={() => removeSize(idx)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Variants */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Variants (Optional)</label>
              <div className={styles.variantForm}>
                <input
                  type="text"
                  placeholder="Variant Name (e.g. Color)"
                  value={newVariantName}
                  onChange={(e) => setNewVariantName(e.target.value)}
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="Options (comma separated, e.g. Black, Brown)"
                  value={newVariantOptions}
                  onChange={(e) => setNewVariantOptions(e.target.value)}
                  className={styles.input}
                />
                <button type="button" onClick={addVariant} className={styles.addVariantBtn}>
                  Add Variant
                </button>
              </div>
              {variants.length > 0 && (
                <div className={styles.variantList}>
                  {variants.map((v, idx) => (
                    <div key={idx} className={styles.variantItem}>
                      <div className={styles.variantInfo}>
                        <strong>{v.name}:</strong> {v.options.join(", ")}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariant(idx)}
                        className={styles.removeVariantBtn}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery Info */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Delivery Info</label>
              <input
                type="text"
                placeholder="e.g. Ships in 2-3 days, free local delivery"
                value={deliveryInfo}
                onChange={(e) => setDeliveryInfo(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelBtn}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
