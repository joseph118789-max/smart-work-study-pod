import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { locationsAPI, podsAPI, bookingsAPI } from '../api';
import { QRCodeSVG } from 'qrcode.react';

export default function PodDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [selectedPod, setSelectedPod] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const locRes = await locationsAPI.get(id);
        setLocation(locRes.data);
        if (locRes.data.pods?.length > 0) {
          setSelectedPod(locRes.data.pods[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedPod) return;
      try {
        const { data } = await podsAPI.getSlots(selectedPod.id, selectedDate);
        setSlots(data.slots || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSlots();
  }, [selectedPod, selectedDate]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    try {
      const { data } = await bookingsAPI.create({
        podId: selectedPod.id,
        locationId: id,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end
      });
      setBooking(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Booking failed');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!location) return <div>Location not found</div>;

  return (
    <div>
      <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ marginBottom: 16 }}>&larr; Back</button>
      
      <div className="card">
        <h2>{location.name}</h2>
        <p>{location.address}</p>
        <p>{location.city}, {location.state}</p>
      </div>

      {!booking ? (
        <>
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Select Pod</h3>
            <div className="pod-list">
              {location.pods.map(pod => (
                <div key={pod.id} className="pod-item">
                  <div>
                    <strong>{pod.name}</strong>
                    <span className={`status-badge status-${pod.status === 'available' ? 'available' : pod.status === 'occupied' ? 'occupied' : 'maintenance'}`} style={{ marginLeft: 8 }}>
                      {pod.status}
                    </span>
                  </div>
                  <button className="btn btn-secondary" onClick={() => setSelectedPod(pod)}>Select</button>
                </div>
              ))}
            </div>
          </div>

          {selectedPod && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Select Time Slot</h3>
              <div style={{ marginBottom: 16 }}>
                <label>Date</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="slot-grid">
                {slots.map((slot, i) => (
                  <div key={i} className={`slot ${slot.available ? 'available' : 'booked'} ${selectedSlot?.start === slot.start ? 'selected' : ''}`}
                    onClick={() => slot.available && setSelectedSlot(slot)}>
                    {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                ))}
              </div>
              {selectedSlot && (
                <button className="btn btn-primary" onClick={handleBook} style={{ width: '100%', marginTop: 16 }}>
                  Book {new Date(selectedSlot.start).toLocaleDateString()} {new Date(selectedSlot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--success)', marginBottom: 16 }}>Booking Confirmed!</h2>
          <p>Booking Code: <strong>{booking.booking_code}</strong></p>
          <p>PIN: <strong>{booking.unlock_pin}</strong></p>
          <p>Valid: {new Date(booking.start_time).toLocaleString()} - {new Date(booking.end_time).toLocaleString()}</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowQR(true)}>Show QR Code</button>
        </div>
      )}

      {showQR && booking && (
        <div className="qr-modal" onClick={() => setShowQR(false)}>
          <div className="qr-modal-content">
            <h3>Scan to Unlock</h3>
            <div className="qr-code">
              <QRCodeSVG value={booking.unlock_qr_token} size={200} />
              <p style={{ marginTop: 8 }}>Token: {booking.unlock_qr_token.slice(0, 8)}...</p>
            </div>
            <button className="btn btn-secondary" onClick={() => setShowQR(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}