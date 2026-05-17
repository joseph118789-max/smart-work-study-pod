import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="grid grid-3" style={{ marginBottom: 32 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', color: 'var(--primary)' }}>{stats?.todayBookings || 0}</h3>
          <p>Today's Bookings</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', color: 'var(--success)' }}>{stats?.totalPods || 0}</h3>
          <p>Total Pods</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', color: 'var(--warning)' }}>{stats?.activeUsers || 0}</h3>
          <p>Active Users</p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Recent Bookings</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
            <th>Code</th><th>User</th><th>Pod</th><th>Time</th><th>Status</th>
          </tr></thead>
          <tbody>
            {stats?.recentBookings?.map(b => (
              <tr key={b.booking_code} style={{ borderBottom: '1px solid var(--border)' }}>
                <td>{b.booking_code}</td>
                <td>{b.full_name}</td>
                <td>{b.pod_name}</td>
                <td>{new Date(b.start_time).toLocaleString()}</td>
                <td><span className={`status-badge status-${b.status === 'confirmed' ? 'available' : 'maintenance'}`}>{b.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Link to="/bookings" className="btn btn-primary">View All Bookings</Link>
        <Link to="/pods" className="btn btn-secondary">Manage Pods</Link>
      </div>
    </div>
  );
}