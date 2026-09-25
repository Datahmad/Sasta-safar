# 🚗 Sasta Safar — Smart Route & Fuel Cost App

A modern, responsive, full-stack MERN application that integrates **100% Free OpenStreetMap & React-Leaflet** for real-time routing, comparing **Fastest vs Shortest** routes, pinpointing origins & destinations, and calculating accurate **fuel consumption and costs**.

---

## ✨ Features

1. **Free Map & Route Integration (Zero API Keys or Hidden Costs)**:
   - Powered by **OpenStreetMap** and **React-Leaflet**.
   - Driving routing engine powered by **OSRM (Open Source Routing Machine)**.
   - Geocoding and search powered by **Nominatim**.
   - GPS "My Current Location" button for instant origin detection.
   - Interactive map clicking: click anywhere on the map to set Origin (A) or Destination (B).

2. **Smart Route Comparison (Fastest vs Shortest)**:
   - Computes both **Fastest Route** (speed & highway optimized) and **Shortest Route** (lowest distance in km).
   - Side-by-side comparison cards showing distances, travel durations, and delta differences.
   - Highlighted multi-color interactive polylines on the map.
   - Full **turn-by-turn navigation drawer** with maneuver icons and street names.

3. **Accurate Vehicle Fuel & Cost Calculator**:
   - Asks for **Vehicle Fuel Average (km per Liter)** with instant L/km conversions.
   - One-click vehicle presets: Motorcycle (35 km/L), Economy/Hybrid (20 km/L), Sedan (14 km/L), SUV (10 km/L), Truck/Van (6 km/L).
   - Asks for **Current Fuel Price** per liter with multi-currency support (`$`, `€`, `£`, `Rs`, `₹`, `AED`, `CAD`, `AUD`).
   - Round trip (2x return journey) toggle.
   - Carpool split calculator (divides total fuel bill between 1 to 5 passengers).
   - Direct savings calculator showing exactly how much fuel and money you save by choosing the shortest route.

4. **MongoDB Persistence & Trip History**:
   - Backend Express + Mongoose API with REST endpoints:
     - `GET /api/trips`: Fetch all previously planned trips.
     - `POST /api/trips`: Save trips to MongoDB.
     - `DELETE /api/trips/:id`: Delete saved trips.
     - `GET /api/geocode/search` & `GET /api/geocode/reverse`: Backend proxy with headers.
     - `POST /api/routes/calculate`: OSRM routing comparison.
   - Automatic resilient in-memory fallback if local MongoDB is not yet running, ensuring the app works out-of-the-box.
   - **Slide-over Trip History Drawer** with one-click "Re-plot on Map" button.

---

## 🚀 How to Run the Application

### 1. Start the Backend API Server
```bash
cd backend
npm start
# Runs Express on http://localhost:5001
```

### 2. Start the Frontend React Development Server
```bash
cd frontend
npm run dev
# Runs Vite on http://localhost:3000
```

Open your browser at **`http://localhost:3000`**.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, React-Leaflet, Leaflet, Tailwind CSS, Lucide React Icons.
- **Backend**: Node.js, Express.js, Mongoose, Axios, Cors, Dotenv.
- **Database**: MongoDB (with Mongoose schema + graceful fallback).
- **Map & Routing**: OpenStreetMap, CartoDB Voyager tiles, OSRM API, Nominatim Geocoder.
