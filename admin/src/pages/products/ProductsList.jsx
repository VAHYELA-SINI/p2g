import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  Filter,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Package,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { getProducts, deleteProduct, updateProduct } from '../../api/productsApi';
import { getCategories } from '../../api/categoriesApi';
import { formatCurrency } from '../../utils/formatters';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Delete modal state
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [prodsData, cats] = await Promise.all([
        getProducts({
          page,
          limit: 12,
          search: search.trim() || undefined,
          category: selectedCategory || undefined,
          isAvailable: availabilityFilter !== '' ? availabilityFilter : undefined,
        }),
        getCategories(),
      ]);

      setProducts(prodsData.products);
      setPagination(prodsData.pagination);
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching products:', err);
      setErrorMessage(err.message || 'Unable to retrieve products.');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCategory, availabilityFilter]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData(1);
  };

  const handleToggleAvailability = async (product) => {
    try {
      const updated = await updateProduct(product._id, {
        isAvailable: !product.isAvailable,
      });
      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? { ...p, isAvailable: updated.isAvailable } : p))
      );
    } catch (err) {
      alert(err.message || 'Failed to update availability.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      setIsDeleting(true);
      await deleteProduct(productToDelete._id);
      setProducts((prev) => prev.filter((p) => p._id !== productToDelete._id));
      setProductToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to delete product.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Product Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage store dishes, pricing, inventory stock, and availability.
          </p>
        </div>

        <Link
          to="/products/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Add New Product
        </Link>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dish or item..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </form>

        {/* Filter Selects */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Availability Filter */}
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Availability</option>
            <option value="true">Available Now</option>
            <option value="false">Unavailable / Sold Out</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <LoadingState message="Fetching products from catalog..." minHeight="min-h-[400px]" />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => loadData(pagination.page)} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          description={
            search || selectedCategory
              ? 'No products matched your search filters.'
              : 'Start by adding your first food item or product to the store catalog.'
          }
          actionLabel="Add Product"
          onAction={() => window.location.href = '/products/new'}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Price</th>
                  <th className="py-3.5 px-6">Stock Level</th>
                  <th className="py-3.5 px-6">Availability</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {products.map((product) => {
                  const isLowStock = product.stock !== undefined && product.stock <= 5;
                  const isOutOfStock = product.stock !== undefined && product.stock === 0;

                  return (
                    <tr key={product._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Product Thumbnail & Name */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{product.name}</p>
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {product.description || 'No description provided'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {product.category?.name || 'Uncategorized'}
                      </td>

                      {/* Price */}
                      <td className="py-4 px-6 font-extrabold text-slate-900">
                        {formatCurrency(product.price)}
                      </td>

                      {/* Stock Level */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          {product.stock ?? '∞'} in stock
                        </span>
                      </td>

                      {/* Availability Toggle */}
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleAvailability(product)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${
                            product.isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {product.isAvailable ? (
                            <>
                              <Eye className="w-3.5 h-3.5" /> Available
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" /> Hidden / Off
                            </>
                          )}
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to={`/products/${product._id}/edit`}
                            title="Edit Product"
                            className="p-2 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setProductToDelete(product)}
                            title="Delete Product"
                            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(p) => loadData(p)}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        title="Delete Product"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{' '}
            <span className="font-bold text-slate-900">{productToDelete?.name}</span>? This item will be
            permanently removed from the customer menu.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setProductToDelete(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {isDeleting ? 'Deleting...' : 'Delete Product'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
