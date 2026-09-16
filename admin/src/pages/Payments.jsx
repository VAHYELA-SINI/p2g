import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, CreditCard, ArrowRight, RefreshCw } from 'lucide-react';
import { getPayments } from '../api/paymentsApi';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Pagination from '../components/common/Pagination';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadPaymentsData = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const data = await getPayments({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });

      setPayments(data.payments);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setErrorMessage(err.message || 'Unable to retrieve payment transactions.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadPaymentsData(1);
  }, [loadPaymentsData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadPaymentsData(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Payment Transactions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Authoritative Paystack payment logs, transaction references, and settlement statuses.
          </p>
        </div>

        <button
          onClick={() => loadPaymentsData(pagination.page)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Transactions
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference or customer..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </form>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Payment Statuses</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <LoadingState message="Loading payment transactions..." minHeight="min-h-[400px]" />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => loadPaymentsData(pagination.page)} />
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payments recorded"
          description={
            statusFilter || search
              ? 'No transactions matched your search filters.'
              : 'Payments processed via Paystack will appear here with cryptographic references.'
          }
          icon={CreditCard}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="py-3.5 px-6">Payment Reference</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6">Channel</th>
                  <th className="py-3.5 px-6">Payment Status</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6 text-right">Associated Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Reference */}
                    <td className="py-4 px-6 font-mono font-bold text-xs text-slate-900 max-w-xs truncate">
                      {p.paymentReference}
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">
                        {p.customer?.name || 'Customer'}
                      </div>
                      <div className="text-xs text-slate-500">{p.customer?.email || '—'}</div>
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-6 font-extrabold text-slate-900 whitespace-nowrap">
                      {formatCurrency(p.amount)}
                    </td>

                    {/* Channel */}
                    <td className="py-4 px-6 text-xs uppercase font-medium text-slate-600">
                      {p.channel || 'Card'}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <StatusBadge status={p.status} type="payment" size="sm" />
                    </td>

                    {/* Date */}
                    <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(p.paidAt || p.createdAt)}
                    </td>

                    {/* Link to Order */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <Link
                        to={`/orders/${p.orderId}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-colors"
                      >
                        #{p.orderId.slice(-8).toUpperCase()}
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
            onPageChange={(pg) => loadPaymentsData(pg)}
          />
        </div>
      )}
    </div>
  );
}
