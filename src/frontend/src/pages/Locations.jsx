import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { locationsAPI } from '../api';

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data } = await locationsAPI.list();
        setLocations(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>All Locations</h2>
      <div className="grid grid-2">
        {locations.map(loc => (
          <Link key={loc.id} to={`/locations/${loc.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card location-card">
              <div>
                <h3>{loc.name}</h3>
                <p>{loc.address}, {loc.city}</p>
              </div>
              <span className="status-badge status-available">{loc.pod_count} pods</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}