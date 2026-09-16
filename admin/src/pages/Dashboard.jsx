import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  PlusCircle,
  Layers,
  Package,
  AlertCircle,
} from 'lucide-react';
import { getOrderStats } from '../api/ordersApi';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setErrorMessage(null);
      const data = await getOrderStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      setErrorMessage(err.message || 'Unable to retrieve dashboard statistics from the server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return <LoadingState message="Calculating store metrics and recent orders..." minHeight="min-h-[450px]" />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={loadDashboardData} />;
  }

  const {
    totalOrders = 0,
    pendingOrders = 0,
    completedOrders = 0,
    totalSales = 0,
    recentOrders = [],
    dailySales = [],
  } = stats || {};

  const kpis = [
    {
      title: 'Total Revenue',
      value: formatCurrency(totalSales),
      subtitle: `${stats?.paidOrders || 0} paid transactions`,
      icon: DollarSign,
      color: 'bg-emerald-500 text-white',
      badgeBg: 'bg-emerald-50 text-emerald-700',
    },
    {
      title: 'Total Orders',
      value: totalOrders.toLocaleString(),
      subtitle: 'All-time customer orders',
      icon: ShoppingBag,
      color: 'bg-brand-600 text-white',
      badgeBg: 'bg-brand-50 text-brand-700',
    },
    {
      title: 'Orders in Progress',
      value: pendingOrders.toLocaleString(),
      subtitle: 'Pending, preparing & out for delivery',
      icon: Clock,
      color: 'bg-amber-500 text-white',
      badgeBg: 'bg-amber-50 text-amber-700',
    },
    {
      title: 'Completed Orders',
      value: completedOrders.toLocaleString(),
      subtitle: 'Successfully delivered orders',
      icon: CheckCircle2,
      color: 'bg-blue-600 text-white',
      badgeBg: 'bg-blue-50 text-blue-700',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner & Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Store Performance Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time analytics for P2G single-vendor orders, sales, and fulfillment.
          </p>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/products/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm shadow-brand-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Add Product
          </Link>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold shadow-xs transition-all"
          >
            View All Orders
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {kpi.title}
                </span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color} shadow-sm`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
                {kpi.value}
              </div>
              <div className="text-xs text-slate-500 font-medium">{kpi.subtitle}</div>
            </div>
          );
        })}
      </div>

      {/* Sales Analytics & Quick Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Daily Sales Revenue (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Revenue Trend</h3>
                <p className="text-xs text-slate-500">Paid orders breakdown over the last 7 days</p>
              </div>
            </div>
          </div>

          {dailySales.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <AlertCircle className="w-6 h-6 mb-1 text-slate-300" />
              <p className="text-xs font-medium">No recorded sales in the last 7 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailySales.map((day) => {
                const maxSales = Math.max(...dailySales.map((d) => d.sales), 1);
                const percent = Math.min(Math.round((day.sales / maxSales) * 100), 100);

                return (
                  <div key={day._id} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700 font-semibold">{day._id}</span>
                      <span className="text-emerald-700 font-bold">
                        {formatCurrency(day.sales)} ({day.count} {day.count === 1 ? 'order' : 'orders'})
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Operations (1 col) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Quick Management</h3>
            <p className="text-xs text-slate-500 mb-6">Direct access to core merchant tools</p>

            <div className="space-y-3">
              <Link
                to="/products"
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Catalog & Products</p>
                    <p className="text-xs text-slate-500">Update dishes, stock & pricing</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                to="/categories"
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Food Categories</p>
                    <p className="text-xs text-slate-500">Manage store taxonomy</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                to="/orders?status=PENDING"
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Pending Orders</p>
                    <p className="text-xs text-slate-500">{pendingOrders} awaiting attention</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400">
            P2G Single-Vendor Backend Engine
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Customer Orders</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest orders placed through mobile app</p>
          </div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            View all orders
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <EmptyState
            title="No recent orders"
            description="Orders placed by customers will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="py-3.5 px-6">Order ID</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Order Status</th>
                  <th className="py-3.5 px-6">Payment</th>
                  <th className="py-3.5 px-6 text-right">Total</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      #{order._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">
                        {order.customer?.name || order.deliveryInformation?.fullName || 'Customer'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {order.customer?.email || order.deliveryInformation?.phone || '—'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <StatusBadge status={order.orderStatus} type="order" size="sm" />
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <StatusBadge status={order.paymentStatus} type="payment" size="sm" />
                    </td>
                    <td className="py-4 px-6 text-right font-extrabold text-slate-900 whitespace-nowrap">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <Link
                        to={`/orders/${order._id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Details
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
