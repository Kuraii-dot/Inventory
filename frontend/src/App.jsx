// frontend/src/App.jsx

import { useEffect } from 'react';
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
import InspectionRequests from './pages/InspectionRequests.jsx';

function AppCloseWarning() {
  useEffect(() => {
    if (!window.__TAURI_INTERNALS__) return undefined;

    let disposed = false;
    let unlisten;
    import('@tauri-apps/api/window')
      .then(async ({ getCurrentWindow }) => {
        const appWindow = getCurrentWindow();
        let forceClosing = false;
        const stopListening = await appWindow.onCloseRequested(async event => {
          // Pause Tauri's original close request while the user decides. Calling
          // destroy() after confirmation bypasses this listener, so the dialog
          // cannot reopen or leave the window stuck in a pending-close state.
          event.preventDefault();
          if (forceClosing) return;

          const confirmed = window.confirm(
            'Close Smart Inventory?\n\nAny information that has not been submitted or saved will be lost.'
          );
          if (!confirmed) return;

          forceClosing = true;
          try {
            await appWindow.destroy();
          } catch (error) {
            forceClosing = false;
            console.error('Unable to close Smart Inventory:', error);
            window.alert('Smart Inventory could not close. Please try again.');
          }
        });
        if (disposed) stopListening();
        else unlisten = stopListening;
      })
      .catch(error => console.error('Unable to install close warning:', error));

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppCloseWarning />
      <AuthProvider>
        {/* Navbar renders on every page — hides itself on /login via user check */}
        <Navbar />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/"      element={<Navigate to="/login" replace />} />

          {/* Protected */}
          <Route path="/dashboard"     element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/items"         element={<ProtectedRoute><Items /></ProtectedRoute>} />
          <Route path="/allitems"      element={<ProtectedRoute><AllItems /></ProtectedRoute>} />
          <Route path="/allocation"    element={<ProtectedRoute><Allocation /></ProtectedRoute>} />
          <Route path="/distributions" element={<ProtectedRoute><Distributions /></ProtectedRoute>} />
          <Route path="/inspection-requests" element={<ProtectedRoute><InspectionRequests /></ProtectedRoute>} />
          <Route path="/admin"         element={<ProtectedRoute><Admin /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
