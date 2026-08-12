import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Truck, ShoppingCart, UserCheck, ShieldAlert } from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();

  if (!user) return null;

  const hasAccess = (allowedRoles) => {
    return allowedRoles.includes(user.role);
  };

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER']
    },
    {
      to: '/purchases',
      label: 'Purchases Log',
      icon: ShoppingCart,
      roles: ['ADMIN', 'LOGISTICS_OFFICER']
    },
    {
      to: '/transfers',
      label: 'Asset Transfers',
      icon: Truck,
      roles: ['ADMIN', 'LOGISTICS_OFFICER']
    },
    {
      to: '/assignments',
      label: 'Assignments & Spent',
      icon: UserCheck,
      roles: ['ADMIN', 'BASE_COMMANDER']
    }
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900 px-4 py-6 flex flex-col h-[calc(100vh-4rem)]">
      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          if (!hasAccess(item.roles)) return null;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/10'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="rounded-lg bg-slate-800/40 p-4 border border-slate-800/60">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="h-4 w-4 text-slate-500" />
          <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">System Security</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
          All asset movements and status queries are cryptographically logged to the central audit registry.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
