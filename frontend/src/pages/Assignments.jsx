import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { UserCheck, Skull, RefreshCw, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

const Assignments = () => {
  const { user } = useAuth();
  
  // Base configuration
  const defaultBaseId = user?.role === 'BASE_COMMANDER' ? user.baseId : '';
  
  // Dropdown option states
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  
  // Tab/Panel selector: 'ASSIGN' or 'EXPEND'
  const [activeTab, setActiveTab] = useState('ASSIGN');

  // Form states - Assignment
  const [assignBaseId, setAssignBaseId] = useState(defaultBaseId);
  const [assignEquipmentTypeId, setAssignEquipmentTypeId] = useState('');
  const [assignQuantity, setAssignQuantity] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  // Form states - Expenditure
  const [expendBaseId, setExpendBaseId] = useState(defaultBaseId);
  const [expendEquipmentTypeId, setExpendEquipmentTypeId] = useState('');
  const [expendQuantity, setExpendQuantity] = useState('');
  const [reason, setReason] = useState('');

  // Live stock states
  const [assignStock, setAssignStock] = useState(null);
  const [expendStock, setExpendStock] = useState(null);

  // List data states
  const [assignments, setAssignments] = useState([]);
  const [expenditures, setExpenditures] = useState([]);

  // Loaders & feedback messages
  const [loadingLists, setLoadingLists] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch initial lookups
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
        console.error('Failed to load filter metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch live stock level for assignments
  useEffect(() => {
    const fetchAssignStock = async () => {
      if (!assignBaseId || !assignEquipmentTypeId) {
        setAssignStock(null);
        return;
      }
      try {
        const res = await api.get('/assets', {
          params: { baseId: assignBaseId, equipmentTypeId: assignEquipmentTypeId }
        });
        setAssignStock(res.data.length > 0 ? res.data[0].quantity : 0);
      } catch (e) {
        setAssignStock(0);
      }
    };
    fetchAssignStock();
  }, [assignBaseId, assignEquipmentTypeId]);

  // Fetch live stock level for expenditures
  useEffect(() => {
    const fetchExpendStock = async () => {
      if (!expendBaseId || !expendEquipmentTypeId) {
        setExpendStock(null);
        return;
      }
      try {
        const res = await api.get('/assets', {
          params: { baseId: expendBaseId, equipmentTypeId: expendEquipmentTypeId }
        });
        setExpendStock(res.data.length > 0 ? res.data[0].quantity : 0);
      } catch (e) {
        setExpendStock(0);
      }
    };
    fetchExpendStock();
  }, [expendBaseId, expendEquipmentTypeId]);

  // Fetch historical entries
  const fetchLogs = async () => {
    setRefreshing(true);
    try {
      const [assignRes, expendRes] = await Promise.all([
        api.get('/assets/assignments'),
        api.get('/assets/expenditures')
      ]);
      setAssignments(assignRes.data);
      setExpenditures(expendRes.data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoadingLists(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!assignBaseId || !assignEquipmentTypeId || !assignQuantity || parseInt(assignQuantity) <= 0 || !assignedTo) {
      setErrorMsg('Please complete all assignment fields with positive quantity.');
      return;
    }

    if (assignStock !== null && parseInt(assignQuantity) > assignStock) {
      setErrorMsg(`Insufficient stock. Available: ${assignStock}, Requested: ${assignQuantity}`);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/assets/assignments', {
        baseId: parseInt(assignBaseId),
        equipmentTypeId: parseInt(assignEquipmentTypeId),
        quantity: parseInt(assignQuantity),
        assignedTo
      });
      setSuccessMsg(`Successfully assigned ${assignQuantity} items to ${assignedTo}.`);
      setAssignQuantity('');
      setAssignEquipmentTypeId('');
      setAssignedTo('');
      fetchLogs();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to record assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpendSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!expendBaseId || !expendEquipmentTypeId || !expendQuantity || parseInt(expendQuantity) <= 0 || !reason) {
      setErrorMsg('Please complete all expenditure fields with positive quantity.');
      return;
    }

    if (expendStock !== null && parseInt(expendQuantity) > expendStock) {
      setErrorMsg(`Insufficient stock. Available: ${expendStock}, Requested: ${expendQuantity}`);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/assets/expenditures', {
        baseId: parseInt(expendBaseId),
        equipmentTypeId: parseInt(expendEquipmentTypeId),
        quantity: parseInt(expendQuantity),
        reason
      });
      setSuccessMsg(`Successfully logged expenditure of ${expendQuantity} items.`);
      setExpendQuantity('');
      setExpendEquipmentTypeId('');
      setReason('');
      fetchLogs();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to record expenditure.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h2 className="text-2xl font-black tracking-wide text-white">SQUAD ALLOCATIONS & CONSUMPTIONS</h2>
          <p className="text-xs text-slate-400">Deploy assets to active personnel and record spent/consumed ammunition.</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center space-x-1.5 self-start rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-750 transition"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Sync logs</span>
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Operations Panel (Forms) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg h-fit">
          {/* Tab headers */}
          <div className="flex border-b border-slate-850">
            <button
              onClick={() => { setActiveTab('ASSIGN'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-3.5 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 border-r border-slate-850 ${
                activeTab === 'ASSIGN' 
                  ? 'bg-slate-950 text-indigo-400 border-t-2 border-indigo-500' 
                  : 'text-slate-400 hover:bg-slate-850/40 hover:text-white'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>Assign Squad</span>
            </button>
            <button
              onClick={() => { setActiveTab('EXPEND'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-3.5 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 ${
                activeTab === 'EXPEND' 
                  ? 'bg-slate-950 text-rose-500 border-t-2 border-rose-500' 
                  : 'text-slate-400 hover:bg-slate-850/40 hover:text-white'
              }`}
            >
              <Skull className="h-4 w-4" />
              <span>Log Spent</span>
            </button>
          </div>

          <div className="p-6">
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

            {activeTab === 'ASSIGN' ? (
              /* Assign Form */
              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Origin Base</label>
                  <select
                    value={assignBaseId}
                    disabled={user?.role === 'BASE_COMMANDER'}
                    onChange={(e) => setAssignBaseId(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                  >
                    <option value="">-- Select Base --</option>
                    {bases.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Asset Type</label>
                  <select
                    value={assignEquipmentTypeId}
                    onChange={(e) => setAssignEquipmentTypeId(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Select Asset --</option>
                    {equipmentTypes.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.name} [{eq.category}]</option>
                    ))}
                  </select>
                </div>

                {assignBaseId && assignEquipmentTypeId && (
                  <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-850 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Inventory Stock:</span>
                    <span className={`font-bold ${assignStock > 0 ? 'text-indigo-400' : 'text-rose-500'}`}>
                      {assignStock !== null ? `${assignStock} available` : '...'}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Deploy Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={assignQuantity}
                    onChange={(e) => setAssignQuantity(e.target.value)}
                    placeholder="e.g. 5"
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Assigned To (Personnel / Unit)</label>
                  <input
                    type="text"
                    required
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="e.g. Squad Bravo / Captain Miller"
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 flex w-full justify-center rounded-lg bg-indigo-650 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-650/20 hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-650 disabled:opacity-50"
                >
                  {submitting ? 'Recording Deployment...' : 'Authorize Base Deployment'}
                </button>
              </form>
            ) : (
              /* Log Spent Form */
              <form onSubmit={handleExpendSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Origin Base</label>
                  <select
                    value={expendBaseId}
                    disabled={user?.role === 'BASE_COMMANDER'}
                    onChange={(e) => setExpendBaseId(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                  >
                    <option value="">-- Select Base --</option>
                    {bases.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Asset Type</label>
                  <select
                    value={expendEquipmentTypeId}
                    onChange={(e) => setExpendEquipmentTypeId(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Select Asset --</option>
                    {equipmentTypes.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.name} [{eq.category}]</option>
                    ))}
                  </select>
                </div>

                {expendBaseId && expendEquipmentTypeId && (
                  <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-850 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Inventory Stock:</span>
                    <span className={`font-bold ${expendStock > 0 ? 'text-rose-450' : 'text-rose-500'}`}>
                      {expendStock !== null ? `${expendStock} available` : '...'}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Expended Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expendQuantity}
                    onChange={(e) => setExpendQuantity(e.target.value)}
                    placeholder="e.g. 500"
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Reason / Justification</label>
                  <textarea
                    required
                    rows="3"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Live firing drill at range 4 / Combat training exercise"
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 flex w-full justify-center rounded-lg bg-rose-650 py-3 text-xs font-bold text-white shadow-lg shadow-rose-650/20 hover:bg-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-650 disabled:opacity-50"
                >
                  {submitting ? 'Recording Consumption...' : 'Commit Consumption Log'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* History Tables Container */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Assignments List */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4 flex items-center">
              <UserCheck className="h-4.5 w-4.5 mr-1.5" />
              Active Field Assignments Registry
            </h3>

            {loadingLists ? (
              <div className="flex h-24 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-650 border-t-transparent"></div>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[220px]">
                <table className="min-w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Base</th>
                      <th className="px-4 py-2.5">Asset</th>
                      <th className="px-4 py-2.5">Assigned To</th>
                      <th className="px-4 py-2.5 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {assignments.map((a, i) => (
                      <tr key={a.id || i} className="hover:bg-slate-850/50">
                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                          {new Date(a.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-white">{a.base_name}</td>
                        <td className="px-4 py-2.5 text-slate-200">
                          {a.equipment_name}{' '}
                          <span className="text-[9px] font-extrabold text-slate-500 uppercase">
                            [{a.equipment_category}]
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-300 font-semibold">{a.assigned_to}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-amber-400">{a.quantity}</td>
                      </tr>
                    ))}
                    {assignments.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-slate-500">
                          No active deployments registered.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expenditures List */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-4 flex items-center">
              <Skull className="h-4.5 w-4.5 mr-1.5" />
              Consumed / Spent Stock Register
            </h3>

            {loadingLists ? (
              <div className="flex h-24 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-rose-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[220px]">
                <table className="min-w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Base</th>
                      <th className="px-4 py-2.5">Asset</th>
                      <th className="px-4 py-2.5">Justification Reason</th>
                      <th className="px-4 py-2.5 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {expenditures.map((e, i) => (
                      <tr key={e.id || i} className="hover:bg-slate-850/50">
                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                          {new Date(e.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-white">{e.base_name}</td>
                        <td className="px-4 py-2.5 text-slate-200">
                          {e.equipment_name}{' '}
                          <span className="text-[9px] font-extrabold text-slate-500 uppercase">
                            [{e.equipment_category}]
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">{e.reason}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-rose-500">{e.quantity}</td>
                      </tr>
                    ))}
                    {expenditures.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-slate-500">
                          No stock consumption records logged yet.
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
    </div>
  );
};

export default Assignments;
