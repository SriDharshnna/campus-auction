# Campus Auction

A fair, transparent campus marketplace where graduating students auction used items (cycles, calculators, textbooks, electronics, college essentials) to other students.

## Features
- Student item listings with photos, starting price & minimum increments
- Live auctions and real-time countdowns
- Public bidding history with buyer privacy
- Anti-sniping: automatic deadline extensions (last 30s extends by 60s)
- Provisional winner declaration at closing
- Seller approval and recorded campus handover
- Automatic bidding with max limits
- Real-time updates via Socket.IO
- AI assistant for listing guidance & item queries

## Technology Stack
- **Frontend**: React 19 + Vite (Vanilla CSS design system, zero Tailwind)
- **Backend**: Node.js + Express
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT & bcrypt
- **Real-time updates**: Socket.IO

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB running locally or MongoDB Atlas URI

### 1. Installation

Install dependencies for both client and server:

```bash
# Frontend dependencies
cd client
npm install

# Backend dependencies
cd ../server
npm install
```

### 2. Environment Variables

Create `.env` in both `client/` and `server/` using the provided `.env.example` templates:

**Server (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/campus-auction
JWT_SECRET=your_jwt_secret_key_here
```

**Client (`client/.env`):**
```env
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Running Development Servers

You can run both services independently:

```bash
# Run backend (from server directory or root)
npm run server
# -> Express server runs at http://localhost:5000
# -> Health check: http://localhost:5000/api/health

# Run frontend (from client directory or root)
npm run client
# -> Vite dev server runs at http://localhost:5173
```

---

## API Health Check

- **GET `/api/health`**
  - Response:
    ```json
    {
      "status": "ok",
      "message": "Campus Auction API is running",
      "environment": "development",
      "timestamp": "2026-10-28T10:20:00.000Z"
    }
    ```