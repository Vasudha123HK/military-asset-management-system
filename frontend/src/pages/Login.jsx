import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isExpired = searchParams.get('expired') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  const handleQuickLogin = (userRole) => {
    switch (userRole) {
      case 'ADMIN':
        setUsername('admin');
        setPassword('Admin@123');
        break;
      case 'COMMANDER':
        setUsername('commander_a');
        setPassword('Commander@123');
        break;
      case 'LOGISTICS':
        setUsername('logistics_a');
        setPassword('Logistics@123');
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-650 text-white shadow-xl shadow-indigo-650/20">
            <Shield className="h-8 w-8 text-indigo-400" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-black tracking-wider text-white">KRISTALLBALL</h2>
          <p className="mt-1 text-center text-xs font-bold tracking-widest text-indigo-400 uppercase">
            Military Asset Management Command
          </p>
        </div>

        {/* Info alerts */}
        {isExpired && (
          <div className="flex items-center space-x-2 rounded-lg border border-amber-900/60 bg-amber-950/20 p-4 text-xs font-semibold text-amber-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Session expired or unauthorized. Please authenticate.</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 rounded-lg border border-red-900/60 bg-red-950/20 p-4 text-xs font-semibold text-red-400 animate-shake">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter credential ID"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition duration-150 hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {loading ? 'Authenticating Command...' : 'Authorize Secure Session'}
            </button>
          </div>
        </form>

        {/* Demo Accounts Panel */}
        <div className="mt-8 border-t border-slate-800 pt-6">
          <p className="text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
            Quick Logins / Demo Access
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('ADMIN')}
              className="rounded bg-slate-800 py-2 text-[10px] font-bold text-rose-400 border border-slate-700/60 hover:bg-slate-700 transition"
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickLogin('COMMANDER')}
              className="rounded bg-slate-800 py-2 text-[10px] font-bold text-amber-400 border border-slate-700/60 hover:bg-slate-700 transition"
            >
              Commander
            </button>
            <button
              onClick={() => handleQuickLogin('LOGISTICS')}
              className="rounded bg-slate-800 py-2 text-[10px] font-bold text-emerald-400 border border-slate-700/60 hover:bg-slate-700 transition"
            >
              Logistics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
