import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  Filter,
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { getOrders } from '../../api/ordersApi';
import { formatCurrency, formatDateTime, ORDER_STATUSES } from '../../utils/formatters';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Pagination from '../../components/common/Pagination';

export default function OrdersList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get('paymentStatus') || '');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadOrdersData = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const data = await getOrders({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        paymentStatus: paymentFilter || undefined,
      });

      setOrders(data.orders);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setErrorMessage(err.message || 'Unable to retrieve orders.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, paymentFilter]);

  useEffect(() => {
    loadOrdersData(1);
  }, [loadOrdersData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadOrdersData(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Customer Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track kitchen preparation, courier dispatches, and payment confirmations.
          </p>
        </div>

        <button
          onClick={() => loadOrdersData(pagination.page)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh List
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
            placeholder="Order ID, Customer name or ref..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </form>

        {/* Filter Selects */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Order Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setSearchParams((prev) => {
                if (e.target.value) prev.set('status', e.target.value);
                else prev.delete('status');
                return prev;
              });
            }}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Order Statuses</option>
            {ORDER_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          {/* Payment Status */}
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setSearchParams((prev) => {
                if (e.target.value) prev.set('paymentStatus', e.target.value);
                else prev.delete('paymentStatus');
                return prev;
              });
            }}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Payment Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <LoadingState message="Loading customer orders..." minHeight="min-h-[400px]" />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => loadOrdersData(pagination.page)} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={
            statusFilter || paymentFilter || search
              ? 'No orders matched the selected filter criteria.'
              : 'When customers place orders on the mobile app, they will appear here.'
          }
          icon={ShoppingBag}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="py-3.5 px-6">Order ID</th>
                  <th className="py-3.5 px-6">Customer & Phone</th>
                  <th className="py-3.5 px-6">Items Summary</th>
                  <th className="py-3.5 px-6">Order Status</th>
                  <th className="py-3.5 px-6">Payment</th>
                  <th className="py-3.5 px-6 text-right">Total</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {orders.map((order) => {
                  const itemsSummary = (order.items || [])
                    .map((i) => `${i.quantity}x ${i.name}`)
                    .join(', ');

                  return (
                    <tr key={order._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Order ID & Date */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">
                          #{order._id.slice(-8).toUpperCase()}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {formatDateTime(order.createdAt)}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">
                          {order.customer?.name || order.deliveryInformation?.fullName || 'Customer'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {order.deliveryInformation?.phone || order.customer?.phone || '—'}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-4 px-6 max-w-xs">
                        <p className="text-slate-700 text-xs line-clamp-2">
                          {itemsSummary || '—'}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <StatusBadge status={order.orderStatus} type="order" size="sm" />
                      </td>

                      {/* Payment */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <StatusBadge status={order.paymentStatus} type="payment" size="sm" />
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-6 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {formatCurrency(order.totalAmount)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <Link
                          to={`/orders/${order._id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-colors"
                        >
                          Manage
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(p) => loadOrdersData(p)}
          />
        </div>
      )}
    </div>
  );
}
