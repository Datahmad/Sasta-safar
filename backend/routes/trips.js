const express = require('express');
const router = express.Router();
const { TripService } = require('../models/Trip');

// GET all saved trips
router.get('/', async (req, res) => {
  try {
    const trips = await TripService.getAll();
    res.json({ success: true, count: trips.length, data: trips });
  } catch (err) {
    console.error('[Get Trips Error]:', err.message);
    res.status(500).json({ error: 'Failed to retrieve saved trips' });
  }
});

// POST save a trip
router.post('/', async (req, res) => {
  const {
    origin,
    destination,
    selectedRouteType,
    distanceKm,
    durationMinutes,
    vehicle,
    fuelPricePerLiter,
    currency,
    isRoundTrip,
    fuelLitersRequired,
    totalFuelCost,
    costPerKm,
    notes,
    summary,
  } = req.body;

  if (!origin || !destination || !distanceKm || !fuelPricePerLiter) {
    return res.status(400).json({ error: 'Missing required trip parameters' });
  }

  try {
    const savedTrip = await TripService.create({
      origin,
      destination,
      selectedRouteType: selectedRouteType || 'fastest',
      distanceKm: parseFloat(distanceKm),
      durationMinutes: parseInt(durationMinutes, 10) || 0,
      vehicle: {
        name: vehicle?.name || 'My Vehicle',
        fuelAverageKmPerLiter: parseFloat(vehicle?.fuelAverageKmPerLiter) || 12,
        fuelType: vehicle?.fuelType || 'Petrol / Gasoline',
      },
      fuelPricePerLiter: parseFloat(fuelPricePerLiter),
      currency: currency || '$',
      isRoundTrip: Boolean(isRoundTrip),
      fuelLitersRequired: parseFloat(fuelLitersRequired),
      totalFuelCost: parseFloat(totalFuelCost),
      costPerKm: parseFloat(costPerKm),
      notes: notes || '',
      summary: summary || '',
      user: req.body.user || null,
    });

    res.status(201).json({ success: true, message: 'Trip successfully saved!', data: savedTrip });
  } catch (err) {
    console.error('[Create Trip Error]:', err.message);
    res.status(500).json({ error: 'Failed to save trip', details: err.message });
  }
});

// DELETE a trip by ID
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await TripService.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json({ success: true, message: 'Trip deleted successfully', data: deleted });
  } catch (err) {
    console.error('[Delete Trip Error]:', err.message);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

module.exports = router;
