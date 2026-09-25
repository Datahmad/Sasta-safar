const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema(
  {
    origin: {
      name: { type: String, required: true },
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    },
    destination: {
      name: { type: String, required: true },
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    },
    selectedRouteType: {
      type: String,
      enum: ['fastest', 'shortest'],
      default: 'fastest',
    },
    distanceKm: { type: Number, required: true },
    durationMinutes: { type: Number, required: true },
    vehicle: {
      name: { type: String, default: 'Custom Vehicle' },
      fuelAverageKmPerLiter: { type: Number, required: true },
      fuelType: { type: String, default: 'Gasoline / Petrol' },
    },
    fuelPricePerLiter: { type: Number, required: true },
    currency: { type: String, default: '$' },
    isRoundTrip: { type: Boolean, default: false },
    fuelLitersRequired: { type: Number, required: true },
    totalFuelCost: { type: Number, required: true },
    costPerKm: { type: Number, required: true },
    notes: { type: String, default: '' },
    summary: { type: String, default: '' },
  },
  { timestamps: true }
);

const TripModel = mongoose.model('Trip', TripSchema);

// In-memory fallback repository when MongoDB daemon is not running
let memoryTrips = [];

const TripService = {
  async getAll() {
    if (mongoose.connection.readyState === 1) {
      return await TripModel.find().sort({ createdAt: -1 });
    }
    return [...memoryTrips].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async create(tripData) {
    if (mongoose.connection.readyState === 1) {
      const trip = new TripModel(tripData);
      return await trip.save();
    }
    const fakeTrip = {
      _id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      ...tripData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryTrips.unshift(fakeTrip);
    return fakeTrip;
  },

  async delete(id) {
    if (mongoose.connection.readyState === 1) {
      return await TripModel.findByIdAndDelete(id);
    }
    const index = memoryTrips.findIndex((t) => t._id === id);
    if (index !== -1) {
      const removed = memoryTrips.splice(index, 1);
      return removed[0];
    }
    return null;
  },
};

module.exports = { TripModel, TripService };
