from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import pickle
import numpy as np
import pandas as pd
from datetime import datetime
from haversine import haversine, Unit


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specify like ["http://localhost:3000"] for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request body model
class FareRequest(BaseModel):
    passenger_count: int
    pickup_latitude: float
    pickup_longitude: float
    dropoff_latitude: float
    dropoff_longitude: float
    hour: int
    minute: int
    day: int
    month: int
    year: int


# Helper functions
def get_time_period(hour):
    if 5 <= hour < 12:
        return 'Morning'
    elif 12 <= hour < 17:
        return 'Afternoon'
    elif 17 <= hour < 21:
        return 'Evening'
    else:
        return 'Night'

def calculate_bearing(lat1, lon1, lat2, lon2):
    delta_lon = np.radians(lon2 - lon1)
    lat1, lat2 = np.radians(lat1), np.radians(lat2)
    y = np.sin(delta_lon) * np.cos(lat2)
    x = np.cos(lat1) * np.sin(lat2) - np.sin(lat1) * np.cos(lat2) * np.cos(delta_lon)
    bearing = np.degrees(np.arctan2(y, x))
    return (bearing + 360) % 360


def preprocess_and_predict(test_request: FareRequest):
    data = {
        'passenger_count': [test_request.passenger_count],
        'pickup_latitude': [test_request.pickup_latitude],
        'pickup_longitude': [test_request.pickup_longitude],
        'dropoff_latitude': [test_request.dropoff_latitude],
        'dropoff_longitude': [test_request.dropoff_longitude],
        'hour': [test_request.hour],
        'minute': [test_request.minute],
        'pickup_month': [test_request.month],
        'pickup_year': [test_request.year],
    }
    
    df = pd.DataFrame(data)
    
    # Additional features
    time_period = get_time_period(test_request.hour)
    date_obj = datetime(test_request.year, test_request.month, test_request.day, test_request.hour, test_request.minute)
    day_of_week = date_obj.weekday()
    bearing = calculate_bearing(
        test_request.pickup_latitude, test_request.pickup_longitude,
        test_request.dropoff_latitude, test_request.dropoff_longitude
    )
    distance_km = haversine(
        (test_request.pickup_latitude, test_request.pickup_longitude),
        (test_request.dropoff_latitude, test_request.dropoff_longitude),
        unit=Unit.KILOMETERS
    )
    
    # Coordinate bounds check
    with open('coordinate_bounds.pkl', 'rb') as file:
        bounds = pickle.load(file)
    
    pickup_long_outlier = (df['pickup_longitude'] < bounds['pickup_longitude']['lower']) | (df['pickup_longitude'] > bounds['pickup_longitude']['upper'])
    pickup_lat_outlier = (df['pickup_latitude'] < bounds['pickup_latitude']['lower']) | (df['pickup_latitude'] > bounds['pickup_latitude']['upper'])
    dropoff_long_outlier = (df['dropoff_longitude'] < bounds['dropoff_longitude']['lower']) | (df['dropoff_longitude'] > bounds['dropoff_longitude']['upper'])
    dropoff_lat_outlier = (df['dropoff_latitude'] < bounds['dropoff_latitude']['lower']) | (df['dropoff_latitude'] > bounds['dropoff_latitude']['upper'])

    df['suspected_coordinate'] = (pickup_long_outlier | pickup_lat_outlier | dropoff_long_outlier | dropoff_lat_outlier).astype(int)
    
    # Add features
    df['time_period'] = time_period
    df['pickup_dayofweek'] = day_of_week
    df['bearing'] = bearing
    df['distance_km'] = distance_km

    # Encode time period
    with open('time_period_mapping.pkl', 'rb') as file:
        time_period_mapping = pickle.load(file)
    df['time_period'] = df['time_period'].map(time_period_mapping)

    # Scaling
    feature_cols = ['pickup_longitude', 'pickup_latitude', 'dropoff_longitude', 'dropoff_latitude', 'passenger_count', 
                    'hour', 'minute', 'pickup_dayofweek',
                      'pickup_month', 'pickup_year', 'time_period', 
                      'distance_km', 'bearing', 'suspected_coordinate']

    """with open("model_features.pkl", "rb") as f:
        model_features = pickle.load(f)

    # Ensure df only has the exact same columns, in the same order
    df = df[model_features]
    """
    with open('scaler.pkl', 'rb') as file:
        scaler = pickle.load(file)

    df[feature_cols] = scaler.transform(df[feature_cols])

    # Load model
    with open('best_lgb_model.pkl', 'rb') as f:
        model = pickle.load(f)
    
    # Predict
    prediction = model.predict(df)[0]
    return prediction

# fare estimation
@app.post("/api/estimate-fare")
def estimate_fare(request: FareRequest):

    predicted_fare = preprocess_and_predict(request)
    return {"estimated_fare": round(predicted_fare, 2)}

