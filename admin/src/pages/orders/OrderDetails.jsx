import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Phone,
  Calendar,
} from 'lucide-react';
import { getOrderById, updateOrderStatus, cancelOrder } from '../../api/ordersApi';
import {
  formatCurrency,
  formatDateTime,
  ORDER_STATUSES,
  getOrderStatusConfig,
  getPaymentStatusConfig,
} from '../../utils/formatters';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';

export default function OrderDetails() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Status update state
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState(null);

  const loadOrder = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await getOrderById(id);
      setOrder(data);
      if (data?.orderStatus) {
        setSelectedStatus(data.orderStatus);
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
      setErrorMessage(err.message || 'Unable to retrieve order details.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedStatus) return;

    try {
      setIsUpdatingStatus(true);
      setUpdateFeedback(null);
      const updated = await updateOrderStatus(order._id, {
        status: selectedStatus,
        note: statusNote.trim() || undefined,
      });
      setOrder(updated);
      setStatusNote('');
      setUpdateFeedback({
        type: 'success',
        message: `Order successfully updated to ${selectedStatus}`,
      });
    } catch (err) {
      setUpdateFeedback({
        type: 'error',
        message: err.message || 'Failed to update order status.',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancelClick = async () => {
    const reason = window.prompt('Please enter a cancellation reason:');
    if (reason === null) return;

    try {
      setIsUpdatingStatus(true);
      const updated = await cancelOrder(order._id, reason || 'Cancelled by Store Admin');
      setOrder(updated);
      setSelectedStatus('CANCELLED');
      setUpdateFeedback({
        type: 'success',
        message: 'Order was successfully cancelled and inventory restored.',
      });
    } catch (err) {
      setUpdateFeedback({
        type: 'error',
        message: err.message || 'Could not cancel order.',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading order details..." minHeight="min-h-[450px]" />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={loadOrder} />;
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Order not found.</p>
        <Link to="/orders" className="text-brand-600 font-semibold mt-2 inline-block">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const orderCfg = getOrderStatusConfig(order.orderStatus);
  const paymentCfg = getPaymentStatusConfig(order.paymentStatus);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Back Button & Top Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders List
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Order #{order._id.slice(-8).toUpperCase()}
            </h1>
            <StatusBadge status={order.orderStatus} type="order" size="lg" />
            <StatusBadge status={order.paymentStatus} type="payment" size="lg" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Placed on {formatDateTime(order.createdAt)} • DB ID: {order._id}
          </p>
        </div>

        {order.orderStatus !== 'CANCELLED' && (
          <button
            onClick={handleCancelClick}
            disabled={isUpdatingStatus}
            className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors self-start sm:self-auto cursor-pointer"
          >
            Cancel Order & Restore Stock
          </button>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items & Delivery (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-brand-600" />
                Purchased Items ({order.items?.length || 0})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <th className="py-3 px-6">Item</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-6 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {order.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-11 h-11 rounded-lg object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                              🍲
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-400">ID: {item.product}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-slate-700">
                        {item.quantity}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-600">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold text-slate-900">
                        {formatCurrency(item.subtotal || item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="p-6 bg-slate-50/70 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Items Subtotal</span>
                <span className="font-medium text-slate-900">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Delivery Logistics Fee</span>
                <span className="font-medium text-slate-900">{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-extrabold text-slate-900">
                <span>Total Amount</span>
                <span className="text-brand-600 text-lg">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Delivery Details Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-brand-600" />
              Delivery Destination
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs font-bold uppercase text-slate-400">Recipient Name</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {order.deliveryInformation?.fullName || '—'}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold uppercase text-slate-400">Contact Phone</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {order.deliveryInformation?.phone || '—'}
                </p>
              </div>

              <div className="sm:col-span-2">
                <span className="text-xs font-bold uppercase text-slate-400">Delivery Address</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {order.deliveryInformation?.address}, {order.deliveryInformation?.city}
                </p>
              </div>

              {order.deliveryInformation?.additionalInstructions && (
                <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <span className="font-bold">Instructions: </span>
                  {order.deliveryInformation.additionalInstructions}
                </div>
              )}
            </div>
          </div>

          {/* Status Timeline History */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-brand-600" />
              Status Progression History
            </h2>

            {(!order.statusHistory || order.statusHistory.length === 0) ? (
              <p className="text-sm text-slate-500">No status timeline events recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {order.statusHistory.map((hist, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative">
                    <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 border border-brand-200">
                      ✓
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{hist.status}</span>
                        <span className="text-xs text-slate-400">{formatDateTime(hist.changedAt)}</span>
                      </div>
                      {hist.note && <p className="text-xs text-slate-600 mt-0.5">{hist.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Status Update & Payment Details (1 col) */}
        <div className="space-y-6">
          {/* Status Update Control Panel */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">Update Order Status</h2>
            <p className="text-xs text-slate-500 mb-5">
              Advance the fulfillment state machine for this customer order.
            </p>

            {updateFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium mb-4 flex items-center gap-2 ${
                  updateFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {updateFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{updateFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Select New Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Status Note (Optional)
                </label>
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Dispatched with Rider Samuel (080...)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingStatus || selectedStatus === order.orderStatus}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors cursor-pointer"
              >
                {isUpdatingStatus ? (
                  <span className="inline-flex items-center gap-1.5 justify-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </span>
                ) : (
                  'Apply Status Change'
                )}
              </button>
            </form>
          </div>

          {/* Payment Details Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-brand-600" />
              Paystack Payment
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Payment Status</span>
                <StatusBadge status={order.paymentStatus} type="payment" size="sm" />
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Reference</span>
                <span className="font-mono font-bold text-slate-900 truncate max-w-[170px]">
                  {order.paymentReference || 'None'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Channel</span>
                <span className="font-semibold text-slate-900 uppercase">
                  {order.paymentDetails?.channel || 'Paystack'}
                </span>
              </div>

              {order.paymentDetails?.paidAt && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Paid Timestamp</span>
                  <span className="font-medium text-slate-700">
                    {formatDateTime(order.paymentDetails.paidAt)}
                  </span>
                </div>
              )}

              {order.paymentDetails?.gatewayResponse && (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Gateway Response</span>
                  <span className="font-medium text-slate-700">
                    {order.paymentDetails.gatewayResponse}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Profile Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-brand-600" />
              Customer Account
            </h2>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-sm text-slate-900">{order.customer?.name || 'Guest / Customer'}</p>
              <p className="text-slate-500">{order.customer?.email || '—'}</p>
              <p className="text-slate-500">{order.customer?.phone || '—'}</p>

              {order.customer?._id && (
                <Link
                  to={`/customers/${order.customer._id}`}
                  className="inline-block text-xs font-bold text-brand-600 hover:text-brand-700 pt-2"
                >
                  View full customer history →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
