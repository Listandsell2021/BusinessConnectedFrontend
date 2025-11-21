import React, { useState, useEffect, useRef } from 'react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDktMz6iF9iLh5aJP1z4bACX9sFaDJLe3o';
const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script';

const AddressAutocomplete = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Enter address...',
  className = '',
  style = {},
  disabled = false
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(null);

  // Keep refs updated with latest callbacks
  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onChange, onPlaceSelect]);

  // Load Google Maps Script
  useEffect(() => {
    // Check if script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('Google Maps already loaded');
      setScriptLoaded(true);
      return;
    }

    // Check if script tag exists
    let existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);

    if (existingScript) {
      console.log('Script tag exists, waiting for load...');
      const handleLoad = () => {
        console.log('Google Maps script loaded');
        setScriptLoaded(true);
      };

      existingScript.addEventListener('load', handleLoad);

      return () => {
        existingScript.removeEventListener('load', handleLoad);
      };
    }

    // Create new script tag
    console.log('Creating new Google Maps script tag...');
    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=de`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('Google Maps API loaded successfully');
      setScriptLoaded(true);
    };

    script.onerror = (error) => {
      console.error('Error loading Google Maps API:', error);
      setScriptError('Failed to load Google Maps API');
    };

    document.head.appendChild(script);
  }, []);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!scriptLoaded || !inputRef.current) {
      return;
    }

    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.error('Google Maps API not available');
      return;
    }

    // Clean up existing autocomplete if it exists
    if (autocompleteRef.current) {
      console.log('Cleaning up existing autocomplete instance');
      window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    try {
      console.log('🚀 Initializing Google Places Autocomplete...');

      // Create autocomplete instance
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: ['de', 'at', 'ch'] },
        fields: ['address_components', 'formatted_address', 'geometry', 'name']
      });

      console.log('✅ Autocomplete instance created');

      // Handle place selection using refs to get latest callbacks
      const handlePlaceChanged = () => {
        console.log('🔔 PLACE_CHANGED EVENT FIRED!');
        const place = autocomplete.getPlace();

        console.log('=== PLACE SELECTED ===');
        console.log('📍 Place name:', place.name);
        console.log('📍 Formatted address:', place.formatted_address);
        console.log('📍 Address components:', place.address_components);

        if (!place.address_components || place.address_components.length === 0) {
          console.error('❌ No address components found!');
          if (onChangeRef.current) {
            onChangeRef.current(place.formatted_address || place.name || '');
          }
          return;
        }

        // Parse address components
        const addressData = parseGoogleAddress(place);
        console.log('✅ Parsed address data:', addressData);

        // Update using the ref
        if (onChangeRef.current) {
          console.log('📤 Calling onChange with:', addressData.street);
          onChangeRef.current(addressData.street || place.formatted_address || '');
        }

        // Call onPlaceSelect using the ref
        if (onPlaceSelectRef.current) {
          console.log('📤 Calling onPlaceSelect with:', addressData);
          onPlaceSelectRef.current(addressData);
        }
      };

      autocomplete.addListener('place_changed', handlePlaceChanged);
      autocompleteRef.current = autocomplete;

      console.log('✅ Event listener attached successfully');
      console.log('Google Places Autocomplete initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Google Places Autocomplete:', error);
      setScriptError(error.message);
    }

    // Cleanup
    return () => {
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.event) {
        console.log('🧹 Cleaning up autocomplete on unmount');
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [scriptLoaded]); // Only depend on scriptLoaded

  // Parse Google Places address components
  const parseGoogleAddress = (place) => {
    const addressComponents = place.address_components || [];

    let street = '';
    let streetNumber = '';
    let route = '';
    let city = '';
    let zipCode = '';
    let country = '';
    let premise = '';
    let sublocality = '';

    console.log('🔍 Parsing address components:', addressComponents);

    addressComponents.forEach((component) => {
      const types = component.types;

      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        route = component.long_name;
      }
      if (types.includes('premise')) {
        premise = component.long_name;
      }
      if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
        sublocality = component.long_name;
      }
      if (types.includes('locality')) {
        city = component.long_name;
      }
      if (types.includes('administrative_area_level_2') && !city) {
        city = component.long_name;
      }
      if (types.includes('postal_town') && !city) {
        city = component.long_name;
      }
      if (types.includes('postal_code')) {
        zipCode = component.long_name;
      }
      if (types.includes('country')) {
        country = component.long_name;
      }
    });

    // Build street address
    if (route) {
      street = streetNumber ? `${route} ${streetNumber}` : route;
    } else if (premise) {
      street = premise;
    } else if (place.name && place.name !== city) {
      street = place.name;
    }

    if (!city && sublocality) {
      city = sublocality;
    }

    console.log('✅ Extracted:', { street, city, zipCode, country });

    return {
      street,
      city,
      zipCode,
      country,
      formattedAddress: place.formatted_address || '',
      coordinates: place.geometry?.location ? {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      } : null
    };
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        style={style}
        autoComplete="off"
      />

      {!scriptLoaded && !scriptError && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

      {/* Green checkmark removed - Google Maps loads silently */}

      {scriptError && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" title={scriptError}>
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
