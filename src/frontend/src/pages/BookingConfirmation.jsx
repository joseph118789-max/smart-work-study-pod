import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function BookingConfirmation() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [showQR, setShowQR] = useState(false);

  // In a real app, fetch booking by ID
  useEffect(() => {
    // setBooking(data);
  }, [id]);

  if (!booking) return <div>Loading...</div>;

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h2 style={{ color: 'var(--success)', marginBottom: 16 }}>Booking Confirmed!</h2>
      <p>Booking Code: <strong>{booking.booking_code}</strong></p>
      <p>PIN: <strong>{booking.unlock_pin}</strong></p>
      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowQR(true)}>Show QR Code</button>
      {showQR && (
        <div className="qr-modal" onClick={() => setShowQR(false)}>
          <div className="qr-modal-content">
            <h3>Scan to Unlock</h3>
            <div className="qr-code">
              <QRCodeSVG value={booking.unlock_qr_token} size={200} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}