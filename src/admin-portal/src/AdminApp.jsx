import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Pods from './pages/Pods';
import AdminLogin from './pages/AdminLogin';

function AdminApp() {
  const [token, setToken] = useState(localStorage.getItem('swp_admin_token'));

  const handleLogin = (newToken) => {
    localStorage.setItem('swp_admin_token', newToken);
    setToken(newToken);
  };

  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1>SWP Admin Portal</h1>
          {token && <button onClick={() => { localStorage.removeItem('swp_admin_token'); setToken(null); }}>Logout</button>}
        </header>
        <main>
          <Routes>
            <Route path="/login" element={<AdminLogin onLogin={handleLogin} />} />
            <Route path="/" element={token ? <Dashboard /> : <AdminLogin onLogin={handleLogin} />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/pods" element={<Pods />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default AdminApp;