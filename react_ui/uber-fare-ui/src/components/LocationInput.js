// src/components/LocationInput.js
import React from 'react';

const LocationInput = ({ placeholder, value, onChange }) => {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="input-style"
    />
  );
};

export default LocationInput;




/*import { Autocomplete } from '@react-google-maps/api';
import React, { useRef } from 'react';

const LocationInput = ({ placeholder, onCoordinates }) => {
  const autocompleteRef = useRef(null);

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current.getPlace();
    if (place.geometry) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      onCoordinates({ lat, lng, address: place.formatted_address });
    }
  };

  return (
    <Autocomplete onLoad={(ref) => (autocompleteRef.current = ref)} onPlaceChanged={handlePlaceChanged}>
      <input type="text" placeholder={placeholder} className="input-style" />
    </Autocomplete>
  );
};

export default LocationInput;*/
