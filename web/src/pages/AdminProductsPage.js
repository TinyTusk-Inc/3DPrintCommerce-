/**
 * AdminProductsPage
 * Create, edit, and delete products with color variants and images.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/adminService';
import { productService } from '../services/productService';
import ConfirmModal from '../components/ConfirmModal';
import toast from '../components/toast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_PRODUCT = {
  name: '',
  description: '',
  price: '',
  quantity_in_stock: '',
  category_id: ''
};

const EMPTY_VARIANT = {
  color_name: '',
  color_hex: '#000000',
  price_delta: '0',
  stock: '0',
  is_default: false,
  sort_order: '0'
};

const EMPTY_IMAGE = {
  url: '',
  alt_text: '',
  sort_order: '0',
  variant_id: ''   // '' means shared
};

// ---------------------------------------------------------------------------
// Sub-component: VariantRow
// ---------------------------------------------------------------------------

function VariantRow({ variant, onDelete, onSetDefault }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px', border: '1px solid #eee', borderRadius: '6px', marginBottom: '6px'
    }}>
      <span style={{
        display: 'inline-block', width: '20px', height: '20px',
        borderRadius: '50%', background: variant.color_hex || '#ccc',
        border: '1px solid #aaa', flexShrink: 0
      }} />
      <span style={{ flex: 1 }}>
        <strong>{variant.color_name}</strong>
        {variant.price_delta !== 0 && (
          <span style={{ color: '#888', fontSize: '12px', marginLeft: '6px' }}>
            {variant.price_delta > 0 ? `+₹${variant.price_delta}` : `-₹${Math.abs(variant.price_delta)}`}
          </span>
        )}
        <span style={{ color: '#888', fontSize: '12px', marginLeft: '6px' }}>
          Stock: {variant.stock}
        </span>
        {variant.is_default && (
          <span style={{ marginLeft: '8px', fontSize: '11px', background: '#3498db', color: '#fff', padding: '1px 6px', borderRadius: '10px' }}>
            default
          </span>
        )}
      </span>
      {!variant.is_default && (
        <button onClick={() => onSetDefault(variant.id)} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '12px' }}>
          Set default
        </button>
      )}
      <button onClick={() => onDelete(variant.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '16px' }}>
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: ImageRow
// ---------------------------------------------------------------------------

function ImageRow({ image, variants, onDelete }) {
  const variant = variants.find(v => v.id === image.variant_id);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px', border: '1px solid #eee', borderRadius: '6px', marginBottom: '6px'
    }}>
      <img
        src={image.url}
        alt={image.alt_text || 'product'}
        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
        onError={e => { e.target.style.display = 'none'; }}
      />
      <span style={{ flex: 1, fontSize: '13px', wordBreak: 'break-all' }}>
        {image.url.length > 60 ? image.url.substring(0, 60) + '…' : image.url}
        <br />
        <span style={{ color: '#888' }}>
          {variant ? `Color: ${variant.color_name}` : 'Shared (all colors)'}
          {' · '}Order: {image.sort_order}
        </span>
      </span>
      <button onClick={() => onDelete(image.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '16px' }}>
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Confirm modal
  const [confirm, setConfirm] = useState(null);

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null = create mode
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);

  // Variant / image management (for an existing product)
  const [managingProduct, setManagingProduct] = useState(null); // full product with variants+images
  const [variantForm, setVariantForm] = useState(EMPTY_VARIANT);
  const [imageForm, setImageForm] = useState(EMPTY_IMAGE);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        productService.getProducts({ limit: 100 }),
        productService.getCategories()
      ]);
      setProducts(prodRes.products || []);
      setCategories(catRes.categories || []);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const refreshManagingProduct = async (productId) => {
    try {
      const res = await productService.getProduct(productId);
      setManagingProduct(res.product);
    } catch (err) {
      toast.error('Failed to refresh product');
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Product CRUD
  // ---------------------------------------------------------------------------

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await adminService.updateProduct(editingProduct.id, {
          ...productForm,
          price: parseFloat(productForm.price),
          quantity_in_stock: parseInt(productForm.quantity_in_stock, 10)
        });
        toast.success('Product updated');
      } else {
        await adminService.createProduct({
          ...productForm,
          price: parseFloat(productForm.price),
          quantity_in_stock: parseInt(productForm.quantity_in_stock, 10)
        });
        toast.success('Product created');
      }
      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm(EMPTY_PRODUCT);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Failed to save product');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      quantity_in_stock: product.quantity_in_stock,
      category_id: product.category_id || ''
    });
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (productId, productName) => {
    setConfirm({
      message: `Delete "${productName}"? This will also remove all its variants and images. This cannot be undone.`,
      confirmLabel: 'Delete Product',
      onConfirm: async () => {
        try {
          await adminService.deleteProduct(productId);
          toast.success('Product deleted');
          fetchProducts();
        } catch (err) {
          toast.error('Failed to delete product');
        }
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Variant CRUD
  // ---------------------------------------------------------------------------

  const handleAddVariant = async (e) => {
    e.preventDefault();
    try {
      await adminService.createVariant(managingProduct.id, {
        ...variantForm,
        price_delta: parseFloat(variantForm.price_delta) || 0,
        stock: parseInt(variantForm.stock, 10) || 0,
        sort_order: parseInt(variantForm.sort_order, 10) || 0
      });
      toast.success('Variant added');
      setVariantForm(EMPTY_VARIANT);
      refreshManagingProduct(managingProduct.id);
    } catch (err) {
      toast.error(err.message || 'Failed to add variant');
    }
  };

  const handleDeleteVariant = async (variantId) => {
    setConfirm({
      message: 'Delete this color variant and all its images?',
      confirmLabel: 'Delete Variant',
      onConfirm: async () => {
        try {
          await adminService.deleteVariant(managingProduct.id, variantId);
          toast.success('Variant deleted');
          refreshManagingProduct(managingProduct.id);
        } catch (err) {
          toast.error('Failed to delete variant');
        }
      }
    });
  };

  const handleSetDefaultVariant = async (variantId) => {
    try {
      await adminService.updateVariant(managingProduct.id, variantId, { is_default: true });
      toast.success('Default variant updated');
      refreshManagingProduct(managingProduct.id);
    } catch (err) {
      toast.error('Failed to update default');
    }
  };

  // ---------------------------------------------------------------------------
  // Image CRUD
  // ---------------------------------------------------------------------------

  const handleAddImage = async (e) => {
    e.preventDefault();
    try {
      await adminService.addProductImage(managingProduct.id, {
        ...imageForm,
        variant_id: imageForm.variant_id || null,
        sort_order: parseInt(imageForm.sort_order, 10) || 0
      });
      toast.success('Image added');
      setImageForm(EMPTY_IMAGE);
      refreshManagingProduct(managingProduct.id);
    } catch (err) {
      toast.error(err.message || 'Failed to add image');
    }
  };

  const handleDeleteImage = async (imageId) => {
    setConfirm({
      message: 'Remove this image from the product?',
      confirmLabel: 'Remove Image',
      onConfirm: async () => {
        try {
          await adminService.deleteProductImage(managingProduct.id, imageId);
          toast.success('Image removed');
          refreshManagingProduct(managingProduct.id);
        } catch (err) {
          toast.error('Failed to remove image');
        }
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) return <div className="loading"><div className="spinner" />Loading...</div>;

  // Variant/image management panel
  if (managingProduct) {
    const allImages = [
      ...(managingProduct.shared_images || []),
      ...(managingProduct.variants || []).flatMap(v => v.images || [])
    ];

    return (
      <div>
        <button onClick={() => setManagingProduct(null)} className="btn btn-secondary" style={{ marginBottom: '20px' }}>
          ← Back to Products
        </button>
        <h2>Manage: {managingProduct.name}</h2>

        {confirm && (
          <ConfirmModal
            message={confirm.message}
            confirmLabel={confirm.confirmLabel || 'Confirm'}
            onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
            onCancel={() => setConfirm(null)}
          />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Color Variants */}
          <div className="card">
            <h3 className="card-title">Color Variants</h3>

            {(managingProduct.variants || []).length === 0 ? (
              <p className="text-muted">No color variants — product has a single appearance.</p>
            ) : (
              (managingProduct.variants || []).map(v => (
                <VariantRow
                  key={v.id}
                  variant={v}
                  onDelete={handleDeleteVariant}
                  onSetDefault={handleSetDefaultVariant}
                />
              ))
            )}

            <h4 style={{ marginTop: '20px' }}>Add Color Variant</h4>
            <form onSubmit={handleAddVariant}>
              <div className="form-group">
                <label className="form-label">Color Name *</label>
                <input
                  className="form-input"
                  value={variantForm.color_name}
                  onChange={e => setVariantForm(p => ({ ...p, color_name: e.target.value }))}
                  placeholder="e.g. Midnight Black"
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Swatch Color</label>
                  <input
                    type="color"
                    className="form-input"
                    value={variantForm.color_hex}
                    onChange={e => setVariantForm(p => ({ ...p, color_hex: e.target.value }))}
                    style={{ height: '38px', padding: '2px' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Price Delta (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={variantForm.price_delta}
                    onChange={e => setVariantForm(p => ({ ...p, price_delta: e.target.value }))}
                    placeholder="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Stock</label>
                  <input
                    type="number"
                    className="form-input"
                    value={variantForm.stock}
                    onChange={e => setVariantForm(p => ({ ...p, stock: e.target.value }))}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sort Order</label>
                  <input
                    type="number"
                    className="form-input"
                    value={variantForm.sort_order}
                    onChange={e => setVariantForm(p => ({ ...p, sort_order: e.target.value }))}
                    min="0"
                  />
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={variantForm.is_default}
                    onChange={e => setVariantForm(p => ({ ...p, is_default: e.target.checked }))}
                  />
                  Set as default color
                </label>
              </div>
              <button type="submit" className="btn btn-primary">Add Variant</button>
            </form>
          </div>

          {/* Images */}
          <div className="card">
            <h3 className="card-title">Images</h3>

            {allImages.length === 0 ? (
              <p className="text-muted">No images yet.</p>
            ) : (
              allImages.map(img => (
                <ImageRow
                  key={img.id}
                  image={img}
                  variants={managingProduct.variants || []}
                  onDelete={handleDeleteImage}
                />
              ))
            )}

            <h4 style={{ marginTop: '20px' }}>Add Image</h4>
            <form onSubmit={handleAddImage}>
              <div className="form-group">
                <label className="form-label">Image URL *</label>
                <input
                  className="form-input"
                  value={imageForm.url}
                  onChange={e => setImageForm(p => ({ ...p, url: e.target.value }))}
                  placeholder="https://..."
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Alt Text</label>
                <input
                  className="form-input"
                  value={imageForm.alt_text}
                  onChange={e => setImageForm(p => ({ ...p, alt_text: e.target.value }))}
                  placeholder="Front view"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Color (optional)</label>
                  <select
                    className="form-input"
                    value={imageForm.variant_id}
                    onChange={e => setImageForm(p => ({ ...p, variant_id: e.target.value }))}
                  >
                    <option value="">Shared (all colors)</option>
                    {(managingProduct.variants || []).map(v => (
                      <option key={v.id} value={v.id}>{v.color_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sort Order</label>
                  <input
                    type="number"
                    className="form-input"
                    value={imageForm.sort_order}
                    onChange={e => setImageForm(p => ({ ...p, sort_order: e.target.value }))}
                    min="0"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Add Image</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Product list + create/edit form
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="card-title" style={{ margin: 0 }}>Products</h1>
        <button
          className="btn btn-primary"
          onClick={() => { setShowProductForm(true); setEditingProduct(null); setProductForm(EMPTY_PRODUCT); }}
        >
          + Add Product
        </button>
      </div>

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          confirmLabel={confirm.confirmLabel || 'Confirm'}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Create / Edit form */}
      {showProductForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 className="card-title">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
          <form onSubmit={handleProductSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  className="form-input"
                  value={productForm.name}
                  onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-input"
                  value={productForm.category_id}
                  onChange={e => setProductForm(p => ({ ...p, category_id: e.target.value }))}
                  required
                >
                  <option value="">Select category…</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                className="form-input"
                value={productForm.description}
                onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Base Price (₹) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={productForm.price}
                  onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Stock *</label>
                <input
                  type="number"
                  className="form-input"
                  value={productForm.quantity_in_stock}
                  onChange={e => setProductForm(p => ({ ...p, quantity_in_stock: e.target.value }))}
                  min="0"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowProductForm(false); setEditingProduct(null); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product table */}
      <div className="card">
        {products.length === 0 ? (
          <p className="text-muted">No products yet. Click "Add Product" to create one.</p>
        ) : (
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 8px' }}>{product.name}</td>
                  <td style={{ padding: '10px 8px' }}>₹{Number(product.price).toFixed(2)}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ color: product.quantity_in_stock < 10 ? '#e74c3c' : '#27ae60' }}>
                      {product.quantity_in_stock}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {categories.find(c => c.id === product.category_id)?.name || '—'}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => handleEditProduct(product)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={async () => {
                          const res = await productService.getProduct(product.id);
                          setManagingProduct(res.product);
                        }}
                      >
                        🎨 Colors & Images
                      </button>
                      <button
                        style={{ padding: '4px 10px', fontSize: '12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminProductsPage;
