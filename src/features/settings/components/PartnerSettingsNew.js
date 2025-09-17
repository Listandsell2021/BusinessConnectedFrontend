import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useService } from '../../../contexts/ServiceContext';
import { partnersAPI } from '../../../lib/api/api';
import { toast } from 'react-hot-toast';

const PartnerSettingsNew = () => {
  const { isGerman } = useLanguage();
  const { user, isPartner, isSuperAdmin, updateUser } = useAuth();
  const { currentService } = useService();
  
  const [activeTab, setActiveTab] = useState('contact');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [partnerData, setPartnerData] = useState(null);
  
  // Available services from database (moving, cleaning)
  const [availableServices] = useState(['moving', 'cleaning']);
  
  // European countries and cities data - always show in English
  const [availableCountries] = useState([
    { code: 'DE', name: 'Germany' },
    { code: 'AT', name: 'Austria' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'BE', name: 'Belgium' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'PT', name: 'Portugal' },
    { code: 'PL', name: 'Poland' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'HU', name: 'Hungary' },
    { code: 'RO', name: 'Romania' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'HR', name: 'Croatia' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'GR', name: 'Greece' },
    { code: 'DK', name: 'Denmark' },
    { code: 'SE', name: 'Sweden' },
    { code: 'NO', name: 'Norway' },
    { code: 'FI', name: 'Finland' },
    { code: 'EE', name: 'Estonia' },
    { code: 'LV', name: 'Latvia' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'IE', name: 'Ireland' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'LU', name: 'Luxembourg' }
  ]);

  // Helper functions to convert between codes and names
  const getCountryNameFromCode = (code) => {
    const country = availableCountries.find(c => c.code === code);
    return country ? country.name : code;
  };

  const getCountryCodeFromName = (name) => {
    const country = availableCountries.find(c => c.name === name);
    return country ? country.code : name;
  };
  
  const [citiesByCountry] = useState({
    'DE': [
      'Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf',
      'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden', 'Hanover', 'Nuremberg',
      'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster'
    ],
    'AT': ['Vienna', 'Salzburg', 'Innsbruck', 'Graz', 'Linz', 'Klagenfurt', 'Villach', 'Wels', 'St. Pölten'],
    'CH': ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne', 'Winterthur', 'Lucerne', 'St. Gallen'],
    'NL': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere'],
    'BE': ['Brussels', 'Antwerp', 'Ghent', 'Bruges', 'Leuven', 'Charleroi', 'Liège', 'Namur'],
    'FR': ['Paris', 'Lyon', 'Marseille', 'Nice', 'Toulouse', 'Strasbourg', 'Bordeaux', 'Lille', 'Nantes', 'Rennes'],
    'IT': ['Rome', 'Milan', 'Naples', 'Turin', 'Florence', 'Bologna', 'Venice', 'Genoa', 'Palermo', 'Bari'],
    'ES': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Zaragoza', 'Málaga', 'Murcia', 'Las Palmas'],
    'PL': ['Warsaw', 'Krakow', 'Gdansk', 'Wroclaw', 'Poznan', 'Lodz', 'Szczecin', 'Katowice', 'Lublin'],
    'CZ': ['Prague', 'Brno', 'Ostrava', 'Plzen', 'Liberec', 'Olomouc', 'České Budějovice', 'Hradec Králové'],
    'DK': ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens'],
    'SE': ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg'],
    'NO': ['Oslo', 'Bergen', 'Stavanger', 'Trondheim', 'Drammen', 'Fredrikstad', 'Kristiansand', 'Sandnes'],
    'PT': ['Lisbon', 'Porto', 'Vila Nova de Gaia', 'Amadora', 'Braga', 'Almada', 'Coimbra', 'Funchal'],
    'SK': ['Bratislava', 'Košice', 'Prešov', 'Žilina', 'Banská Bystrica', 'Nitra', 'Trnava', 'Martin'],
    'HU': ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs', 'Győr', 'Nyíregyháza', 'Kecskemét'],
    'RO': ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Craiova', 'Brașov', 'Galați'],
    'BG': ['Sofia', 'Plovdiv', 'Varna', 'Burgas', 'Ruse', 'Stara Zagora', 'Pleven', 'Dobrich'],
    'HR': ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Pula', 'Slavonski Brod', 'Karlovac'],
    'SI': ['Ljubljana', 'Maribor', 'Celje', 'Kranj', 'Velenje', 'Koper', 'Novo Mesto', 'Ptuj'],
    'GR': ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa', 'Volos', 'Rhodes', 'Ioannina'],
    'FI': ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku', 'Jyväskylä', 'Lahti'],
    'EE': ['Tallinn', 'Tartu', 'Narva', 'Pärnu', 'Kohtla-Järve', 'Viljandi', 'Rakvere', 'Maardu'],
    'LV': ['Riga', 'Daugavpils', 'Liepāja', 'Jelgava', 'Jūrmala', 'Ventspils', 'Rēzekne', 'Valmiera'],
    'LT': ['Vilnius', 'Kaunas', 'Klaipėda', 'Šiauliai', 'Panevėžys', 'Alytus', 'Marijampolė', 'Mažeikiai'],
    'IE': ['Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford', 'Drogheda', 'Dundalk', 'Swords'],
    'GB': ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Bristol', 'Sheffield', 'Leeds'],
    'LU': ['Luxembourg City', 'Esch-sur-Alzette', 'Differdange', 'Dudelange', 'Ettelbruck', 'Diekirch', 'Wiltz', 'Echternach']
  });
  

  const [settings, setSettings] = useState({
    // Contact Information
    companyName: '',
    contactPerson: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    },
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: 'DE'
    },
    
    // Service Preferences
    preferences: {
      moving: {
        countries: [],
        citySettings: {
          // Format: { 'DE-Berlin': { radius: 50, country: 'DE' }, 'AT-Vienna': { radius: 30, country: 'AT' } }
        }
      },
      cleaning: {
        cities: [],
        countries: [],
        radius: 50
      }
    },
    
    // Notification Settings
    notifications: {
      email: true,
      sms: false
    }
  });

  useEffect(() => {
    loadPartnerData();
  }, [user]);

  const loadPartnerData = async () => {
    if (!user?.id || !isPartner) {
      console.log('No user ID or not a partner:', { userId: user?.id, isPartner });
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log('Loading partner data for user ID:', user.id);
      const response = await partnersAPI.getById(user.id);
      console.log('Partner API response:', response.data);
      
      const partner = response.data.partner || response.data;
      
      if (!partner) {
        throw new Error('No partner data received');
      }
      
      setPartnerData(partner);
      
      // Handle both old and new data structures for moving preferences
      const movingPrefs = partner.preferences?.moving || {};
      let countries = [];
      let citySettings = {};
      
      // Check if new structure (serviceArea) exists
      if (movingPrefs.serviceArea) {
        const serviceAreaObj = movingPrefs.serviceArea instanceof Map 
          ? Object.fromEntries(movingPrefs.serviceArea)
          : movingPrefs.serviceArea;
          
        // Convert new structure back to old structure for UI compatibility
        // Convert country keys to names (handle both codes and names for backward compatibility)
        countries = Object.keys(serviceAreaObj).map(key => {
          // If it's a country code (2 letters), convert to name
          if (key.length === 2) {
            return getCountryNameFromCode(key);
          }
          // Otherwise assume it's already a name
          return key;
        });
        
        Object.entries(serviceAreaObj).forEach(([countryKey, config]) => {
          const countryName = countryKey.length === 2 ? getCountryNameFromCode(countryKey) : countryKey;
          if (config.type === 'cities' && config.cities) {
            const citiesObj = config.cities instanceof Map 
              ? Object.fromEntries(config.cities)
              : config.cities;
            Object.entries(citiesObj).forEach(([cityName, cityConfig]) => {
              const cityKey = `${countryName}-${cityName}`;
              citySettings[cityKey] = {
                radius: cityConfig.radius || 0,
                country: countryName
              };
            });
          }
        });
      } else {
        // Fallback to old structure
        const oldCountries = movingPrefs.countries || [];
        // Convert old country codes to names if needed
        countries = oldCountries.map(country => {
          if (country.length === 2) {
            return getCountryNameFromCode(country);
          }
          return country;
        });
        
        const oldCitySettings = movingPrefs.citySettings || {};
        // Convert old city settings keys from codes to names
        Object.entries(oldCitySettings).forEach(([cityKey, cityConfig]) => {
          if (cityKey.includes('-')) {
            const [countryPart, cityName] = cityKey.split('-');
            const countryName = countryPart.length === 2 ? getCountryNameFromCode(countryPart) : countryPart;
            const newCityKey = `${countryName}-${cityName}`;
            citySettings[newCityKey] = {
              ...cityConfig,
              country: countryName
            };
          } else {
            citySettings[cityKey] = cityConfig;
          }
        });
      }
      
      setSettings({
        companyName: partner.companyName || '',
        contactPerson: partner.contactPerson || {
          firstName: '',
          lastName: '',
          email: '',
          phone: ''
        },
        address: partner.address || {
          street: '',
          city: '',
          postalCode: '',
          country: 'DE'
        },
        preferences: {
          moving: {
            countries: countries,
            citySettings: citySettings
          },
          cleaning: partner.preferences?.cleaning || {
            cities: [],
            countries: [],
            radius: 50
          }
        },
        notifications: partner.notifications || {
          email: true,
          sms: false
        }
      });
      
      // Initialize country service types based on loaded data
      const initialServiceTypes = {};
      countries.forEach(countryName => {
        // Check if this country has cities configured
        const hasCountryCities = Object.keys(citySettings).some(cityKey => 
          cityKey.startsWith(`${countryName}-`)
        );
        initialServiceTypes[countryName] = hasCountryCities ? 'cities' : 'country';
      });
      setCountryServiceTypes(initialServiceTypes);
      
      console.log('Settings loaded successfully');
    } catch (error) {
      console.error('Error loading partner data:', error);
      toast.error(isGerman ? 'Fehler beim Laden der Einstellungen' : 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert old structure to new structure for saving
      const movingServiceArea = {};
      const countries = settings.preferences.moving.countries || [];
      const citySettings = settings.preferences.moving.citySettings || {};
      
      // Build service area structure for each country (using country names, not codes)
      countries.forEach(countryName => {
        const countryCities = {};
        let hasCountryCities = false;
        
        // Find all cities for this country
        Object.entries(citySettings).forEach(([cityKey, cityConfig]) => {
          if (cityKey.startsWith(`${countryName}-`)) {
            const cityName = cityKey.split('-')[1];
            countryCities[cityName] = {
              radius: cityConfig.radius || 0
            };
            hasCountryCities = true;
          }
        });
        
        // Set service area for this country (using full country name)
        if (hasCountryCities) {
          movingServiceArea[countryName] = {
            type: 'cities',
            cities: countryCities
          };
        } else {
          movingServiceArea[countryName] = {
            type: 'country',
            cities: {}
          };
        }
      });
      
      const updateData = {
        companyName: settings.companyName,
        contactPerson: settings.contactPerson,
        address: settings.address,
        preferences: {
          moving: {
            serviceArea: movingServiceArea
          },
          cleaning: settings.preferences.cleaning
        },
        notifications: settings.notifications
      };

      console.log('Saving partner settings:', updateData);
      const response = await partnersAPI.update(user.id, updateData);
      console.log('Save response:', response.data);
      
      // Update user context with saved data
      updateUser({
        ...user,
        ...response.data.partner
      });
      
      toast.success(isGerman ? 'Einstellungen erfolgreich gespeichert!' : 'Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        toast.error(error.response.data.message || (isGerman ? 'Fehler beim Speichern der Einstellungen' : 'Error saving settings'));
      } else {
        toast.error(isGerman ? 'Fehler beim Speichern der Einstellungen' : 'Error saving settings');
      }
    } finally {
      setSaving(false);
    }
  };


  const handleCityToggle = (service, city, checked, country = null) => {
    if (service === 'moving') {
      // For moving service, handle city-specific settings with country prefix
      setSettings(prev => {
        const newCitySettings = { ...prev.preferences.moving.citySettings };
        const cityKey = country ? `${country}-${city}` : city;
        
        if (checked) {
          // Add city with default radius settings and country info
          newCitySettings[cityKey] = { radius: 0, country: country };
        } else {
          // Remove city
          delete newCitySettings[cityKey];
        }
        
        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            moving: {
              ...prev.preferences.moving,
              citySettings: newCitySettings
            }
          }
        };
      });
    } else {
      // For cleaning service, use old logic
      setSettings(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          [service]: {
            ...prev.preferences[service],
            cities: checked 
              ? [...prev.preferences[service].cities, city]
              : prev.preferences[service].cities.filter(c => c !== city)
          }
        }
      }));
    }
  };

  const handleCityRadiusChange = (cityKey, value) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        moving: {
          ...prev.preferences.moving,
          citySettings: {
            ...prev.preferences.moving.citySettings,
            [cityKey]: {
              ...prev.preferences.moving.citySettings[cityKey],
              radius: parseInt(value)
            }
          }
        }
      }
    }));
  };

  // State to track service type choice for each country
  const [countryServiceTypes, setCountryServiceTypes] = useState({});

  // Helper function to get configured countries from both old and new data structures
  const getConfiguredCountries = () => {
    // Try new structure first (serviceArea)
    if (settings.preferences.moving.serviceArea && typeof settings.preferences.moving.serviceArea === 'object') {
      const serviceAreaObj = settings.preferences.moving.serviceArea instanceof Map 
        ? Object.fromEntries(settings.preferences.moving.serviceArea) 
        : settings.preferences.moving.serviceArea;
      return Object.keys(serviceAreaObj);
    }
    
    // Fall back to old structure (countries array)
    return settings.preferences.moving.countries || [];
  };

  // Helper function to get selected cities for a country from both old and new structures
  const getSelectedCitiesForCountry = (countryName) => {
    // Try new structure first (serviceArea)
    if (settings.preferences.moving.serviceArea) {
      const serviceAreaObj = settings.preferences.moving.serviceArea instanceof Map 
        ? Object.fromEntries(settings.preferences.moving.serviceArea) 
        : settings.preferences.moving.serviceArea;
      
      if (serviceAreaObj[countryName] && serviceAreaObj[countryName].cities) {
        const citiesObj = serviceAreaObj[countryName].cities instanceof Map 
          ? Object.fromEntries(serviceAreaObj[countryName].cities)
          : serviceAreaObj[countryName].cities;
        return Object.keys(citiesObj);
      }
    }
    
    // Fall back to old structure (citySettings)
    return Object.keys(settings.preferences.moving.citySettings || {})
      .filter(key => key.startsWith(`${countryName}-`))
      .map(key => key.split('-')[1]);
  };

  // Helper function to determine service type for a country
  const getCountryServiceType = (countryName) => {
    // If we have an explicit choice stored, use that
    if (countryServiceTypes[countryName] !== undefined) {
      return countryServiceTypes[countryName] === 'cities';
    }
    
    // Check new structure (serviceArea) - now stored by country names
    if (settings.preferences.moving.serviceArea) {
      const serviceAreaObj = settings.preferences.moving.serviceArea instanceof Map 
        ? Object.fromEntries(settings.preferences.moving.serviceArea) 
        : settings.preferences.moving.serviceArea;
      
      if (serviceAreaObj[countryName]) {
        return serviceAreaObj[countryName].type === 'cities';
      }
    }
    
    // Otherwise, check if cities exist (for backward compatibility)
    const cityKeys = Object.keys(settings.preferences.moving.citySettings || {}).filter(key => 
      key.startsWith(`${countryName}-`)
    );
    return cityKeys.length > 0; // true = cities, false = whole country
  };

  const handleServiceTypeChange = (countryName, serviceType) => {
    // Store the explicit choice
    setCountryServiceTypes(prev => ({
      ...prev,
      [countryName]: serviceType
    }));
    
    if (serviceType === 'country') {
      // Remove all cities for this country when switching to "whole country"
      setSettings(prev => {
        const newCitySettings = { ...prev.preferences.moving.citySettings };
        Object.keys(newCitySettings).forEach(key => {
          if (key.startsWith(`${countryName}-`)) {
            delete newCitySettings[key];
          }
        });
        
        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            moving: {
              ...prev.preferences.moving,
              citySettings: newCitySettings
            }
          }
        };
      });
    }
    // If switching to 'cities', the user will add cities manually via dropdown
  };

  const handleCountryToggle = (countryCode, checked) => {
    if (checked) {
      // Set default service type to "country" when adding a new country
      setCountryServiceTypes(prev => ({
        ...prev,
        [countryCode]: 'country'
      }));
    } else {
      // Remove service type when removing country
      setCountryServiceTypes(prev => {
        const newTypes = { ...prev };
        delete newTypes[countryCode];
        return newTypes;
      });
    }
    
    setSettings(prev => {
      let newCountries = [...prev.preferences.moving.countries];
      
      if (checked) {
        // Add country if not already in list
        if (!newCountries.includes(countryCode)) {
          newCountries.push(countryCode);
        }
      } else {
        // Remove country and all its cities from settings
        newCountries = newCountries.filter(c => c !== countryCode);
        const newCitySettings = { ...prev.preferences.moving.citySettings };
        
        // Remove all cities from this country
        Object.keys(newCitySettings).forEach(cityKey => {
          if (cityKey.startsWith(`${countryCode}-`)) {
            delete newCitySettings[cityKey];
          }
        });
        
        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            moving: {
              ...prev.preferences.moving,
              countries: newCountries,
              citySettings: newCitySettings
            }
          }
        };
      }
      
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          moving: {
            ...prev.preferences.moving,
            countries: newCountries
          }
        }
      };
    });
  };

  if (!isPartner && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Zugriff verweigert' : 'Access Denied'}
          </h3>
          <p style={{ color: 'var(--theme-muted)' }}>
            {isGerman ? 'Nur Partner können Einstellungen verwalten' : 'Only Partners can access settings'}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>{isGerman ? 'Lade Einstellungen...' : 'Loading settings...'}</span>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'contact',
      label: isGerman ? 'Kontaktinformationen' : 'Contact Information'
    },
    {
      id: 'services',
      label: isGerman ? 'Service-Präferenzen' : 'Service Preferences'
    },
    {
      id: 'notifications',
      label: isGerman ? 'Benachrichtigungen' : 'Notifications'
    }
  ];

  const renderContactTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Information */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
            🏢 {isGerman ? 'Unternehmensinformationen' : 'Company Information'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Firmenname' : 'Company Name'}
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Vorname' : 'First Name'}
                </label>
                <input
                  type="text"
                  value={settings.contactPerson.firstName}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    contactPerson: { ...prev.contactPerson, firstName: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Nachname' : 'Last Name'}
                </label>
                <input
                  type="text"
                  value={settings.contactPerson.lastName}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    contactPerson: { ...prev.contactPerson, lastName: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'E-Mail' : 'Email'}
              </label>
              <input
                type="email"
                value={settings.contactPerson.email}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  contactPerson: { ...prev.contactPerson, email: e.target.value }
                }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Telefon' : 'Phone'}
              </label>
              <input
                type="tel"
                value={settings.contactPerson.phone}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  contactPerson: { ...prev.contactPerson, phone: e.target.value }
                }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
            📍 {isGerman ? 'Adressinformationen' : 'Address Information'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Straße' : 'Street'}
              </label>
              <input
                type="text"
                value={settings.address.street}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  address: { ...prev.address, street: e.target.value }
                }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Stadt' : 'City'}
                </label>
                <input
                  type="text"
                  value={settings.address.city}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    address: { ...prev.address, city: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'PLZ' : 'Postal Code'}
                </label>
                <input
                  type="text"
                  value={settings.address.postalCode}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    address: { ...prev.address, postalCode: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Land' : 'Country'}
              </label>
              <select
                value={settings.address.country}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  address: { ...prev.address, country: e.target.value }
                }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              >
                {availableCountries.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderServicesTab = () => (
    <div className="space-y-6">

      {/* Moving Service Settings */}
      {(!currentService || currentService === 'moving') && (
        <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
            🚛 {isGerman ? 'Umzugs-Einstellungen' : 'Moving Settings'}
          </h3>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'ℹ️ Radius-Erklärung:' : 'ℹ️ Radius Explanation:'}
            </h4>
            <ul className="text-sm space-y-1" style={{ color: 'var(--theme-text)' }}>
              <li>• <strong>0 km:</strong> {isGerman ? 'Service nur innerhalb der Stadtgrenzen' : 'Service only within city boundaries'}</li>
              <li>• <strong>{isGerman ? 'Höhere Werte:' : 'Higher values:'}</strong> {isGerman ? 'Service-Radius um die Stadt herum' : 'Service radius around the city'}</li>
            </ul>
          </div>
          
          <div className="space-y-8">
            
            {/* Country Dropdown - Compact */}
            <div className="bg-white rounded-lg border p-4 max-w-md" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Land hinzufügen:' : 'Add Country:'}
                </label>
                <select
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                  onChange={(e) => {
                    if (e.target.value && !settings.preferences.moving.countries.includes(e.target.value)) {
                      handleCountryToggle(e.target.value, true);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">{isGerman ? 'Land auswählen...' : 'Select country...'}</option>
                  {availableCountries
                    .filter(country => !settings.preferences.moving.countries.includes(country.code))
                    .map(country => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                </select>
                {settings.preferences.moving.countries.length > 0 && (
                  <span className="text-sm px-3 py-1 rounded-full font-medium" style={{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-text)' }}>
                    {settings.preferences.moving.countries.length}
                  </span>
                )}
              </div>
            </div>

            {/* Selected Countries and Cities - 2 Column Layout */}
            {settings.preferences.moving.countries.length > 0 && (
              <div>
                <h5 className="text-lg font-semibold mb-6" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Konfigurierte Länder' : 'Configured Countries'}
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getConfiguredCountries().map((countryName) => {
                  // Try to find country by name, handling both German and English names
                  let country = availableCountries.find(c => c.name === countryName);
                  
                  // If not found, try to find by alternative approach - check if it's an English name stored in German UI
                  if (!country) {
                    const englishToCode = {
                      'Germany': 'DE', 'Austria': 'AT', 'Switzerland': 'CH', 'Netherlands': 'NL',
                      'Belgium': 'BE', 'France': 'FR', 'Italy': 'IT', 'Spain': 'ES',
                      'Portugal': 'PT', 'Poland': 'PL', 'Czech Republic': 'CZ', 'Slovakia': 'SK',
                      'Hungary': 'HU', 'Romania': 'RO', 'Bulgaria': 'BG', 'Croatia': 'HR',
                      'Slovenia': 'SI', 'Greece': 'GR', 'Denmark': 'DK', 'Sweden': 'SE',
                      'Norway': 'NO', 'Finland': 'FI', 'Estonia': 'EE', 'Latvia': 'LV',
                      'Lithuania': 'LT', 'Ireland': 'IE', 'United Kingdom': 'GB', 'Luxembourg': 'LU'
                    };
                    const code = englishToCode[countryName];
                    if (code) {
                      country = availableCountries.find(c => c.code === code);
                    }
                  }
                  
                  const countryCode = country?.code;
                  const cities = citiesByCountry[countryCode] || [];
                  const selectedCities = getSelectedCitiesForCountry(countryName);
                  
                  
                  return (
                    <div 
                      key={countryName} 
                      className="border rounded-lg p-4" 
                      style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}
                    >
                      {/* Country Header */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                          🌍 {country?.name}
                        </span>
                        <button
                          onClick={() => handleCountryToggle(countryCode, false)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          {isGerman ? 'Entfernen' : 'Remove'}
                        </button>
                      </div>
                      
                      {/* Service Type Toggle */}
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                          {isGerman ? 'Service-Bereich:' : 'Service Area:'}
                        </label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name={`${countryName}-service-type`}
                              checked={!getCountryServiceType(countryName)}
                              onChange={() => handleServiceTypeChange(countryName, 'country')}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                              {isGerman ? 'Ganzes Land' : 'Whole Country'}
                            </span>
                          </label>
                          
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name={`${countryName}-service-type`}
                              checked={getCountryServiceType(countryName)}
                              onChange={() => handleServiceTypeChange(countryName, 'cities')}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                              {isGerman ? 'Nur bestimmte Städte' : 'Specific Cities Only'}
                            </span>
                          </label>
                        </div>
                        
                        <div className="mt-2 text-xs" style={{ color: 'var(--theme-muted)' }}>
                          {!getCountryServiceType(countryName)
                            ? (isGerman ? 'Service im gesamten Land verfügbar' : 'Service available throughout the entire country')
                            : (isGerman ? 'Service nur in ausgewählten Städten verfügbar' : 'Service only available in selected cities')
                          }
                        </div>
                      </div>
                      
                      {/* City Dropdown - Only show when "Specific Cities Only" is selected */}
                      {getCountryServiceType(countryName) && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                            {isGerman ? 'Stadt hinzufügen:' : 'Add City:'}
                          </label>
                          <select
                            className="w-full px-3 py-2 border rounded"
                            style={{
                              backgroundColor: 'var(--theme-input-bg)',
                              borderColor: 'var(--theme-border)',
                              color: 'var(--theme-text)'
                            }}
                            onChange={(e) => {
                              if (e.target.value && !selectedCities.includes(e.target.value)) {
                                handleCityToggle('moving', e.target.value, true, countryName);
                                e.target.value = '';
                              }
                            }}
                          >
                            <option value="">{isGerman ? 'Stadt auswählen...' : 'Select city...'}</option>
                            {cities
                              .filter(city => !selectedCities.includes(city))
                              .map(city => (
                                <option key={city} value={city}>
                                  {city}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                      
                      {/* Selected Cities */}
                      {getCountryServiceType(countryName) && (
                        <div>
                          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                            {isGerman ? 'Ausgewählte Städte:' : 'Selected Cities:'}
                          </label>
                          <div className="space-y-3">
                            {selectedCities.map(city => {
                              const cityKey = `${countryName}-${city}`;
                              const radius = settings.preferences.moving.citySettings[cityKey]?.radius || 0;
                              const isCityOnly = radius === 0;
                              
                              return (
                                <div key={city} className="p-3 rounded border space-y-3" style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)' }}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium" style={{ color: 'var(--theme-text)' }}>
                                      📍 {city}
                                    </span>
                                    <button
                                      onClick={() => handleCityToggle('moving', city, false, countryName)}
                                      className="text-red-500 hover:text-red-700 font-medium"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-3">
                                      <label className="flex items-center cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`${cityKey}-type`}
                                          checked={isCityOnly}
                                          onChange={() => handleCityRadiusChange(cityKey, 0)}
                                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                                          {isGerman ? 'Nur Stadt' : 'City only'}
                                        </span>
                                      </label>
                                      
                                      <label className="flex items-center cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`${cityKey}-type`}
                                          checked={!isCityOnly}
                                          onChange={() => handleCityRadiusChange(cityKey, radius > 0 ? radius : 10)}
                                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                                          {isGerman ? 'Außerhalb der Stadt' : 'Outside the city'}
                                        </span>
                                      </label>
                                    </div>
                                    
                                    {!isCityOnly && (
                                      <div className="flex items-center">
                                        <input
                                          type="number"
                                          min="1"
                                          max="200"
                                          value={radius}
                                          onChange={(e) => handleCityRadiusChange(cityKey, e.target.value)}
                                          className="w-16 px-2 py-1 border rounded text-center text-sm"
                                          style={{
                                            backgroundColor: 'var(--theme-input-bg)',
                                            borderColor: 'var(--theme-border)',
                                            color: 'var(--theme-text)'
                                          }}
                                        />
                                        <span className="ml-2 text-sm font-medium" style={{ color: 'var(--theme-muted)' }}>km</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            )}

            {/* Summary */}
            {Object.keys(settings.preferences.moving.citySettings).length > 0 && (
              <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? 'Insgesamt:' : 'Total:'} {settings.preferences.moving.countries.length} {isGerman ? 'Länder' : 'countries'}, {Object.keys(settings.preferences.moving.citySettings).length} {isGerman ? 'Städte' : 'cities'}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Cleaning Service Settings */}
      {(!currentService || currentService === 'cleaning') && (
      <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
            🧽 {isGerman ? 'Reinigungs-Einstellungen' : 'Cleaning Settings'}
          </h3>
          
          <div className="space-y-6">
            {/* Cities Selection */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Verfügbare Städte' : 'Available Cities'}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 border rounded-lg" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
                {citiesByCountry[settings.address.country]?.map((city) => (
                  <label key={city} className="flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-opacity-50" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={settings.preferences.cleaning.cities.includes(city)}
                      onChange={(e) => handleCityToggle('cleaning', city, e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm" style={{ color: 'var(--theme-text)' }}>{city}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? `${settings.preferences.cleaning.cities.length} Städte ausgewählt` : `${settings.preferences.cleaning.cities.length} cities selected`}
              </p>
            </div>

            {/* Service Radius */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Service-Radius (km)' : 'Service Radius (km)'}
              </label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="text-sm" style={{ color: 'var(--theme-text)' }}>
                  <strong>{isGerman ? 'Hinweis:' : 'Note:'}</strong> {' '}
                  {isGerman 
                    ? '0 km = Service nur innerhalb der Stadtgrenzen. Höhere Werte = Service-Radius um die Stadt herum.' 
                    : '0 km = Service only within city boundaries. Higher values = Service radius around the city.'
                  }
                </p>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.preferences.cleaning.radius}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    cleaning: { ...prev.preferences.cleaning, radius: parseInt(e.target.value) }
                  }
                }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
                <span>{isGerman ? 'Nur Stadt (0km)' : 'City Only (0km)'}</span>
                <span className="font-medium px-2 py-1 rounded" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                  {settings.preferences.cleaning.radius === 0 
                    ? (isGerman ? 'Nur Stadtgebiet' : 'City Only')
                    : `${settings.preferences.cleaning.radius}km ${isGerman ? 'um Städte' : 'around cities'}`
                  }
                </span>
                <span>100km</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      {/* Notification Settings */}
      <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
          🔔 {isGerman ? 'Benachrichtigungseinstellungen' : 'Notification Settings'}
        </h3>
        
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
            <p className="text-sm" style={{ color: 'var(--theme-text)' }}>
              {isGerman 
                ? 'Konfigurieren Sie, wie Sie über neue Leads und wichtige Updates benachrichtigt werden möchten.'
                : 'Configure how you want to be notified about new leads and important updates.'
              }
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-start space-x-3 p-3 rounded-lg border" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
              <input
                type="checkbox"
                checked={settings.notifications.email}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, email: e.target.checked }
                }))}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
              />
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                  📧 {isGerman ? 'E-Mail-Benachrichtigungen für neue Leads' : 'Email notifications for new leads'}
                </span>
                <p className="text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman 
                    ? 'Erhalten Sie E-Mail-Benachrichtigungen, wenn neue Leads zugewiesen werden'
                    : 'Receive email notifications when new leads are assigned to you'
                  }
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg border" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
              <input
                type="checkbox"
                checked={settings.notifications.sms}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, sms: e.target.checked }
                }))}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
              />
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                  📱 {isGerman ? 'SMS-Benachrichtigungen für dringende Leads' : 'SMS notifications for urgent leads'}
                </span>
                <p className="text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman 
                    ? 'Erhalten Sie SMS-Nachrichten für besonders dringende oder wichtige Leads'
                    : 'Receive SMS messages for particularly urgent or important leads'
                  }
                </p>
              </div>
            </label>
          </div>

          {/* Additional notification preferences */}
          <div className="border-t pt-4" style={{ borderColor: 'var(--theme-border)' }}>
            <h4 className="text-md font-semibold mb-3" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Erweiterte Einstellungen' : 'Advanced Settings'}
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}>
                <div>
                  <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Benachrichtigungsfrequenz' : 'Notification Frequency'}
                  </span>
                  <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                    {isGerman ? 'Wie oft möchten Sie benachrichtigt werden?' : 'How often do you want to be notified?'}
                  </p>
                </div>
                <select 
                  className="px-3 py-1 border rounded text-sm"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                >
                  <option value="immediate">{isGerman ? 'Sofort' : 'Immediate'}</option>
                  <option value="hourly">{isGerman ? 'Stündlich' : 'Hourly'}</option>
                  <option value="daily">{isGerman ? 'Täglich' : 'Daily'}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
          {isGerman ? 'Partner-Einstellungen' : 'Partner Settings'}
        </h2>
        <motion.button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            saving ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
          }`}
          style={{ 
            backgroundColor: 'var(--theme-button-bg)', 
            color: 'var(--theme-button-text)' 
          }}
          whileHover={!saving ? { scale: 1.02 } : {}}
          whileTap={!saving ? { scale: 0.98 } : {}}
        >
          {saving ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              <span>{isGerman ? 'Speichern...' : 'Saving...'}</span>
            </div>
          ) : (
            <>💾 {isGerman ? 'Einstellungen speichern' : 'Save Settings'}</>
          )}
        </motion.button>
      </div>

      {/* Tab Navigation - matching LeadManagement style */}
      <div className="flex border-b mb-6" style={{ borderColor: 'var(--theme-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              color: activeTab === tab.id ? '#3B82F6' : 'var(--theme-text-muted)',
              borderBottomColor: activeTab === tab.id ? '#3B82F6' : 'transparent'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'contact' && renderContactTab()}
      {activeTab === 'services' && renderServicesTab()}
      {activeTab === 'notifications' && renderNotificationsTab()}
    </div>
  );
};

export default PartnerSettingsNew;