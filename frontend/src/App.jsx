import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Purchases from './pages/Purchases';
import Transfers from './pages/Transfers';
import Assignments from './pages/Assignments';
import { ShieldAlert } from 'lucide-react';

// Loading Screen while verifying JWT on startup
const StartupLoader = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-650 text-white shadow-xl shadow-indigo-650/20 mb-4 animate-pulse">
      <ShieldAlert className="h-6 w-6 text-indigo-400" />
    </div>
    <p className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Synchronizing Command Security...</p>
  </div>
);

// Protected Layout Route wrapper
const ProtectedLayout = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <StartupLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950">
      {/* Top Navigation */}
      <Navbar />
      
      {/* Sidebar + Main content container */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public login route */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route element={<ProtectedLayout allowedRoles={['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          <Route element={<ProtectedLayout allowedRoles={['ADMIN', 'LOGISTICS_OFFICER']} />}>
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/transfers" element={<Transfers />} />
          </Route>

          <Route element={<ProtectedLayout allowedRoles={['ADMIN', 'BASE_COMMANDER']} />}>
            <Route path="/assignments" element={<Assignments />} />
          </Route>

          {/* Fallback routes */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
