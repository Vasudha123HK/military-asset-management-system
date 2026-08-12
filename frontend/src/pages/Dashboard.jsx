import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { DashboardMetrics } from '../components/DashboardMetrics';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Filter, 
  Calendar, 
  ShieldAlert, 
  RefreshCw, 
  Database,
  Layers
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  
  // Filter states
  const [baseId, setBaseId] = useState(user?.baseId || '');
  const [category, setCategory] = useState('');
  const [equipmentTypeId, setEquipmentTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data states
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [assets, setAssets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch static lookups
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

  // Fetch metrics, assets list, and audit logs
  const fetchData = async () => {
    setRefreshing(true);
    try {
      const activeBase = user?.role === 'BASE_COMMANDER' ? user.baseId : baseId;
      
      const [metricsRes, assetsRes, logsRes] = await Promise.all([
        api.get('/assets/dashboard', {
          params: {
            baseId: activeBase || undefined,
            equipmentTypeId: equipmentTypeId || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined
          }
        }),
        api.get('/assets', {
          params: {
            baseId: activeBase || undefined,
            equipmentTypeId: equipmentTypeId || undefined
          }
        }),
        api.get('/assets/audit-logs')
      ]);

      setMetrics(metricsRes.data);
      setAssets(assetsRes.data);
      setAuditLogs(logsRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [baseId, category, equipmentTypeId, startDate, endDate, user]);

  const handleClearFilters = () => {
    if (user?.role !== 'BASE_COMMANDER') {
      setBaseId('');
    }
    setCategory('');
    setEquipmentTypeId('');
    setStartDate('');
    setEndDate('');
  };

  // Filter equipment types based on selected category
  const filteredEquipmentTypes = category
    ? equipmentTypes.filter(eq => eq.category === category)
    : equipmentTypes;

  // Prepare chart data: group quantity by equipment type name
  const chartData = assets.map(asset => ({
    name: asset.equipment_name,
    quantity: asset.quantity,
    category: asset.equipment_category,
    base: asset.base_name
  }));

  // Prepare Pie Chart data: sum quantity by category
  const categoryDataObj = assets.reduce((acc, curr) => {
    acc[curr.equipment_category] = (acc[curr.equipment_category] || 0) + curr.quantity;
    return acc;
  }, {});

  const pieData = Object.keys(categoryDataObj).map(key => ({
    name: key,
    value: categoryDataObj[key]
  }));

  const COLORS = ['#6366f1', '#eab308', '#f43f5e'];

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h2 className="text-2xl font-black tracking-wide text-white">COMMAND CONTROL BOARD</h2>
          <p className="text-xs text-slate-400">
            Real-time logistical visibility & tactical balance audit trail.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-750 transition"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Live Data</span>
          </button>
        </div>
      </div>

      {/* Interactive Filters Panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div className="flex items-center space-x-2 text-indigo-400 mb-4">
          <Filter className="h-4.5 w-4.5" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Tactical Filters</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Base selector (gated to Commanders) */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Military Base</label>
            <select
              value={user?.role === 'BASE_COMMANDER' ? user.baseId : baseId}
              disabled={user?.role === 'BASE_COMMANDER'}
              onChange={(e) => setBaseId(e.target.value)}
              className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">-- All Bases --</option>
              {bases.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Equipment Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setEquipmentTypeId(''); // Reset equipment type on category switch
              }}
              className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">-- All Categories --</option>
              <option value="WEAPON">WEAPONS</option>
              <option value="VEHICLE">VEHICLES</option>
              <option value="AMMUNITION">AMMUNITION</option>
            </select>
          </div>

          {/* Equipment Type */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Specific Asset</label>
            <select
              value={equipmentTypeId}
              onChange={(e) => setEquipmentTypeId(e.target.value)}
              className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">-- All Types --</option>
              {filteredEquipmentTypes.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name} ({eq.category})</option>
              ))}
            </select>
          </div>

          {/* Date range filters */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center">
                <Calendar className="mr-1 h-3 w-3 text-slate-500" /> Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center">
                <Calendar className="mr-1 h-3 w-3 text-slate-500" /> End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Filter clears */}
        {(baseId || category || equipmentTypeId || startDate || endDate) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClearFilters}
              className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-650 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Metrics summary cards */}
          <DashboardMetrics metrics={metrics} />

          {/* Visual Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Asset stock comparison chart */}
            <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center">
                <Layers className="h-4.5 w-4.5 mr-1.5 text-indigo-400" />
                Asset Inventory Stock Levels
              </h3>
              <div className="h-80 w-full text-slate-300">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      <Bar dataKey="quantity" name="Stock Count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-slate-500">
                    <Database className="h-10 w-10 mb-2 opacity-40" />
                    <span className="text-xs">No active asset inventory registered matching parameters.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Category distribution */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center">
                <ShieldAlert className="h-4.5 w-4.5 mr-1.5 text-amber-400" />
                Stock Distribution
              </h3>
              <div className="h-80 w-full">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-slate-500">
                    <Database className="h-10 w-10 mb-2 opacity-40" />
                    <span className="text-xs">No category data.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tables Row: Inventory & Logs */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Live Inventory List */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
                Current Inventory Register
              </h3>
              <div className="overflow-x-auto max-h-[300px]">
                <table className="min-w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Base</th>
                      <th className="px-4 py-3">Asset Description</th>
                      <th className="px-4 py-3 text-center">Category</th>
                      <th className="px-4 py-3 text-right">Qty Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {assets.map((asset, i) => (
                      <tr key={asset.id || i} className="hover:bg-slate-850/50">
                        <td className="px-4 py-3 font-semibold text-white">{asset.base_name}</td>
                        <td className="px-4 py-3 text-slate-200">{asset.equipment_name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide bg-slate-800">
                            {asset.equipment_category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-indigo-400">{asset.quantity}</td>
                      </tr>
                    ))}
                    {assets.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center py-6 text-slate-500">
                          No items in this base/category.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Audit Log Registry */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
                Command Audit Trail (Last 100 Transactions)
              </h3>
              <div className="overflow-x-auto max-h-[300px]">
                <table className="min-w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3 text-center">Action</th>
                      <th className="px-4 py-3">Transaction Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {auditLogs.map((log, i) => (
                      <tr key={log.id || i} className="hover:bg-slate-850/50">
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-200">{log.username || 'System'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                            log.action === 'PURCHASE' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/60' :
                            log.action === 'TRANSFER' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/60' :
                            log.action === 'ASSIGNMENT' ? 'bg-amber-950 text-amber-400 border border-amber-900/60' :
                            log.action === 'EXPENDITURE' ? 'bg-rose-950 text-rose-400 border border-rose-900/60' :
                            'bg-slate-850 text-slate-400'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{log.details}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center py-6 text-slate-500">
                          Audit trail is empty.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
