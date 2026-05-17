import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingsAPI } from '../api';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { data } = await bookingsAPI.my();
        setBookings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await bookingsAPI.cancel(id);
      setBookings(bookings.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    } catch (err) {
      alert('Failed to cancel booking');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>My Bookings</h2>
      {bookings.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>No bookings yet. 
            <Link to="/locations"> Browse locations to book a pod.</Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-2">
          {bookings.map(booking => (
            <div key={booking.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong>{booking.pod_name}</strong>
                <span className={`status-badge status-${booking.status === 'confirmed' ? 'available' : 'maintenance'}`}>
                  {booking.status}
                </span>
              </div>
              <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{booking.location_name}</p>
              <p>{new Date(booking.start_time).toLocaleString()} - {new Date(booking.end_time).toLocaleTimeString()}</p>
              <p style={{ marginTop: 8 }}>Code: {booking.booking_code}</p>
              {booking.status === 'confirmed' && (
                <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => handleCancel(booking.id)}>
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}