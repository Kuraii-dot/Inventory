// frontend/src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }  from './context/AuthContext.jsx';
import ProtectedRoute    from './components/ProtectedRoute.jsx';
import Navbar            from './components/Navbar.jsx';
import Login             from './pages/Login.jsx';
import Dashboard         from './pages/Dashboard.jsx';
import Items             from './pages/Items.jsx';
import AllItems          from './pages/AllItems.jsx';
import Allocation        from './pages/Allocation.jsx';
import Distributions     from './pages/Distributions.jsx';
import Admin             from './pages/Admin.jsx';
import Feature           from './pages/Feature.jsx';
import AssetQr           from './pages/AssetQr.jsx';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        {/* Navbar renders on every page — hides itself on /login via user check */}
        <Navbar />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/asset/:token" element={<AssetQr />} />
          <Route path="/"      element={<Navigate to="/login" replace />} />

          {/* Protected */}
          <Route path="/dashboard"     element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/items"         element={<ProtectedRoute><Items /></ProtectedRoute>} />
          <Route path="/allitems"      element={<ProtectedRoute><AllItems /></ProtectedRoute>} />
          <Route path="/allocation"    element={<ProtectedRoute><Allocation /></ProtectedRoute>} />
          <Route path="/distributions" element={<ProtectedRoute><Distributions /></ProtectedRoute>} />
          <Route path="/feature"       element={<ProtectedRoute><Feature /></ProtectedRoute>} />
          <Route path="/admin"         element={<ProtectedRoute><Admin /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
