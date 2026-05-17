import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { locationsAPI, podsAPI } from '../api';

export default function Home() {
  const [locations, setLocations] = useState([]);
  const [stats, setStats] = useState({ availablePods: 0, myBookings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await locationsAPI.list();
        setLocations(data);
        
        const podRes = await podsAPI.list();
        setStats({ 
          availablePods: podRes.data.filter(p => p.status === 'available').length,
          myBookings: 0 
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="grid grid-3" style={{ marginBottom: 32 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', color: 'var(--primary)' }}>{locations.length}</h3>
          <p>Locations</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', color: 'var(--success)' }}>{stats.availablePods}</h3>
          <p>Available Pods</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', color: 'var(--warning)' }}>
            <Link to="/my-bookings" style={{ color: 'inherit' }}>{stats.myBookings}</Link>
          </h3>
          <p>My Bookings</p>
        </div>
      </div>

      <h2 style={{ marginBottom: 16 }}>Browse Locations</h2>
      <div className="grid grid-2">
        {locations.map(loc => (
          <Link key={loc.id} to={`/locations/${loc.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card location-card">
              <div>
                <h3>{loc.name}</h3>
                <p>{loc.address}, {loc.city}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="status-badge status-available">{loc.pod_count} pods</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}