import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  DollarSign,
  ArrowRight,
  Package,
} from 'lucide-react';
import { getCustomerById } from '../../api/customersApi';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';

export default function CustomerDetails() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadCustomer = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await getCustomerById(id);
      setData(res);
    } catch (err) {
      console.error('Error fetching customer profile:', err);
      setErrorMessage(err.message || 'Unable to load customer profile.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  if (isLoading) {
    return <LoadingState message="Loading customer profile..." minHeight="min-h-[400px]" />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={loadCustomer} />;
  }

  if (!data?.customer) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Customer account not found.</p>
        <Link to="/customers" className="text-brand-600 font-semibold mt-2 inline-block">
          ← Back to Customers
        </Link>
      </div>
    );
  }

  const { customer, orders = [], stats = {} } = data;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Back Link */}
      <div>
        <Link
          to="/customers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers Directory
        </Link>
      </div>

      {/* Customer Header & Profile Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 font-extrabold text-2xl flex items-center justify-center border border-brand-100 shadow-sm">
              {customer.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{customer.name}</h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {customer._id}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-initial p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Orders</span>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.totalOrders ?? 0}</p>
            </div>
            <div className="flex-1 sm:flex-initial p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-xs font-bold text-emerald-700 uppercase">Lifetime Spend</span>
              <p className="text-xl font-extrabold text-emerald-800 mt-0.5">
                {formatCurrency(stats.totalSpent ?? 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase">Email Address</span>
              <p className="text-sm font-semibold text-slate-900">{customer.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase">Phone Number</span>
              <p className="text-sm font-semibold text-slate-900">{customer.phone || 'Not provided'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase">Registration Date</span>
              <p className="text-sm font-semibold text-slate-900">{formatDateTime(customer.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Order History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-brand-600" />
            Order History ({orders.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete list of all food orders placed by this customer.
          </p>
        </div>

        {orders.length === 0 ? (
          <EmptyState
            title="No orders placed yet"
            description="This customer has not placed any orders."
            icon={Package}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="py-3.5 px-6">Order ID</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Items Ordered</th>
                  <th className="py-3.5 px-6">Order Status</th>
                  <th className="py-3.5 px-6">Payment</th>
                  <th className="py-3.5 px-6 text-right">Total Amount</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {orders.map((ord) => {
                  const itemsSummary = (ord.items || [])
                    .map((i) => `${i.quantity}x ${i.name}`)
                    .join(', ');

                  return (
                    <tr key={ord._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-slate-900">
                        #{ord._id.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(ord.createdAt)}
                      </td>
                      <td className="py-4 px-6 max-w-xs text-xs text-slate-700 truncate">
                        {itemsSummary || '—'}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <StatusBadge status={ord.orderStatus} type="order" size="sm" />
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <StatusBadge status={ord.paymentStatus} type="payment" size="sm" />
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {formatCurrency(ord.totalAmount)}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <Link
                          to={`/orders/${ord._id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-colors"
                        >
                          View Order
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
