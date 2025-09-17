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
    
    // Service Preferences - pickup and destination directly under preferences
    preferences: {
      pickup: {
        countries: [],
        citySettings: {
          // Format: { 'DE-Berlin': { radius: 50, country: 'DE' }, 'AT-Vienna': { radius: 30, country: 'AT' } }
        }
      },
      destination: {
        countries: [],
        citySettings: {
          // Format: { 'DE-Berlin': { radius: 50, country: 'DE' }, 'AT-Vienna': { radius: 30, country: 'AT' } }
        }
      },
      cleaning: {
        serviceArea: {} // Same structure as pickup/destination
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
      
      // Handle pickup and destination preferences (now directly under preferences)
      let pickupCountries = [];
      let pickupCitySettings = {};
      let destinationCountries = [];
      let destinationCitySettings = {};

      // Process address data for pickup and destination
      const processAddressType = (addressData, addressType) => {
        let countries = [];
        let citySettings = {};

        if (addressData?.serviceArea) {
          const serviceAreaObj = addressData.serviceArea instanceof Map
            ? Object.fromEntries(addressData.serviceArea)
            : addressData.serviceArea;

          countries = Object.keys(serviceAreaObj).map(key => {
            if (key.length === 2) {
              return getCountryNameFromCode(key);
            }
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
        } else if (addressData?.countries || addressData?.citySettings) {
          // Fallback to old structure
          const oldCountries = addressData.countries || [];
          countries = oldCountries.map(country => {
            if (country.length === 2) {
              return getCountryNameFromCode(country);
            }
            return country;
          });

          const oldCitySettings = addressData.citySettings || {};
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

        return { countries, citySettings };
      };

      // Process pickup preferences (directly under preferences)
      if (partner.preferences?.pickup) {
        const pickupData = processAddressType(partner.preferences.pickup, 'pickup');
        pickupCountries = pickupData.countries;
        pickupCitySettings = pickupData.citySettings;
      }

      // Process destination preferences (directly under preferences)
      if (partner.preferences?.destination) {
        const destinationData = processAddressType(partner.preferences.destination, 'destination');
        destinationCountries = destinationData.countries;
        destinationCitySettings = destinationData.citySettings;
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
          pickup: {
            countries: pickupCountries,
            citySettings: pickupCitySettings
          },
          destination: {
            countries: destinationCountries,
            citySettings: destinationCitySettings
          },
          cleaning: (() => {
            const cleaningPrefs = partner.preferences?.cleaning || {
              serviceArea: {}
            };

            // Ensure serviceArea exists
            if (!cleaningPrefs.serviceArea) {
              cleaningPrefs.serviceArea = {};
            }

            // Return only the clean structure (only serviceArea needed)
            return {
              serviceArea: cleaningPrefs.serviceArea || {}
            };
          })()
        },
        notifications: partner.notifications || {
          email: true,
          sms: false
        }
      });
      
      // Initialize country service types based on loaded data for both pickup and destination
      const initialPickupServiceTypes = {};
      const initialDestinationServiceTypes = {};
      
      pickupCountries.forEach(countryName => {
        const hasCountryCities = Object.keys(pickupCitySettings).some(cityKey => 
          cityKey.startsWith(`${countryName}-`)
        );
        initialPickupServiceTypes[countryName] = hasCountryCities ? 'cities' : 'country';
      });
      
      destinationCountries.forEach(countryName => {
        const hasCountryCities = Object.keys(destinationCitySettings).some(cityKey => 
          cityKey.startsWith(`${countryName}-`)
        );
        initialDestinationServiceTypes[countryName] = hasCountryCities ? 'cities' : 'country';
      });
      
      setPickupCountryServiceTypes(initialPickupServiceTypes);
      setDestinationCountryServiceTypes(initialDestinationServiceTypes);
      
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
      // Convert structure for saving with pickup and destination
      const buildServiceArea = (countries, citySettings) => {
        const serviceArea = {};
        
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
          
          // Set service area for this country
          if (hasCountryCities) {
            serviceArea[countryName] = {
              type: 'cities',
              cities: countryCities
            };
          } else {
            serviceArea[countryName] = {
              type: 'country',
              cities: {}
            };
          }
        });
        
        return serviceArea;
      };
      
      const pickupServiceArea = buildServiceArea(
        settings.preferences.pickup.countries || [],
        settings.preferences.pickup.citySettings || {}
      );

      const destinationServiceArea = buildServiceArea(
        settings.preferences.destination.countries || [],
        settings.preferences.destination.citySettings || {}
      );

      const updateData = {
        companyName: settings.companyName,
        contactPerson: settings.contactPerson,
        address: settings.address,
        preferences: {
          pickup: {
            serviceArea: pickupServiceArea
          },
          destination: {
            serviceArea: destinationServiceArea
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


  const handleCityToggle = (service, city, checked, country = null, addressType = null) => {
    if ((service === 'moving' && addressType) || (service === 'cleaning' && addressType === 'cleaning')) {
      // For moving service and cleaning service, use serviceArea structure
      setSettings(prev => {
        const currentPrefs = prev.preferences[addressType];
        const currentServiceArea = currentPrefs.serviceArea || {};
        const countryData = currentServiceArea[country] || { type: 'cities', cities: {} };

        if (checked) {
          // Add city to serviceArea
          countryData.cities = {
            ...countryData.cities,
            [city]: { radius: 0 }
          };
        } else {
          // Remove city from serviceArea
          const newCities = { ...countryData.cities };
          delete newCities[city];
          countryData.cities = newCities;
        }

        const newServiceArea = {
          ...currentServiceArea,
          [country]: countryData
        };

        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            [addressType]: {
              ...currentPrefs,
              serviceArea: newServiceArea
            }
          }
        };
      });
    } else {
      // For legacy cleaning service, use old logic
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

  const handleCityRadiusChange = (cityKey, value, addressType) => {
    const [country, city] = cityKey.split('-');

    setSettings(prev => {
      const currentPrefs = prev.preferences[addressType];
      const currentServiceArea = currentPrefs.serviceArea || {};
      const countryData = currentServiceArea[country] || { type: 'cities', cities: {} };

      countryData.cities = {
        ...countryData.cities,
        [city]: {
          ...countryData.cities[city],
          radius: parseInt(value)
        }
      };

      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          [addressType]: {
            ...currentPrefs,
            serviceArea: {
              ...currentServiceArea,
              [country]: countryData
            }
          }
        }
      };
    });
  };

  const handleCityRadiusToggle = (cityKey, type, addressType) => {
    const [country, city] = cityKey.split('-');
    const newRadius = type === 'city' ? 0 : 50; // 0 for city only, 50km default for radius

    setSettings(prev => {
      const currentPrefs = prev.preferences[addressType];
      const currentServiceArea = currentPrefs.serviceArea || {};
      const countryData = currentServiceArea[country] || { type: 'cities', cities: {} };

      countryData.cities = {
        ...countryData.cities,
        [city]: {
          ...countryData.cities[city],
          radius: newRadius
        }
      };

      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          [addressType]: {
            ...currentPrefs,
            serviceArea: {
              ...currentServiceArea,
              [country]: countryData
            }
          }
        }
      };
    });
  };

  // State to track service type choice for each country (separate for pickup and destination)
  const [pickupCountryServiceTypes, setPickupCountryServiceTypes] = useState({});
  const [destinationCountryServiceTypes, setDestinationCountryServiceTypes] = useState({});
  const [cleaningCountryServiceTypes, setCleaningCountryServiceTypes] = useState({});

  // Helper function to get configured countries for specific address type
  const getConfiguredCountries = (addressType) => {
    const addressData = settings.preferences[addressType];
    if (!addressData) return [];

    // For all services (including cleaning), use serviceArea structure
    if (addressData.serviceArea && typeof addressData.serviceArea === 'object') {
      const serviceAreaObj = addressData.serviceArea instanceof Map
        ? Object.fromEntries(addressData.serviceArea)
        : addressData.serviceArea;
      return Object.keys(serviceAreaObj);
    }

    // Legacy fallback only for moving services
    if (addressType !== 'cleaning') {
      return addressData.countries || [];
    }

    return [];
  };

  // Helper function to get selected cities for a country from both old and new structures
  const getSelectedCitiesForCountry = (countryName, addressType) => {
    const addressData = settings.preferences[addressType];
    if (!addressData) return [];

    // Use serviceArea structure for all services (cleaning uses same format as pickup/destination)
    if (addressData.serviceArea) {
      const serviceAreaObj = addressData.serviceArea instanceof Map
        ? Object.fromEntries(addressData.serviceArea)
        : addressData.serviceArea;

      if (serviceAreaObj[countryName] && serviceAreaObj[countryName].cities) {
        const citiesObj = serviceAreaObj[countryName].cities instanceof Map
          ? Object.fromEntries(serviceAreaObj[countryName].cities)
          : serviceAreaObj[countryName].cities;
        return Object.keys(citiesObj);
      }
    }

    // Legacy fallback only for moving service citySettings
    if (addressType !== 'cleaning' && addressData.citySettings) {
      const cityKeys = Object.keys(addressData.citySettings).filter(key =>
        key.startsWith(`${countryName}-`)
      );
      return cityKeys.map(key => key.split('-')[1]);
    }

    return [];
  };

  // Helper function to determine service type for a country
  const getCountryServiceType = (countryName, addressType) => {
    let serviceTypes;
    if (addressType === 'pickup') {
      serviceTypes = pickupCountryServiceTypes;
    } else if (addressType === 'destination') {
      serviceTypes = destinationCountryServiceTypes;
    } else if (addressType === 'cleaning') {
      serviceTypes = cleaningCountryServiceTypes;
    }

    // If we have an explicit choice stored, use that
    if (serviceTypes && serviceTypes[countryName] !== undefined) {
      return serviceTypes[countryName] === 'cities';
    }

    const addressData = settings.preferences[addressType];
    if (!addressData) return false;

    // Use serviceArea structure for all services (cleaning uses same format as pickup/destination)
    if (addressData.serviceArea) {
      const serviceAreaObj = addressData.serviceArea instanceof Map
        ? Object.fromEntries(addressData.serviceArea)
        : addressData.serviceArea;

      if (serviceAreaObj[countryName]) {
        return serviceAreaObj[countryName].type === 'cities';
      }
    }

    // Legacy fallback only for moving service citySettings
    if (addressType !== 'cleaning') {
      const cityKeys = Object.keys(addressData.citySettings || {}).filter(key =>
        key.startsWith(`${countryName}-`)
      );
      return cityKeys.length > 0; // true = cities, false = whole country
    }

    return false; // Default to whole country
  };

  const handleServiceTypeChange = (countryName, serviceType, addressType) => {
    // Store the explicit choice
    let setServiceTypes;
    if (addressType === 'pickup') {
      setServiceTypes = setPickupCountryServiceTypes;
    } else if (addressType === 'destination') {
      setServiceTypes = setDestinationCountryServiceTypes;
    } else if (addressType === 'cleaning') {
      setServiceTypes = setCleaningCountryServiceTypes;
    }

    if (setServiceTypes) {
      setServiceTypes(prev => ({
        ...prev,
        [countryName]: serviceType
      }));
    }

    // Update serviceArea structure for all services
    setSettings(prev => {
      const currentPrefs = prev.preferences[addressType];
      const currentServiceArea = currentPrefs.serviceArea || {};

      if (serviceType === 'country') {
        // Set country to "whole country" mode - remove cities data
        const newServiceArea = {
          ...currentServiceArea,
          [countryName]: { type: 'country' }
        };

        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            [addressType]: {
              ...currentPrefs,
              serviceArea: newServiceArea
            }
          }
        };
      } else {
        // Set country to "cities" mode - initialize cities object
        const newServiceArea = {
          ...currentServiceArea,
          [countryName]: { type: 'cities', cities: {} }
        };

        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            [addressType]: {
              ...currentPrefs,
              serviceArea: newServiceArea
            }
          }
        };
      }
    });
  };

  const handleCountryToggle = (countryName, checked, addressType) => {
    // Set service types for all address types including cleaning
    let setServiceTypes;
    if (addressType === 'pickup') {
      setServiceTypes = setPickupCountryServiceTypes;
    } else if (addressType === 'destination') {
      setServiceTypes = setDestinationCountryServiceTypes;
    } else if (addressType === 'cleaning') {
      setServiceTypes = setCleaningCountryServiceTypes;
    }

    if (setServiceTypes) {
      if (checked) {
        // Set default service type to "country" when adding a new country
        setServiceTypes(prev => ({
          ...prev,
          [countryName]: 'country'
        }));
      } else {
        // Remove service type when removing country
        setServiceTypes(prev => {
          const newTypes = { ...prev };
          delete newTypes[countryName];
          return newTypes;
        });
      }
    }

    setSettings(prev => {
      if (addressType === 'cleaning') {
        // For cleaning service, only manage serviceArea (no countries array)
        const currentServiceArea = prev.preferences[addressType].serviceArea || {};
        const newServiceArea = { ...currentServiceArea };

        if (checked) {
          // Add country to serviceArea if not already exists
          if (!newServiceArea[countryName]) {
            newServiceArea[countryName] = {
              type: 'country',
              cities: {}
            };
          }
        } else {
          // Remove country from serviceArea
          delete newServiceArea[countryName];
        }

        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            [addressType]: {
              ...prev.preferences[addressType],
              serviceArea: newServiceArea
            }
          }
        };
      } else {
        // For moving services (pickup/destination), use countries array
        const currentCountries = prev.preferences[addressType].countries || [];
        let newCountries = [...currentCountries];

        if (checked) {
          // Add country if not already in list
          if (!newCountries.includes(countryName)) {
            newCountries.push(countryName);
          }
        } else {
          // Remove country and all its data from settings
          newCountries = newCountries.filter(c => c !== countryName);

          // Remove from serviceArea
          const currentServiceArea = prev.preferences[addressType].serviceArea || {};
          const newServiceArea = { ...currentServiceArea };
          delete newServiceArea[countryName];

          // Clean citySettings
          const currentCitySettings = prev.preferences[addressType].citySettings || {};
          const newCitySettings = { ...currentCitySettings };

          // Remove all cities from this country
          Object.keys(newCitySettings).forEach(cityKey => {
            if (cityKey.startsWith(`${countryName}-`)) {
              delete newCitySettings[cityKey];
            }
          });

          return {
            ...prev,
            preferences: {
              ...prev.preferences,
              [addressType]: {
                ...prev.preferences[addressType],
                countries: newCountries,
                serviceArea: newServiceArea,
                citySettings: newCitySettings
              }
            }
          };
        }

        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            [addressType]: {
              ...prev.preferences[addressType],
              countries: newCountries
            }
          }
        };
      }
    });
  };

  // Handle city toggle by country for cleaning service
  const handleCityToggleByCountry = (addressType, countryCode, city, checked) => {
    setSettings(prev => {
      const currentCitySettings = prev.preferences[addressType].citySettings || {};
      const newCitySettings = { ...currentCitySettings };

      if (addressType === 'cleaning') {
        // For cleaning, use simple structure: { "DE": ["Berlin", "Munich"] }
        const currentCities = newCitySettings[countryCode] || [];

        if (checked) {
          // Add city if not already in list
          if (!currentCities.includes(city)) {
            newCitySettings[countryCode] = [...currentCities, city];
          }
        } else {
          // Remove city from list
          newCitySettings[countryCode] = currentCities.filter(c => c !== city);

          // If no cities left, remove the country entry
          if (newCitySettings[countryCode].length === 0) {
            delete newCitySettings[countryCode];
          }
        }
      }

      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          [addressType]: {
            ...prev.preferences[addressType],
            citySettings: newCitySettings
          }
        }
      };
    });
  };

  // Handle radius change by country for cleaning service
  const handleRadiusByCountry = (addressType, countryCode, radius) => {
    setSettings(prev => {
      const currentCitySettings = prev.preferences[addressType].citySettings || {};
      const newCitySettings = { ...currentCitySettings };

      if (addressType === 'cleaning') {
        // Store radius as countryCode_radius
        newCitySettings[`${countryCode}_radius`] = radius;
      }

      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          [addressType]: {
            ...prev.preferences[addressType],
            citySettings: newCitySettings
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

            {/* Pickup Address Configuration */}
            <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-lg">
              <h4 className="text-lg font-semibold mb-4 text-green-800">
                📦 {isGerman ? 'Abholungsadresse-Konfiguration' : 'Pickup Address Configuration'}
              </h4>
              
              {/* Country Dropdown for Pickup */}
              <div className="bg-white rounded-lg border p-4 max-w-md mb-6" style={{ borderColor: 'var(--theme-border)' }}>
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
                      if (e.target.value && !settings.preferences.pickup.countries.includes(e.target.value)) {
                        handleCountryToggle(e.target.value, true, 'pickup');
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">{isGerman ? 'Land auswählen...' : 'Select country...'}</option>
                    {availableCountries
                      .filter(country => !settings.preferences.pickup.countries.includes(country.code))
                      .map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                  </select>
                  {settings.preferences.pickup.countries.length > 0 && (
                    <span className="text-sm px-3 py-1 rounded-full font-medium" style={{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-text)' }}>
                      {settings.preferences.pickup.countries.length}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Selected Countries for Pickup */}
              {settings.preferences.pickup.countries.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getConfiguredCountries('pickup').map((countryName) => {
                  // First, check if countryName is actually a country code
                  let country = availableCountries.find(c => c.code === countryName);
                  
                  // If not found by code, try to find by name
                  if (!country) {
                    country = availableCountries.find(c => c.name === countryName);
                  }
                  
                  // If still not found, try the English name mapping
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
                  
                  const countryCode = country?.code || countryName; // fallback to countryName if it's a valid code
                  const cities = citiesByCountry[countryCode] || [];
                  const selectedCities = getSelectedCitiesForCountry(countryName, 'pickup');
                  
                  
                  return (
                    <div 
                      key={countryName} 
                      className="border rounded-lg p-4" 
                      style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}
                    >
                      {/* Country Header */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                          🌍 {getCountryNameFromCode(countryName)}
                        </span>
                        <button
                          onClick={() => handleCountryToggle(countryCode, false, 'pickup')}
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
                              name={`pickup-${countryName}-service-type`}
                              checked={!getCountryServiceType(countryName, 'pickup')}
                              onChange={() => handleServiceTypeChange(countryName, 'country', 'pickup')}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                              {isGerman ? 'Ganzes Land' : 'Whole Country'}
                            </span>
                          </label>
                          
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name={`pickup-${countryName}-service-type`}
                              checked={getCountryServiceType(countryName, 'pickup')}
                              onChange={() => handleServiceTypeChange(countryName, 'cities', 'pickup')}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                              {isGerman ? 'Nur bestimmte Städte' : 'Specific Cities Only'}
                            </span>
                          </label>
                        </div>
                        
                        <div className="mt-2 text-xs" style={{ color: 'var(--theme-muted)' }}>
                          {!getCountryServiceType(countryName, 'pickup')
                            ? (isGerman ? 'Abholung im gesamten Land verfügbar' : 'Pickup available throughout the entire country')
                            : (isGerman ? 'Abholung nur in ausgewählten Städten verfügbar' : 'Pickup only available in selected cities')
                          }
                        </div>
                      </div>
                      
                      {/* City Dropdown - Only show when "Specific Cities Only" is selected */}
                      {getCountryServiceType(countryName, 'pickup') && (
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
                                handleCityToggle('moving', e.target.value, true, countryName, 'pickup');
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
                      {getCountryServiceType(countryName, 'pickup') && (
                        <div>
                          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                            {isGerman ? 'Ausgewählte Städte:' : 'Selected Cities:'}
                          </label>
                          <div className="space-y-3">
                            {selectedCities.map(city => {
                              const cityKey = `${countryName}-${city}`;
                              const radius = settings.preferences.pickup.citySettings[cityKey]?.radius || 0;
                              const isCityOnly = radius === 0;
                              
                              return (
                                <div key={city} className="p-3 rounded border space-y-3" style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)' }}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium" style={{ color: 'var(--theme-text)' }}>
                                      📍 {city}
                                    </span>
                                    <button
                                      onClick={() => handleCityToggle('moving', city, false, countryName, 'pickup')}
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
                                          name={`pickup-${cityKey}-type`}
                                          checked={isCityOnly}
                                          onChange={() => handleCityRadiusChange(cityKey, 0, 'pickup')}
                                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                                          {isGerman ? 'Nur Stadt' : 'City only'}
                                        </span>
                                      </label>
                                      
                                      <label className="flex items-center cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`pickup-${cityKey}-type`}
                                          checked={!isCityOnly}
                                          onChange={() => handleCityRadiusChange(cityKey, radius > 0 ? radius : 10, 'pickup')}
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
                                          onChange={(e) => handleCityRadiusChange(cityKey, e.target.value, 'pickup')}
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
              )}
            </div>
            
            {/* Destination Address Configuration */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
              <h4 className="text-lg font-semibold mb-4 text-blue-800">
                🎯 {isGerman ? 'Zieladresse-Konfiguration' : 'Destination Address Configuration'}
              </h4>
              
              {/* Country Dropdown for Destination */}
              <div className="bg-white rounded-lg border p-4 max-w-md mb-6" style={{ borderColor: 'var(--theme-border)' }}>
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
                      if (e.target.value && !settings.preferences.destination.countries.includes(e.target.value)) {
                        handleCountryToggle(e.target.value, true, 'destination');
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">{isGerman ? 'Land auswählen...' : 'Select country...'}</option>
                    {availableCountries
                      .filter(country => !settings.preferences.destination.countries.includes(country.code))
                      .map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                  </select>
                  {settings.preferences.destination.countries.length > 0 && (
                    <span className="text-sm px-3 py-1 rounded-full font-medium" style={{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-text)' }}>
                      {settings.preferences.destination.countries.length}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Selected Countries for Destination */}
              {settings.preferences.destination.countries.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getConfiguredCountries('destination').map((countryName) => {
                  // First, check if countryName is actually a country code
                  let country = availableCountries.find(c => c.code === countryName);
                  
                  // If not found by code, try to find by name
                  if (!country) {
                    country = availableCountries.find(c => c.name === countryName);
                  }
                  
                  // If still not found, try the English name mapping
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
                  
                  const countryCode = country?.code || countryName; // fallback to countryName if it's a valid code
                  const cities = citiesByCountry[countryCode] || [];
                  const selectedCities = getSelectedCitiesForCountry(countryName, 'destination');
                  
                  return (
                    <div 
                      key={countryName} 
                      className="border rounded-lg p-4" 
                      style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}
                    >
                      {/* Country Header */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                          🌍 {getCountryNameFromCode(countryName)}
                        </span>
                        <button
                          onClick={() => handleCountryToggle(countryCode, false, 'destination')}
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
                              name={`destination-${countryName}-service-type`}
                              checked={!getCountryServiceType(countryName, 'destination')}
                              onChange={() => handleServiceTypeChange(countryName, 'country', 'destination')}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                              {isGerman ? 'Ganzes Land' : 'Whole Country'}
                            </span>
                          </label>
                          
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name={`destination-${countryName}-service-type`}
                              checked={getCountryServiceType(countryName, 'destination')}
                              onChange={() => handleServiceTypeChange(countryName, 'cities', 'destination')}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                              {isGerman ? 'Nur bestimmte Städte' : 'Specific Cities Only'}
                            </span>
                          </label>
                        </div>
                        
                        <div className="mt-2 text-xs" style={{ color: 'var(--theme-muted)' }}>
                          {!getCountryServiceType(countryName, 'destination')
                            ? (isGerman ? 'Lieferung im gesamten Land verfügbar' : 'Delivery available throughout the entire country')
                            : (isGerman ? 'Lieferung nur in ausgewählten Städten verfügbar' : 'Delivery only available in selected cities')
                          }
                        </div>
                      </div>
                      
                      {/* City Dropdown - Only show when "Specific Cities Only" is selected */}
                      {getCountryServiceType(countryName, 'destination') && (
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
                                handleCityToggle('moving', e.target.value, true, countryName, 'destination');
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
                      {getCountryServiceType(countryName, 'destination') && (
                        <div>
                          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                            {isGerman ? 'Ausgewählte Städte:' : 'Selected Cities:'}
                          </label>
                          <div className="space-y-3">
                            {selectedCities.map(city => {
                              const cityKey = `${countryName}-${city}`;
                              const radius = settings.preferences.destination.citySettings[cityKey]?.radius || 0;
                              const isCityOnly = radius === 0;
                              
                              return (
                                <div key={city} className="p-3 rounded border space-y-3" style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)' }}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium" style={{ color: 'var(--theme-text)' }}>
                                      📍 {city}
                                    </span>
                                    <button
                                      onClick={() => handleCityToggle('moving', city, false, countryName, 'destination')}
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
                                          name={`destination-${cityKey}-type`}
                                          checked={isCityOnly}
                                          onChange={() => handleCityRadiusChange(cityKey, 0, 'destination')}
                                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                                          {isGerman ? 'Nur Stadt' : 'City only'}
                                        </span>
                                      </label>
                                      
                                      <label className="flex items-center cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`destination-${cityKey}-type`}
                                          checked={!isCityOnly}
                                          onChange={() => handleCityRadiusChange(cityKey, radius > 0 ? radius : 10, 'destination')}
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
                                          onChange={(e) => handleCityRadiusChange(cityKey, e.target.value, 'destination')}
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
              )}
            </div>
            
            {/* Summary */}
            {((settings.preferences.pickup?.countries?.length || 0) > 0 ||
             (settings.preferences.destination?.countries?.length || 0) > 0 ||
             Object.keys(settings.preferences.pickup?.citySettings || {}).length > 0 ||
             Object.keys(settings.preferences.destination?.citySettings || {}).length > 0) && (
              <div className="text-sm p-4 bg-gray-50 rounded-lg" style={{ color: 'var(--theme-muted)' }}>
                <strong>{isGerman ? 'Zusammenfassung:' : 'Summary:'}</strong><br/>
                📦 {isGerman ? 'Abholung:' : 'Pickup:'} {settings.preferences.pickup?.countries?.length || 0} {isGerman ? 'Länder' : 'countries'}, {Object.keys(settings.preferences.pickup?.citySettings || {}).length} {isGerman ? 'Städte' : 'cities'}<br/>
                🎯 {isGerman ? 'Lieferung:' : 'Destination:'} {settings.preferences.destination?.countries?.length || 0} {isGerman ? 'Länder' : 'countries'}, {Object.keys(settings.preferences.destination?.citySettings || {}).length} {isGerman ? 'Städte' : 'cities'}
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

            {/* Service Area Configuration */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
              <h4 className="text-lg font-semibold mb-4 text-blue-800">
                🧽 {isGerman ? 'Service-Bereich-Konfiguration' : 'Service Area Configuration'}
              </h4>

              {/* Country Dropdown for Cleaning */}
              <div className="bg-white rounded-lg border p-4 max-w-md mb-6" style={{ borderColor: 'var(--theme-border)' }}>
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
                      const configuredCountries = getConfiguredCountries('cleaning');
                      if (e.target.value && !configuredCountries.includes(e.target.value)) {
                        handleCountryToggle(e.target.value, true, 'cleaning');
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">{isGerman ? 'Land auswählen...' : 'Select country...'}</option>
                    {availableCountries
                      .filter(country => !getConfiguredCountries('cleaning').includes(country.name))
                      .map(country => (
                        <option key={country.code} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                  </select>
                  {getConfiguredCountries('cleaning').length > 0 && (
                    <span className="text-sm px-3 py-1 rounded-full font-medium" style={{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-text)' }}>
                      {getConfiguredCountries('cleaning').length}
                    </span>
                  )}
                </div>
              </div>

              {/* Selected Countries for Cleaning */}
              {getConfiguredCountries('cleaning').length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getConfiguredCountries('cleaning').map((countryName) => {
                  // First, check if countryName is actually a country code
                  let country = availableCountries.find(c => c.code === countryName);

                  // If not found by code, try to find by name
                  if (!country) {
                    country = availableCountries.find(c => c.name === countryName);
                  }

                  // If still not found, try the English name mapping
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

                  const countryCode = country?.code || countryName; // fallback to countryName if it's a valid code
                  const cities = citiesByCountry[countryCode] || [];
                  const selectedCities = getSelectedCitiesForCountry(countryName, 'cleaning');


                  return (
                    <div
                      key={countryName}
                      className="border rounded-lg p-4"
                      style={{
                        backgroundColor: 'var(--theme-bg)',
                        borderColor: 'var(--theme-border)'
                      }}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg" style={{ color: 'var(--theme-text)' }}>
                            {country?.flag} {country?.name || countryName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCountryToggle(countryName, false, 'cleaning')}
                          className="text-red-500 hover:text-red-700 text-lg font-bold"
                          title={isGerman ? 'Land entfernen' : 'Remove country'}
                        >
                          ✕
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
                              name={`cleaning-${countryName}-service-type`}
                              checked={!getCountryServiceType(countryName, 'cleaning')}
                              onChange={() => handleServiceTypeChange(countryName, 'country', 'cleaning')}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                              {isGerman ? 'Ganzes Land' : 'Whole Country'}
                            </span>
                          </label>

                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name={`cleaning-${countryName}-service-type`}
                              checked={getCountryServiceType(countryName, 'cleaning')}
                              onChange={() => handleServiceTypeChange(countryName, 'cities', 'cleaning')}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                              {isGerman ? 'Nur bestimmte Städte' : 'Specific Cities Only'}
                            </span>
                          </label>
                        </div>

                        <div className="mt-2 text-xs" style={{ color: 'var(--theme-muted)' }}>
                          {!getCountryServiceType(countryName, 'cleaning')
                            ? (isGerman ? 'Reinigung im gesamten Land verfügbar' : 'Cleaning available throughout the entire country')
                            : (isGerman ? 'Reinigung nur in ausgewählten Städten verfügbar' : 'Cleaning only available in selected cities')
                          }
                        </div>
                      </div>

                      {/* City Dropdown - Only show when "Specific Cities Only" is selected */}
                      {getCountryServiceType(countryName, 'cleaning') && (
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
                                handleCityToggle('cleaning', e.target.value, true, countryName, 'cleaning');
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
                      {getCountryServiceType(countryName, 'cleaning') && (
                        <div>
                          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                            {isGerman ? 'Ausgewählte Städte:' : 'Selected Cities:'}
                          </label>
                          <div className="space-y-3">
                            {selectedCities.map(city => {
                              const cityKey = `${countryName}-${city}`;
                              // Get radius from serviceArea structure
                              const serviceArea = settings.preferences.cleaning.serviceArea || {};
                              const countryData = serviceArea[countryName] || {};
                              const cityData = countryData.cities || {};
                              const radius = cityData[city]?.radius || 0;
                              const isCityOnly = radius === 0;

                              return (
                                <div key={city} className="p-3 rounded border space-y-3" style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)' }}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium" style={{ color: 'var(--theme-text)' }}>
                                      🧽 {city}
                                    </span>
                                    <button
                                      onClick={() => handleCityToggle('cleaning', city, false, countryName, 'cleaning')}
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
                                          name={`cleaning-${cityKey}-type`}
                                          checked={isCityOnly}
                                          onChange={() => handleCityRadiusToggle(cityKey, 'city', 'cleaning')}
                                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                                          {isGerman ? 'Nur Stadt' : 'City Only'}
                                        </span>
                                      </label>

                                      <label className="flex items-center cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`cleaning-${cityKey}-type`}
                                          checked={!isCityOnly}
                                          onChange={() => handleCityRadiusToggle(cityKey, 'radius', 'cleaning')}
                                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                                          {isGerman ? 'Mit Umkreis' : 'With Radius'}
                                        </span>
                                      </label>
                                    </div>
                                  </div>

                                  {/* Radius Slider - Only show when "With Radius" is selected */}
                                  {!isCityOnly && (
                                    <div className="pt-2">
                                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                                        📏 {isGerman ? 'Umkreis:' : 'Radius:'} {' '}
                                        <span className="font-bold text-blue-600">
                                          {radius} km
                                        </span>
                                      </label>
                                      <input
                                        type="range"
                                        min="1"
                                        max="200"
                                        step="5"
                                        value={radius}
                                        onChange={(e) => handleCityRadiusChange(cityKey, parseInt(e.target.value), 'cleaning')}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                        style={{ background: 'linear-gradient(to right, #3b82f6 0%, #3b82f6 50%, #d1d5db 50%, #d1d5db 100%)' }}
                                      />
                                      <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
                                        <span>1km</span>
                                        <span>200km</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Whole Country Info - Only show when "Whole Country" is selected */}
                      {!getCountryServiceType(countryName, 'cleaning') && (
                        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center">
                            <span className="text-green-600 mr-2">✓</span>
                            <span className="text-sm text-green-700">
                              {isGerman ?
                                `Service im gesamten ${getCountryNameFromCode(countryName)} verfügbar` :
                                `Service available throughout ${getCountryNameFromCode(countryName)}`
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              )}

              {/* Instructions when no countries selected */}
              {getConfiguredCountries('cleaning').length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--theme-border)' }}>
                  <div className="text-4xl mb-2">🌍</div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Keine Länder ausgewählt' : 'No Countries Selected'}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                    {isGerman ?
                      'Wählen Sie Länder aus dem Dropdown-Menü oben aus, um Ihren Service-Bereich zu konfigurieren.' :
                      'Select countries from the dropdown above to configure your service area.'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Summary */}
            {getConfiguredCountries('cleaning').length > 0 && (
              <div className="text-sm p-4 bg-gray-50 rounded-lg" style={{ color: 'var(--theme-muted)' }}>
                <strong>{isGerman ? 'Zusammenfassung:' : 'Summary:'}</strong><br/>
                🧽 {isGerman ? 'Reinigungsservice:' : 'Cleaning Service:'} {getConfiguredCountries('cleaning').length} {isGerman ? 'Länder' : 'countries'}, {
                  Object.keys(settings.preferences.cleaning.serviceArea || {}).reduce((total, country) => {
                    const countryData = settings.preferences.cleaning.serviceArea[country];
                    return total + (countryData?.cities ? Object.keys(countryData.cities).length : 0);
                  }, 0)
                } {isGerman ? 'Städte' : 'cities'}
              </div>
            )}

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