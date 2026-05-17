import { useEffect, useState } from 'react';
import api from '../api';

export default function Pods() {
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/pods').then(({ data }) => setPods(data)).catch(console.error).finally(() => setLoading(false)); }, []);

  const handleControl = async (podId, action) => {
    try {
      await api.post(`/admin/pods/${podId}/control`, { action });
      alert(`${action} command sent`);
    } catch (err) {
      alert(`Failed to send ${action} command`);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Manage Pods</h2>
      {loading ? <div>Loading...</div> : (
        <div className="grid grid-2">
          {pods.map(pod => (
            <div key={pod.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong>{pod.name}</strong>
                <span className={`status-badge status-${pod.status === 'available' ? 'available' : pod.status === 'occupied' ? 'occupied' : 'maintenance'}`}>{pod.status}</span>
              </div>
              <p style={{ color: 'var(--text-light)' }}>{pod.location_name}</p>
              <p>Code: {pod.pod_code}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary" onClick={() => handleControl(pod.id, 'unlock')}>Unlock</button>
                <button className="btn btn-secondary" onClick={() => handleControl(pod.id, 'lock')}>Lock</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}