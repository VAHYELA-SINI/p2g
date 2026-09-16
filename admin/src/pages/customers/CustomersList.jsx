import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, ArrowRight, UserCheck, Calendar } from 'lucide-react';
import { getCustomers } from '../../api/customersApi';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Pagination from '../../components/common/Pagination';

export default function CustomersList() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadCustomers = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const data = await getCustomers({
        page,
        limit: 15,
        search: search.trim() || undefined,
      });

      setCustomers(data.customers);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setErrorMessage(err.message || 'Unable to retrieve customers list.');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadCustomers(1);
  }, [loadCustomers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCustomers(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Customer Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registered customer accounts, contact details, and lifetime spending.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-sm">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </form>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <LoadingState message="Loading customers directory..." minHeight="min-h-[400px]" />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => loadCustomers(pagination.page)} />
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description={
            search ? 'No customer accounts matched your search.' : 'When customers sign up on mobile, they will appear here.'
          }
          icon={Users}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Contact Info</th>
                  <th className="py-3.5 px-6">Registered</th>
                  <th className="py-3.5 px-6 text-center">Orders Placed</th>
                  <th className="py-3.5 px-6 text-right">Lifetime Spend</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Customer Name & Avatar */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 font-bold flex items-center justify-center text-sm border border-brand-100">
                          {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-400 font-mono">ID: {c._id.slice(-8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-6">
                      <p className="text-slate-800 text-xs font-medium">{c.email}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{c.phone || 'No phone'}</p>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(c.createdAt)}
                    </td>

                    {/* Orders Count */}
                    <td className="py-4 px-6 text-center font-bold text-slate-800">
                      {c.totalOrders ?? 0}
                    </td>

                    {/* Total Spent */}
                    <td className="py-4 px-6 text-right font-extrabold text-slate-900 whitespace-nowrap">
                      {formatCurrency(c.totalSpent ?? 0)}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <Link
                        to={`/customers/${c._id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-colors"
                      >
                        Profile
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(p) => loadCustomers(p)}
          />
        </div>
      )}
    </div>
  );
}
