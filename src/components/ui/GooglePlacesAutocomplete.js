import React, { useEffect, useRef, useState } from 'react';

const GooglePlacesAutocomplete = ({
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Load Google Maps Script
  useEffect(() => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn('Google Maps API key not found. Please set GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables.');
      setLoadError('API key not configured');
      return;
    }

    // Check if script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      existingScript.addEventListener('error', () => setLoadError('Failed to load Google Maps'));
      return;
    }

    // Load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      setLoadError('Failed to load Google Maps');
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove script on unmount as it might be used by other components
    };
  }, []);

  // Initialize Autocomplete
  useEffect(() => {
    if (!isLoaded || !inputRef.current || loadError) return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        fields: ['address_components', 'formatted_address', 'geometry']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.address_components) {
          console.warn('No address details available for this place');
          return;
        }

        // Parse address components
        const addressData = {
          street: '',
          city: '',
          zipCode: '',
          country: '',
          formattedAddress: place.formatted_address || ''
        };

        let streetNumber = '';
        let route = '';

        place.address_components.forEach(component => {
          const types = component.types;

          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          }
          if (types.includes('route')) {
            route = component.long_name;
          }
          if (types.includes('locality') || types.includes('administrative_area_level_3')) {
            addressData.city = component.long_name;
          }
          if (types.includes('postal_code')) {
            addressData.zipCode = component.long_name;
          }
          if (types.includes('country')) {
            addressData.country = component.long_name;
          }
        });

        // Combine street number and route
        if (route && streetNumber) {
          addressData.street = `${route} ${streetNumber}`;
        } else if (route) {
          addressData.street = route;
        } else if (streetNumber) {
          addressData.street = streetNumber;
        }

        // Update the input value
        if (onChange) {
          onChange(addressData.street);
        }

        // Call the callback with parsed address data
        if (onPlaceSelect) {
          onPlaceSelect(addressData);
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
      setLoadError('Failed to initialize autocomplete');
    }

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, loadError, onChange, onPlaceSelect]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={loadError ? 'Address search unavailable' : placeholder}
        disabled={disabled || !!loadError}
        className={className}
        style={style}
      />
      {loadError && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <span className="text-xs text-yellow-500" title={loadError}>
            ⚠️
          </span>
        </div>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
