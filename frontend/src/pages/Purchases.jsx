import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ShoppingCart, RefreshCw, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

const Purchases = () => {
  const { user } = useAuth();
  
  // Form states
  const [baseId, setBaseId] = useState(user?.baseId || '');
  const [equipmentTypeId, setEquipmentTypeId] = useState('');
  const [quantity, setQuantity] = useState('');

  // UI state
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Load dropdown lists
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [basesRes, eqRes] = await Promise.all([
          api.get('/assets/bases'),
          api.get('/assets/equipment-types')
        ]);
        setBases(basesRes.data);
        setEquipmentTypes(eqRes.data);
      } catch (err) {
        console.error('Failed to load bases/equipment dropdowns:', err);
      }
    };
    fetchDropdowns();
  }, []);

  // Fetch purchase logs
  const fetchPurchases = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/purchases');
      setPurchases(res.data);
    } catch (err) {
      console.error('Failed to load purchase history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!baseId || !equipmentTypeId || !quantity || parseInt(quantity) <= 0) {
      setErrorMsg('Please specify a valid base, equipment item, and positive quantity.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.post('/purchases', {
        baseId: parseInt(baseId),
        equipmentTypeId: parseInt(equipmentTypeId),
        quantity: parseInt(quantity)
      });

      setSuccessMsg(`Successfully logged purchase of ${quantity} units.`);
      setQuantity('');
      setEquipmentTypeId('');
      
      // Reload history
      fetchPurchases();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit purchase log.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h2 className="text-2xl font-black tracking-wide text-white">ASSET PURCHASING & RECEIVAL</h2>
          <p className="text-xs text-slate-400">Log incoming stock shipments and update local inventory registries.</p>
        </div>
        <button
          onClick={fetchPurchases}
          className="flex items-center space-x-1.5 self-start rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-750 transition"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Sync logs</span>
        </button>
      </div>

      {/* Main Grid: Form Left, History Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Form Container */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg h-fit">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-5 flex items-center">
            <ShoppingCart className="h-4.5 w-4.5 mr-1.5" />
            Log Incoming Shipment
          </h3>

          {successMsg && (
            <div className="mb-4 flex items-center space-x-2 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-4 text-xs font-semibold text-emerald-400">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 flex items-center space-x-2 rounded-lg border border-red-900/60 bg-red-950/20 p-4 text-xs font-semibold text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Target Base selection */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Destination Base</label>
              <select
                value={baseId}
                onChange={(e) => setBaseId(e.target.value)}
                className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Target Base --</option>
                {bases.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
                ))}
              </select>
            </div>

            {/* Equipment selection */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Equipment Type</label>
              <select
                value={equipmentTypeId}
                onChange={(e) => setEquipmentTypeId(e.target.value)}
                className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Equipment Item --</option>
                {equipmentTypes.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.name} [{eq.category}]</option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Shipped Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 50"
                className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 flex w-full justify-center rounded-lg bg-indigo-650 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-650/20 hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {submitting ? 'Updating Ledger...' : 'Commit Purchase Entry'}
            </button>
          </form>
        </div>

        {/* History Table Container */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-5">
            Purchase Log History
          </h3>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-650 border-t-transparent"></div>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[480px]">
              <table className="min-w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Receiving Base</th>
                    <th className="px-4 py-3">Equipment Item</th>
                    <th className="px-4 py-3 text-center">Category</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {purchases.map((p, i) => (
                    <tr key={p.id || i} className="hover:bg-slate-850/50">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap flex items-center">
                        <Calendar className="mr-1 h-3.5 w-3.5 text-slate-500" />
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">{p.base_name}</td>
                      <td className="px-4 py-3 text-slate-200">{p.equipment_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide bg-slate-800">
                          {p.equipment_category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-indigo-400">+{p.quantity}</td>
                    </tr>
                  ))}
                  {purchases.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-slate-500">
                        No purchase records registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default Purchases;
