import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Truck, RefreshCw, CheckCircle, AlertCircle, Calendar, ArrowRight } from 'lucide-react';

const Transfers = () => {
  const { user } = useAuth();

  // Form states
  const [sourceBaseId, setSourceBaseId] = useState(user?.baseId || '');
  const [destinationBaseId, setDestinationBaseId] = useState('');
  const [equipmentTypeId, setEquipmentTypeId] = useState('');
  const [quantity, setQuantity] = useState('');

  // UI state
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [availableStock, setAvailableStock] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Load dropdown lists
  useEffect(() => {
    const fetchMetadata = async () => {
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
    fetchMetadata();
  }, []);

  // Fetch transfer logs
  const fetchTransfers = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/transfers');
      setTransfers(res.data);
    } catch (err) {
      console.error('Failed to load transfer logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  // Fetch live available stock when source base or equipment type changes
  useEffect(() => {
    const fetchStock = async () => {
      if (!sourceBaseId || !equipmentTypeId) {
        setAvailableStock(null);
        return;
      }
      setStockLoading(true);
      try {
        const res = await api.get('/assets', {
          params: {
            baseId: sourceBaseId,
            equipmentTypeId: equipmentTypeId
          }
        });
        if (res.data.length > 0) {
          setAvailableStock(res.data[0].quantity);
        } else {
          setAvailableStock(0);
        }
      } catch (err) {
        console.error('Failed to load live stock level:', err);
        setAvailableStock(0);
      } finally {
        setStockLoading(false);
      }
    };

    fetchStock();
  }, [sourceBaseId, equipmentTypeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!sourceBaseId || !destinationBaseId || !equipmentTypeId || !quantity || parseInt(quantity) <= 0) {
      setErrorMsg('Please select source base, destination base, equipment type, and enter a valid quantity.');
      return;
    }

    if (parseInt(sourceBaseId) === parseInt(destinationBaseId)) {
      setErrorMsg('Source base and destination base cannot be the same.');
      return;
    }

    if (availableStock !== null && parseInt(quantity) > availableStock) {
      setErrorMsg(`Insufficient stock at source base. Available: ${availableStock}, Requested: ${quantity}`);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.post('/transfers', {
        sourceBaseId: parseInt(sourceBaseId),
        destinationBaseId: parseInt(destinationBaseId),
        equipmentTypeId: parseInt(equipmentTypeId),
        quantity: parseInt(quantity)
      });

      setSuccessMsg(`Successfully transferred ${quantity} units.`);
      setQuantity('');
      setEquipmentTypeId('');
      setAvailableStock(null);
      
      // Reload history
      fetchTransfers();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to execute asset transfer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h2 className="text-2xl font-black tracking-wide text-white">CROSS-BASE ASSET TRANSFERS</h2>
          <p className="text-xs text-slate-400">Atomic relocation of equipment stock between bases with automated logging.</p>
        </div>
        <button
          onClick={fetchTransfers}
          className="flex items-center space-x-1.5 self-start rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-750 transition"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Sync logs</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Form Container */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg h-fit">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-5 flex items-center">
            <Truck className="h-4.5 w-4.5 mr-1.5" />
            Initiate Logistics Transfer
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
            {/* Source Base */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Source Base (From)</label>
              <select
                value={sourceBaseId}
                onChange={(e) => setSourceBaseId(e.target.value)}
                className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Source Base --</option>
                {bases.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
                ))}
              </select>
            </div>

            {/* Destination Base */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Destination Base (To)</label>
              <select
                value={destinationBaseId}
                onChange={(e) => setDestinationBaseId(e.target.value)}
                className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Destination Base --</option>
                {bases.map(b => (
                  // Disable source base in destination select
                  <option key={b.id} value={b.id} disabled={parseInt(b.id) === parseInt(sourceBaseId)}>
                    {b.name} ({b.location})
                  </option>
                ))}
              </select>
            </div>

            {/* Equipment Selection */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Asset Type</label>
              <select
                value={equipmentTypeId}
                onChange={(e) => setEquipmentTypeId(e.target.value)}
                className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Asset Type --</option>
                {equipmentTypes.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.name} [{eq.category}]</option>
                ))}
              </select>
            </div>

            {/* Live Stock Level Indicator */}
            {sourceBaseId && equipmentTypeId && (
              <div className="rounded-lg bg-slate-950 p-3 border border-slate-850 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Live Stock Available:</span>
                {stockLoading ? (
                  <span className="text-slate-500 italic">loading...</span>
                ) : (
                  <span className={`font-black ${availableStock > 0 ? 'text-indigo-400' : 'text-rose-500'}`}>
                    {availableStock} units
                  </span>
                )}
              </div>
            )}

            {/* Transfer Quantity */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Transfer Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 10"
                className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || stockLoading}
              className="mt-6 flex w-full justify-center rounded-lg bg-emerald-650 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-650/20 hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-650 disabled:opacity-50"
            >
              {submitting ? 'Transferring Stock...' : 'Confirm Stock Transfer'}
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-5">
            Transfer Logs Registry
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
                    <th className="px-4 py-3 text-center">Movement Routing</th>
                    <th className="px-4 py-3">Asset Transferred</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {transfers.map((t, i) => (
                    <tr key={t.id || i} className="hover:bg-slate-850/50">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap flex items-center">
                        <Calendar className="mr-1 h-3.5 w-3.5 text-slate-500" />
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center space-x-1.5">
                          <span className="font-semibold text-white">{t.source_base_name}</span>
                          <ArrowRight className="h-3 w-3 text-slate-500" />
                          <span className="font-semibold text-white">{t.destination_base_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {t.equipment_name}{' '}
                        <span className="text-[9px] font-extrabold text-slate-500 uppercase">
                          [{t.equipment_category}]
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-400">{t.quantity}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide bg-emerald-950/20 text-emerald-400 border border-emerald-900/60">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {transfers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-slate-500">
                        No base transfer operations recorded.
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

export default Transfers;
