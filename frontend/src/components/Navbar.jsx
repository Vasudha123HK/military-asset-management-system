import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, User, MapPin } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'Global Administrator';
      case 'BASE_COMMANDER':
        return 'Base Commander';
      case 'LOGISTICS_OFFICER':
        return 'Logistics Officer';
      default:
        return role;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'from-rose-500 to-red-600 text-white';
      case 'BASE_COMMANDER':
        return 'from-amber-500 to-amber-600 text-white';
      case 'LOGISTICS_OFFICER':
        return 'from-emerald-500 to-teal-600 text-white';
      default:
        return 'from-slate-500 to-slate-600 text-white';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-white">KRISTALLBALL</h1>
            <p className="text-[10px] font-semibold tracking-widest text-indigo-400">MILITARY ASSET COMMAND</p>
          </div>
        </div>

        {/* User profile controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 border-r border-slate-800 pr-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-white flex items-center justify-end">
                <User className="h-3.5 w-3.5 mr-1 text-slate-400" />
                {user.username}
              </p>
              <div className="flex items-center justify-end space-x-2 mt-0.5">
                {user.baseName && (
                  <span className="inline-flex items-center rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                    <MapPin className="mr-0.5 h-2.5 w-2.5 text-indigo-400" />
                    {user.baseName}
                  </span>
                )}
                <span className={`inline-block rounded bg-gradient-to-r ${getRoleColor(user.role)} px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase`}>
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition duration-150 hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/60"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
