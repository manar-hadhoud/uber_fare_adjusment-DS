import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const FareEstimatorForm = () => {
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [predictedFare, setPredictedFare] = useState(null); // NEW state for output
  //const [fareEstimate, setFareEstimate] = useState(null);


  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('Pickup:', pickup);
    console.log('Dropoff:', dropoff);

    const [hour, minute] = pickupTime.split(':');
    const [year, month, day] = pickupDate.split('-');

    const inputData = {
      passenger_count: passengerCount,
      pickup_latitude: pickup?.lat,
      pickup_longitude: pickup?.lng,
      dropoff_latitude: dropoff?.lat,
      dropoff_longitude: dropoff?.lng,
      hour: parseInt(hour),
      minute: parseInt(minute),
      day: parseInt(day),
      month: parseInt(month),
      year: parseInt(year),
    };

    console.log('Sending this to API:', inputData);

    try {
      const response = await fetch('http://localhost:8000/api/estimate-fare', { // adjust URL if needed
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inputData),
      });

      const data = await response.json();
      //setFareEstimate(data.fare);
      console.log('Response from API:', data);

      setPredictedFare(data.estimated_fare); // assuming your backend sends { "prediction": value }
    } catch (error) {
      console.error('Error calling API:', error);
      setPredictedFare('Error estimating fare.');
    }
  };

  const defaultCenter = [40.7128, -74.0060]; // Cairo

  return (
    <div className="page-layout">
      <form onSubmit={handleSubmit} className="form-layout">
        <h2>Uber Fare Estimator</h2>

        <label>Passenger Count:</label>
        <input
          type="number"
          min="0"
          max="6"
          value={passengerCount}
          onChange={(e) => setPassengerCount(e.target.value)}
          required
        />

        <label>Pickup Latitude:</label>
        <input
          type="number"
          step="any"
          placeholder="Pickup latitude"
          onChange={(e) => setPickup((prev) => ({ ...(prev || {}), lat: parseFloat(e.target.value) }))}
          required
        />

        <label>Pickup Longitude:</label>
        <input
          type="number"
          step="any"
          placeholder="Pickup longitude"
          onChange={(e) => setPickup((prev) => ({ ...(prev || {}), lng: parseFloat(e.target.value) }))}
          required
        />

        <label>Dropoff Latitude:</label>
        <input
          type="number"
          step="any"
          placeholder="Dropoff latitude"
          onChange={(e) => setDropoff((prev) => ({ ...(prev || {}), lat: parseFloat(e.target.value) }))}
          required
        />

        <label>Dropoff Longitude:</label>
        <input
          type="number"
          step="any"
          placeholder="Dropoff longitude"
          onChange={(e) => setDropoff((prev) => ({ ...(prev || {}), lng: parseFloat(e.target.value) }))}
          required
        />

        <label>Pickup Date:</label>
        <input
          type="date"
          value={pickupDate}
          onChange={(e) => setPickupDate(e.target.value)}
          required
        />

        <label>Pickup Time:</label>
        <input
          type="time"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
          required
        />

        <button type="submit">Estimate Fare</button>
      </form>

      {predictedFare !== null && (
        <div className="fare-result">
          <h3>Estimated Fare: {typeof predictedFare === 'number' ? `$${predictedFare.toFixed(2)}` : predictedFare}</h3>
        </div>
      )}

      <div className="map-layout">
        <MapContainer
          center={pickup && pickup.lat && pickup.lng ? [pickup.lat, pickup.lng] : defaultCenter}
          zoom={13}
          style={{ height: "400px", width: "100%" }}
        >
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
         />

          {pickup && pickup.lat && pickup.lng && (
            <Marker position={[pickup.lat, pickup.lng]}>
              <Popup>Pickup Location</Popup>
            </Marker>
          )}

          {dropoff && dropoff.lat && dropoff.lng && (
            <Marker position={[dropoff.lat, dropoff.lng]}>
              <Popup>Dropoff Location</Popup>
            </Marker>
          )}

          {pickup && dropoff && pickup.lat && pickup.lng && dropoff.lat && dropoff.lng && (
            <Polyline
              positions={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]}
              color="blue"
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default FareEstimatorForm;
