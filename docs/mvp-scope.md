# MVP Scope — Smart Work-Study Pod Platform

## Core Features (Must Have)

### 1. Public Booking Portal
- Pod location browsing (list + map view)
- Time slot availability calendar
- User registration & login (email + password)
- Booking flow: search → select → confirm
- Booking confirmation with unlock credentials (QR code)
- Email notifications (booking confirmed, reminder)

### 2. Basic Admin Portal
- Pod management (add/edit/deactivate pods)
- Reservation overview and management
- User management (view accounts, roles)
- Dashboard with basic occupancy stats
- Remote lock/unlock override

### 3. Backend API (Core Services)
- Auth service (JWT-based authentication)
- Booking service (reservation engine, double-booking prevention)
- Pod service (CRUD, status management)
- Notification service (email/SMS)
- API Gateway with rate limiting

### 4. Smart Lock Integration
- QR code unlock (primary MVP method)
- PIN unlock (secondary)
- MQTT-based command delivery
- Device heartbeat monitoring
- Offline fallback mechanism

### 5. Database & Infrastructure
- PostgreSQL database (users, bookings, pods, audit logs)
- Redis for sessions and caching
- Docker containerization
- Basic CI/CD pipeline

---

## Out of MVP Scope (Future Phases)

- NFC/Bluetooth unlock (Phase 2)
- Mobile app (Phase 2)
- CCTV integration (Phase 2)
- AI chatbot/WhatsApp support (Phase 2)
- Advanced analytics dashboard (Phase 2)
- Multi-tenant SaaS (Phase 3)

---

## MVP Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Cache | Redis |
| Auth | JWT (self-hosted) |
| IoT | MQTT broker (EMQX) |
| Container | Docker |
| Deployment | Docker Compose |

---

## MVP Resource Estimate

| Role | Estimate |
|------|----------|
| Solution Architect | 5 MD |
| Frontend Dev | 15 MD |
| Backend Dev | 20 MD |
| IoT/Embedded Dev | 10 MD |
| QA | 5 MD |
| **Total** | **55 MD** |

---

## Success Criteria

- [ ] User can browse pods and make a booking
- [ ] User receives QR code to unlock pod
- [ ] Admin can manage pods and view reservations
- [ ] No double-booking occurs under concurrent requests
- [ ] Lock responds to unlock commands within 3 seconds
- [ ] System handles 100 concurrent users

---

*Last updated: 2026-05-16*