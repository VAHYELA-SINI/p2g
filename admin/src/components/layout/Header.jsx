import React from 'react';
import { Menu, Bell, User, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Header({ onOpenMobile, onRefresh }) {
  const { user } = useAuth();

  return (
    <header className="h-16 px-4 sm:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Mobile Toggle & Status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-600">P2G Food Ordering System • Active</span>
        </div>
      </div>

      {/* Right: Quick Actions & Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh View"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        <div className="h-4 w-px bg-slate-200" />

        {/* Profile Link */}
        <Link
          to="/profile"
          className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs border border-brand-200">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || 'Administrator'}</p>
            <p className="text-[11px] text-brand-600 font-medium">Store Admin</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
