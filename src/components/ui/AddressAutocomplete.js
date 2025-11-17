import React, { useState, useEffect, useRef } from 'react';

const AddressAutocomplete = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Enter address...',
  className = '',
  style = {},
  disabled = false
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch suggestions from Nominatim (OpenStreetMap)
  const fetchSuggestions = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=de,at,ch`,
        {
          headers: {
            'Accept-Language': 'de,en'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Parse address from Nominatim result
  const parseAddress = (place) => {
    const address = place.address || {};

    let street = '';
    if (address.road) {
      street = address.road;
      if (address.house_number) {
        street += ' ' + address.house_number;
      }
    }

    const city = address.city || address.town || address.village || address.municipality || '';
    const zipCode = address.postcode || '';
    const country = address.country || '';

    return {
      street,
      city,
      zipCode,
      country,
      formattedAddress: place.display_name || ''
    };
  };

  // Handle suggestion selection
  const handleSelect = (place) => {
    const addressData = parseAddress(place);

    // Update the input value with the street
    if (onChange) {
      onChange(addressData.street || place.display_name);
    }

    // Call the callback with parsed address data
    if (onPlaceSelect) {
      onPlaceSelect(addressData);
    }

    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange && onChange(e.target.value);
          setSelectedIndex(-1);
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        style={style}
        autoComplete="off"
      />

      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--theme-bg)',
            borderColor: 'var(--theme-border)',
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {suggestions.map((place, index) => (
            <div
              key={place.place_id}
              onClick={() => handleSelect(place)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                index === selectedIndex ? 'bg-blue-500 text-white' : ''
              }`}
              style={
                index !== selectedIndex
                  ? {
                      color: 'var(--theme-text)',
                      backgroundColor: 'var(--theme-bg)'
                    }
                  : {}
              }
            >
              <div className="flex items-start">
                <svg
                  className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="line-clamp-2">{place.display_name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
