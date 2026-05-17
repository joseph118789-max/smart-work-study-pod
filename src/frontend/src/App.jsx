import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Locations from './pages/Locations';
import PodDetails from './pages/PodDetails';
import MyBookings from './pages/MyBookings';
import BookingConfirmation from './pages/BookingConfirmation';

function App() {
  const [token, setToken] = useState(localStorage.getItem('swp_token'));

  const handleLogin = (newToken) => {
    localStorage.setItem('swp_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('swp_token');
    setToken(null);
  };

  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1>Smart Work-Study Pod</h1>
          {token && <button onClick={handleLogout}>Logout</button>}
        </header>
        <main>
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onLogin={handleLogin} />} />
            <Route path="/" element={token ? <Home /> : <Login onLogin={handleLogin} />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/locations/:id" element={<PodDetails />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/booking/:id" element={<BookingConfirmation />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;