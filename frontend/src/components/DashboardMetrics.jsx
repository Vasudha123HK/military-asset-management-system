import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShoppingCart, 
  TrendingUp, 
  Archive, 
  UserCheck, 
  Skull, 
  ShieldCheck, 
  X 
} from 'lucide-react';

export const DashboardMetrics = ({ metrics }) => {
  const [showModal, setShowModal] = useState(false);

  // Safe defaults if metrics are missing
  const data = {
    openingBalance: metrics?.openingBalance || 0,
    netMovement: metrics?.netMovement || 0,
    purchases: metrics?.purchases || 0,
    transfersIn: metrics?.transfersIn || 0,
    transfersOut: metrics?.transfersOut || 0,
    assigned: metrics?.assigned || 0,
    expended: metrics?.expended || 0,
    closingBalance: metrics?.closingBalance || 0
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Opening Balance */}
        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Opening Balance</p>
              <h4 className="mt-2 text-3xl font-extrabold text-white">{data.openingBalance}</h4>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Archive className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <span>Starting inventory for selected parameters</span>
          </div>
        </div>

        {/* Card 2: Net Movement (Interactive Card) */}
        <div 
          onClick={() => setShowModal(true)} 
          className="group relative overflow-hidden rounded-xl border border-emerald-800/60 bg-slate-900 p-5 shadow-lg cursor-pointer hover:bg-slate-850 hover:border-emerald-500 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-400 transition-colors">
                Net Movement <span className="text-[9px] lowercase font-normal">(click for info)</span>
              </p>
              <h4 className={`mt-2 text-3xl font-extrabold ${data.netMovement >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.netMovement >= 0 ? `+${data.netMovement}` : data.netMovement}
              </h4>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-emerald-500">
            <span>Purchases & transfers log</span>
          </div>
        </div>

        {/* Card 3: Assigned & Expended */}
        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Deployed & Spent</p>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-xl font-extrabold text-amber-400" title="Assigned to personnel">
                  {data.assigned} <span className="text-xs font-semibold text-slate-500">active</span>
                </span>
                <span className="text-slate-700">|</span>
                <span className="text-xl font-extrabold text-rose-500" title="Expended/spent">
                  {data.expended} <span className="text-xs font-semibold text-slate-500">spent</span>
                </span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <span>Allocated to squad or expended</span>
          </div>
        </div>

        {/* Card 4: Closing Balance */}
        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Closing Balance</p>
              <h4 className="mt-2 text-3xl font-extrabold text-white">{data.closingBalance}</h4>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <span>Closing balance at selected date</span>
          </div>
        </div>
      </div>

      {/* Net Movement Detail Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-850 px-6 py-4">
              <h3 className="text-base font-bold text-white">Net Movement Breakdown</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center bg-slate-850/50 p-3 rounded-lg border border-slate-800/40">
                <span className="text-sm text-slate-300 flex items-center">
                  <ShoppingCart className="h-4 w-4 mr-2 text-indigo-400" />
                  Purchases (+)
                </span>
                <span className="text-base font-bold text-indigo-400">+{data.purchases}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-850/50 p-3 rounded-lg border border-slate-800/40">
                <span className="text-sm text-slate-300 flex items-center">
                  <ArrowDownLeft className="h-4 w-4 mr-2 text-emerald-400" />
                  Transfers In (+)
                </span>
                <span className="text-base font-bold text-emerald-400">+{data.transfersIn}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-850/50 p-3 rounded-lg border border-slate-800/40">
                <span className="text-sm text-slate-300 flex items-center">
                  <ArrowUpRight className="h-4 w-4 mr-2 text-rose-500" />
                  Transfers Out (-)
                </span>
                <span className="text-base font-bold text-rose-400">-{data.transfersOut}</span>
              </div>

              <hr className="border-slate-800 my-2" />

              <div className="flex justify-between items-center bg-indigo-950/20 border border-indigo-900/60 p-4 rounded-lg">
                <span className="text-sm font-bold text-indigo-300">Total Net Movement</span>
                <span className={`text-lg font-black ${data.netMovement >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {data.netMovement >= 0 ? `+${data.netMovement}` : data.netMovement}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition"
              >
                Close Metrics Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
