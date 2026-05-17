import { useEffect, useState } from 'react';
import api from '../api';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({});

  useEffect(() => {
    api.get('/admin/bookings', { params: filter }).then(({ data }) => setBookings(data)).catch(console.error).finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>All Bookings</h2>
      <div className="card" style={{ marginBottom: 16 }}>
        <label>Filter by Status</label>
        <select onChange={e => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {loading ? <div>Loading...</div> : (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th>Code</th><th>User</th><th>Pod</th><th>Location</th><th>Start</th><th>End</th><th>Status</th>
            </tr></thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td>{b.booking_code}</td>
                  <td>{b.full_name}<br/><small>{b.email}</small></td>
                  <td>{b.pod_name}</td>
                  <td>{b.location_name}</td>
                  <td>{new Date(b.start_time).toLocaleString()}</td>
                  <td>{new Date(b.end_time).toLocaleString()}</td>
                  <td><span className={`status-badge status-${b.status === 'confirmed' ? 'available' : 'maintenance'}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}