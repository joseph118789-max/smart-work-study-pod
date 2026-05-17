# Smart Work-Study Pod Platform

A microservice-based platform for booking private study/work pods with IoT smart lock integration, real-time monitoring, and QR/PIN access.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTS                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Web App    │  │ Admin Portal │  │  Mobile App  │       │
│  │  (React)     │  │  (React)     │  │   (Future)   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘       │
│         │                 │                                  │
│         └────────┬────────┘                                  │
│                  │ /api                                       │
│         ┌────────▼────────┐                                   │
│         │  API Gateway    │                                   │
│         │   (Express)     │                                   │
│         └────────┬────────┘                                   │
│                  │                                           │
│    ┌─────────────┼─────────────┐                              │
│    │             │             │                              │
│    ▼             ▼             ▼                              │
│ ┌──────┐   ┌──────────┐   ┌─────────┐                         │
│ │Auth  │   │ Booking  │   │  Pods   │                         │
│ │Route │   │  Route   │   │ Route   │                         │
│ └──────┘   └──────────┘   └─────────┘                         │
│                                                             │
│         ┌─────────────────────────────────┐                  │
│         │           MQTT Broker           │                  │
│         │          (EMQX 5.3)             │                  │
│         └────────────────┬──────────────┘                  │
│                          │                                   │
│         ┌────────────────▼──────────────┐                    │
│         │    IoT Edge Controller        │                    │
│         │     (ESP32 + PlatformIO)     │                    │
│         │    ┌────────────────────┐    │                    │
│         │    │  Smart Lock Relay  │    │                    │
│         │    │  QR Code Reader    │    │                    │
│         │    │  Status LED        │    │                    │
│         │    │  Door Sensor      │    │                    │
│         │    └────────────────────┘    │                    │
│         └──────────────────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                            │
│  ┌──────────────┐              ┌──────────────┐             │
│  │  PostgreSQL  │              │    Redis     │             │
│  │    (16)      │              │    (7)       │             │
│  │  Primary DB  │              │   Sessions   │             │
│  └──────────────┘              └──────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local dev)

### 1. Start Infrastructure
```bash
cd infra/docker
docker-compose up -d

# Verify services
docker-compose ps
```

### 2. Start Backend
```bash
cd src/backend
npm install
npm run dev
```

### 3. Start Frontend (new terminal)
```bash
cd src/frontend
npm install
npm run dev
```

### 4. Start Admin Portal (new terminal)
```bash
cd src/admin-portal
npm install
npm run dev
```

### 5. Access Services
- **Web App:** http://localhost:3001
- **Admin Portal:** http://localhost:3002
- **MQTT Dashboard:** http://localhost:18083 (admin/public)

## 📁 Project Structure

```
smart-work-study-pod/
├── package.json              # Monorepo workspaces
├── docker-compose.yml        # Full stack (prod-like)
├── README.md
│
├── docs/
│   └── mvp-scope.md          # MVP scope document
│
├── infra/
│   ├── docker/
│   │   └── docker-compose.yml # Dev infrastructure
│   └── terraform/
│       └── main.tf           # AWS EKS + RDS + ElastiCache
│
├── k8s/
│   └── deployment.yaml       # Kubernetes manifests
│
└── src/
    ├── backend/              # Express API (port 3000)
    │   ├── db/schema.sql     # PostgreSQL schema
    │   ├── Dockerfile
    │   └── src/
    │       ├── index.js     # App entry point
    │       ├── routes/      # API routes
    │       │   ├── auth.js
    │       │   ├── booking.js
    │       │   ├── pods.js
    │       │   ├── locations.js
    │       │   └── admin.js
    │       └── middleware/
    │           ├── auth.js
    │           └── errorHandler.js
    │
    ├── frontend/            # React app (port 3001)
    │   ├── Dockerfile
    │   ├── nginx.conf
    │   └── src/
    │       ├── App.jsx
    │       ├── api/index.js
    │       └── pages/
    │           ├── Home.jsx
    │           ├── Locations.jsx
    │           ├── PodDetails.jsx
    │           ├── MyBookings.jsx
    │           ├── Login.jsx
    │           ├── Register.jsx
    │           └── BookingConfirmation.jsx
    │
    ├── admin-portal/        # React admin (port 3002)
    │   ├── Dockerfile
    │   └── src/
    │       ├── AdminApp.jsx
    │       └── pages/
    │           ├── Dashboard.jsx
    │           ├── Bookings.jsx
    │           ├── Pods.jsx
    │           └── AdminLogin.jsx
    │
    └── iot-firmware/        # ESP32 PlatformIO
        ├── platformio.ini
        └── src/main.cpp     # MQTT lock controller
```

## 🔐 Default Credentials (Dev)

| Service | Username | Password |
|---------|----------|----------|
| MQTT Dashboard | admin | public |
| Admin User | admin@swp.com | admin123 |
| Regular User | user@example.com | user123 |

## 📡 MQTT Topics

| Topic | Direction | Description |
|-------|-----------|-------------|
| `pod/{id}/unlock` | API → Device | Unlock command |
| `pod/{id}/lock` | API → Device | Lock command |
| `pod/{id}/status` | Device → API | Status update |
| `pod/{id}/heartbeat` | Device → API | Device heartbeat |
| `pod/{id}/unlock/token` | API → Device | QR token delivery |

## 🗄️ Database Schema

**Tables:**
- `users` - User accounts with roles
- `locations` - Pod locations (campus/building)
- `pods` - Individual pods per location
- `bookings` - Reservations with unlock credentials
- `time_slots` - Configurable booking windows
- `audit_logs` - Security & activity logs
- `iot_devices` - IoT device registry
- `notifications` - Push/email notification queue

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router |
| Backend | Node.js, Express, JWT |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Message Broker | EMQX 5.3 (MQTT) |
| IoT | ESP32, PlatformIO, MQTT |
| Container | Docker Compose |
| Orchestration | Kubernetes (AWS EKS) |
| Infrastructure | Terraform (AWS) |

## 🔧 Environment Variables

```env
# Backend
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swp_db
DB_USER=swp_user
DB_PASSWORD=swp_password
REDIS_URL=redis://localhost:6379
MQTT_BROKER=localhost:1883
JWT_SECRET=your-secret-key

# Frontend
VITE_API_URL=http://localhost:3000/api
```

## 🚢 Deployment

### Docker Compose (Production-like)
```bash
JWT_SECRET=your-secret docker-compose up -d
```

### Kubernetes
```bash
kubectl apply -f k8s/deployment.yaml
```

### AWS (Terraform)
```bash
cd infra/terraform
terraform init
terraform plan -var="db_password=your-db-password"
terraform apply -var="db_password=your-db-password"
```

## 📋 API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Bookings
- `GET /api/bookings/slots?podId=&date=` - Get available slots
- `POST /api/bookings` - Create booking
- `GET /api/bookings/my` - Get user's bookings
- `PATCH /api/bookings/:id/cancel` - Cancel booking

### Pods
- `GET /api/pods` - List pods
- `GET /api/pods/:id` - Get pod details
- `POST /api/pods/:id/unlock` - Unlock pod (QR/PIN)

### Locations
- `GET /api/locations` - List locations
- `GET /api/locations/:id` - Get location with pods

### Admin
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/admin/bookings` - All bookings
- `POST /api/admin/pods` - Create pod
- `POST /api/admin/pods/:id/control` - Remote lock/unlock

## 📐 IoT Firmware Flash

```bash
cd src/iot-firmware
pio run --target upload
pio device monitor
```

## 📄 License

Private - All rights reserved