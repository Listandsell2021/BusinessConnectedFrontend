import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useService } from '../../../contexts/ServiceContext';
import { partnersAPI, authAPI } from '../../../lib/api/api';
import { toast } from 'react-hot-toast';
import PasswordStrengthIndicator from '../../../components/ui/PasswordStrengthIndicator';
import { validatePasswordStrength } from '../../../../utils/passwordGenerator';

const PartnerSettingsNew = () => {
  const { isGerman } = useLanguage();
  const { user, isPartner, isSuperAdmin, updateUser } = useAuth();
  const { currentService } = useService();
  
  const [activeTab, setActiveTab] = useState('contact');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [partnerData, setPartnerData] = useState(null);
  const [remountKey, setRemountKey] = useState(0);

  //Password change dialog state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Available services - security only
  const [availableServices] = useState(['security']);
  
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

    // Lead Acceptance Settings
    requireManualAcceptance: true,

    // Custom Pricing Settings
    customPricing: {
      perLeadPrice: null,
      leadsPerWeek: null
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
      serviceArea: {
        countries: [],
        citySettings: {
          // Format: { 'DE-Berlin': { radius: 50, country: 'DE' }, 'AT-Vienna': { radius: 30, country: 'AT' } }
        }
      }
    }
  });

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
      console.log('Partner preferences from API:', JSON.stringify(response.data.partner?.preferences, null, 2));

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
        let serviceArea = {};

        if (addressData?.serviceArea) {
          const serviceAreaObj = addressData.serviceArea instanceof Map
            ? Object.fromEntries(addressData.serviceArea)
            : addressData.serviceArea;

          // Keep a copy of serviceArea for state
          serviceArea = JSON.parse(JSON.stringify(serviceAreaObj));

          countries = Object.keys(serviceAreaObj).map(key => {
            if (key.length === 2) {
              return getCountryNameFromCode(key);
            }
            return key;
          });

          Object.entries(serviceAreaObj).forEach(([countryKey, config]) => {
            const countryName = countryKey.length === 2 ? getCountryNameFromCode(countryKey) : countryKey;

            // Also update the serviceArea with proper country names
            if (countryKey.length === 2) {
              serviceArea[countryName] = serviceArea[countryKey];
              delete serviceArea[countryKey];
            }

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

          // Build serviceArea from citySettings for backwards compatibility
          serviceArea = {};
          countries.forEach(countryName => {
            const countryCities = {};
            Object.entries(citySettings).forEach(([key, config]) => {
              if (key.startsWith(`${countryName}-`)) {
                const cityName = key.split('-')[1];
                countryCities[cityName] = { radius: config.radius || 0 };
              }
            });

            serviceArea[countryName] = {
              type: Object.keys(countryCities).length > 0 ? 'cities' : 'country',
              cities: countryCities
            };
          });
        }

        return { countries, citySettings, serviceArea };
      };


      setSettings({
        companyName: partner.companyName || '',
        contactPerson: partner.contactPerson || {
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
        requireManualAcceptance: partner.leadAcceptance?.requireManualAcceptance ?? true,
        customPricing: {
          perLeadPrice: partner.customPricing?.perLeadPrice || null,
          leadsPerWeek: partner.customPricing?.leadsPerWeek || null
        },
        preferences: {
          serviceArea: (() => {
            let serviceAreaCountries = [];
            let serviceAreaCitySettings = {};
            let securityServiceArea = {};

            if (partner.preferences?.security?.serviceArea) {
              const securityData = processAddressType(partner.preferences.security, 'security');
              serviceAreaCountries = securityData.countries;
              serviceAreaCitySettings = securityData.citySettings;
              securityServiceArea = securityData.serviceArea;
            }

            return {
              countries: serviceAreaCountries,
              citySettings: serviceAreaCitySettings,
              serviceArea: securityServiceArea
            };
          })()
        }
      });
      
      // Initialize country service types based on loaded data for security service
      const initialServiceAreaServiceTypes = {};

      // For security service - check both citySettings and serviceArea structure
      settings.preferences.serviceArea.countries.forEach(countryName => {
        const hasCountryCities = Object.keys(settings.preferences.serviceArea.citySettings).some(cityKey =>
          cityKey.startsWith(`${countryName}-`)
        );

        // Also check serviceArea structure for security service
        const serviceAreaData = partner.preferences?.security?.serviceArea?.[countryName];
        const hasServiceAreaCities = serviceAreaData?.type === 'cities' &&
          Object.keys(serviceAreaData.cities || {}).length > 0;

        const serviceType = (hasCountryCities || hasServiceAreaCities) ? 'cities' : 'country';
        initialServiceAreaServiceTypes[countryName] = serviceType;

        console.log(`Security ServiceArea ${countryName}: hasCountryCities=${hasCountryCities}, hasServiceAreaCities=${hasServiceAreaCities}, serviceType=${serviceType}`);
      });

      console.log('Initial serviceArea service types:', initialServiceAreaServiceTypes);

      setServiceAreaCountryServiceTypes(initialServiceAreaServiceTypes);
      
      console.log('Settings loaded successfully');
    } catch (error) {
      console.error('Error loading partner data:', error);
      toast.error(isGerman ? 'Fehler beim Laden der Einstellungen' : 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartnerData();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);

    // Small delay to ensure all state updates are complete
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // Convert structure for saving with pickup and destination
      const buildServiceArea = (countries, citySettings, serviceTypes, addressType) => {
        const serviceArea = {};

        countries.forEach(countryName => {
          // Check if user explicitly selected service type - use current state values
          const explicitServiceType = serviceTypes[countryName];

          if (explicitServiceType === 'country') {
            // User explicitly selected "Whole Country"
            serviceArea[countryName] = {
              type: 'country',
              cities: {}
            };
            console.log(`${addressType} ${countryName}: Using WHOLE COUNTRY (explicit choice)`);
          } else if (explicitServiceType === 'cities') {
            // User explicitly selected "Specific Cities Only"
            const countryCities = {};
            Object.entries(citySettings).forEach(([cityKey, cityConfig]) => {
              if (cityKey.startsWith(`${countryName}-`)) {
                const cityName = cityKey.split('-')[1];
                countryCities[cityName] = {
                  radius: cityConfig.radius || 0
                };
              }
            });

            serviceArea[countryName] = {
              type: 'cities',
              cities: countryCities
            };
            console.log(`${addressType} ${countryName}: Using SPECIFIC CITIES (explicit choice) - cities:`, Object.keys(countryCities));
          } else {
            // Fallback to old logic if no explicit choice
            const countryCities = {};
            let hasCountryCities = false;

            Object.entries(citySettings).forEach(([cityKey, cityConfig]) => {
              if (cityKey.startsWith(`${countryName}-`)) {
                const cityName = cityKey.split('-')[1];
                countryCities[cityName] = {
                  radius: cityConfig.radius || 0
                };
                hasCountryCities = true;
              }
            });

            serviceArea[countryName] = {
              type: hasCountryCities ? 'cities' : 'country',
              cities: countryCities
            };
            console.log(`${addressType} ${countryName}: Using FALLBACK logic - type: ${hasCountryCities ? 'cities' : 'country'}`);
          }
        });

        return serviceArea;
      };

      // Log current state values to debug
      console.log('Current serviceAreaCountryServiceTypes at save time:', serviceAreaCountryServiceTypes);
      console.log('Current settings at save time:', settings);

      // Build preferences based on service type
      let preferences = {};

      if (currentService === 'security') {
        // For security service, use security key with serviceArea structure
        const securityServiceArea = buildServiceArea(
          settings.preferences.serviceArea.countries || [],
          settings.preferences.serviceArea.citySettings || {},
          serviceAreaCountryServiceTypes,
          'serviceArea'
        );
        preferences = {
          security: {
            serviceArea: securityServiceArea
          }
        };
      } else {
        // Fallback for other services (should not happen with security-only system)
        preferences = {
          security: {
            countries: settings.preferences.serviceArea.countries,
            citySettings: settings.preferences.serviceArea.citySettings,
            serviceArea: buildServiceArea(
              settings.preferences.serviceArea.countries || [],
              settings.preferences.serviceArea.citySettings || {},
              serviceAreaCountryServiceTypes,
              'serviceArea'
            )
          }
        };
      }

      const updateData = {
        companyName: settings.companyName,
        contactPerson: settings.contactPerson,
        address: settings.address,
        leadAcceptance: {
          requireManualAcceptance: settings.requireManualAcceptance
        },
        customPricing: {
          perLeadPrice: settings.customPricing?.perLeadPrice || null,
          leadsPerWeek: settings.customPricing?.leadsPerWeek || null
        },
        preferences: preferences
      };

      console.log('Saving partner settings:', updateData);

      const response = await partnersAPI.update(user.id, updateData);
      console.log('Save response:', response.data);

      // Show success message
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

  const handlePasswordResetRequest = () => {
    setShowPasswordDialog(true);
    setPasswordData({ newPassword: '', confirmPassword: '' });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handlePasswordChange = async () => {
    // Validation
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error(isGerman ? 'Bitte füllen Sie alle Felder aus' : 'Please fill all fields');
      return;
    }

    // Validate password strength (12 chars + complexity)
    const validation = validatePasswordStrength(passwordData.newPassword);
    if (!validation.isValid) {
      toast.error(validation.messages[0]);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(isGerman ? 'Passwörter stimmen nicht überein' : 'Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      console.log('Changing password for partner:', user.id);

      const response = await authAPI.changePartnerPassword({
        partnerId: user.id,
        newPassword: passwordData.newPassword,
        email: partnerData?.contactPerson?.email || user.email,
        isGerman: isGerman
      });

      console.log('Password change response:', response.data);

      if (response.data.success) {
        toast.success(isGerman
          ? 'Passwort erfolgreich geändert! E-Mail wurde an den Partner gesendet.'
          : 'Password changed successfully! Email has been sent to the partner.'
        );
        setShowPasswordDialog(false);
        setPasswordData({ newPassword: '', confirmPassword: '' });
      } else {
        toast.error(response.data.message || (isGerman
          ? 'Fehler beim Ändern des Passworts'
          : 'Error changing password'
        ));
      }
    } catch (error) {
      console.error('Password change error:', error);
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(isGerman
        ? `Fehler beim Ändern des Passworts: ${errorMessage}`
        : `Error changing password: ${errorMessage}`
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCityToggle = (service, city, checked, country = null, addressType = null) => {
    if (service === 'cleaning' && addressType === 'serviceArea') {
      // For cleaning service, use flattened structure - only update citySettings
      setSettings(prev => {
        const currentPrefs = prev.preferences[addressType];
        const currentCitySettings = currentPrefs.citySettings || {};

        // Create city key for citySettings
        const cityKey = `${country}-${city}`;
        let newCitySettings = { ...currentCitySettings };

        if (checked) {
          // Add to citySettings
          newCitySettings[cityKey] = { radius: 0 };
        } else {
          // Remove from citySettings
          delete newCitySettings[cityKey];
        }

        console.log(`Updated ${addressType} for ${country}-${city}: checked=${checked}`);
        console.log('New citySettings:', newCitySettings);

        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            [addressType]: {
              ...currentPrefs,
              citySettings: newCitySettings
            }
          }
        };
      });
    } else if (service === 'security' && addressType) {
      // For moving service, update both serviceArea AND citySettings (nested structure)
      setSettings(prev => {
        console.log(`🔍 BEFORE UPDATE - Full prev state for ${addressType}:`, JSON.stringify(prev.preferences[addressType], null, 2));

        const currentPrefs = prev.preferences[addressType] || {};
        const currentServiceArea = currentPrefs.serviceArea || {};
        const currentCitySettings = currentPrefs.citySettings || {};

        console.log(`📋 Current serviceArea for ${country}:`, currentServiceArea[country] ? Object.keys(currentServiceArea[country].cities || {}) : 'not found');

        // Create city key for citySettings
        const cityKey = `${country}-${city}`;

        // TRUE DEEP COPY using JSON parse/stringify to avoid any reference issues
        const newServiceArea = JSON.parse(JSON.stringify(currentServiceArea));
        const newCitySettings = JSON.parse(JSON.stringify(currentCitySettings));

        // MIGRATION: If serviceArea for this country doesn't exist, migrate all cities from citySettings
        if (!newServiceArea[country]) {
          newServiceArea[country] = { type: 'cities', cities: {} };

          // Find all cities for this country in citySettings and add them to serviceArea
          Object.keys(currentCitySettings).forEach(key => {
            if (key.startsWith(`${country}-`)) {
              const cityName = key.split('-')[1];
              const cityData = currentCitySettings[key];
              newServiceArea[country].cities[cityName] = { radius: cityData.radius || 0 };
              console.log(`🔄 Migrated ${cityName} from citySettings to serviceArea`);
            }
          });
        }

        // Ensure cities object exists
        if (!newServiceArea[country].cities) {
          newServiceArea[country].cities = {};
        }

        if (checked) {
          // Add city to serviceArea
          newServiceArea[country].cities[city] = { radius: 0 };
          // Also add to citySettings for save function compatibility
          newCitySettings[cityKey] = { radius: 0 };
          console.log(`✅ Added ${city} to ${country} in ${addressType}`);
          console.log(`📊 All cities after add:`, Object.keys(newServiceArea[country].cities));
        } else {
          // Remove city from serviceArea
          delete newServiceArea[country].cities[city];
          // Also remove from citySettings
          delete newCitySettings[cityKey];
          console.log(`❌ Removed ${city} from ${country} in ${addressType}`);

          // If no cities left in country, optionally remove the country
          if (Object.keys(newServiceArea[country].cities).length === 0) {
            delete newServiceArea[country];
            console.log(`🗑️ Removed empty country ${country} from ${addressType}`);
          } else {
            console.log(`📊 Remaining cities after remove:`, Object.keys(newServiceArea[country].cities));
          }
        }

        const newState = {
          ...prev,
          preferences: {
            ...prev.preferences,
            [addressType]: {
              ...currentPrefs,
              serviceArea: newServiceArea,
              citySettings: newCitySettings
            }
          }
        };

        console.log(`🔍 AFTER UPDATE - New state for ${addressType}:`, JSON.stringify(newState.preferences[addressType], null, 2));

        return newState;
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
      const currentCitySettings = currentPrefs.citySettings || {};
      const countryData = currentServiceArea[country] || { type: 'cities', cities: {} };

      // Update serviceArea
      countryData.cities = {
        ...countryData.cities,
        [city]: {
          ...countryData.cities[city],
          radius: parseInt(value)
        }
      };

      // Also update citySettings for save function compatibility
      const newCitySettings = {
        ...currentCitySettings,
        [cityKey]: { radius: parseInt(value) }
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
            },
            citySettings: newCitySettings
          }
        }
      };
    });
  };

  const handleCityRadiusToggle = (cityKey, type, addressType) => {
    const [country, city] = cityKey.split('-');
    const newRadius = type === 'city' ? 0 : 50; // 0 for city only, 50km default for radius

    if (addressType === 'serviceArea') {
      // For cleaning service, only update citySettings (flattened structure)
      setSettings(prev => {
        const currentPrefs = prev.preferences[addressType];
        const currentCitySettings = currentPrefs.citySettings || {};

        const newCitySettings = {
          ...currentCitySettings,
          [cityKey]: { radius: newRadius }
        };

        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            [addressType]: {
              ...currentPrefs,
              citySettings: newCitySettings
            }
          }
        };
      });
    } else {
      // For moving service, update both serviceArea and citySettings (nested structure)
      setSettings(prev => {
        const currentPrefs = prev.preferences[addressType];
        const currentServiceArea = currentPrefs.serviceArea || {};
        const currentCitySettings = currentPrefs.citySettings || {};

        // Create a DEEP COPY of countryData to avoid mutation
        const countryData = currentServiceArea[country]
          ? { ...currentServiceArea[country], cities: { ...currentServiceArea[country].cities } }
          : { type: 'cities', cities: {} };

        // Update serviceArea
        countryData.cities = {
          ...countryData.cities,
          [city]: {
            ...countryData.cities[city],
            radius: newRadius
          }
        };

        // Also update citySettings for save function compatibility
        const newCitySettings = {
          ...currentCitySettings,
          [cityKey]: { radius: newRadius }
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
              },
              citySettings: newCitySettings
            }
          }
        };
      });
    }
  };

  // State to track service type choice for each country (separate for pickup, destination, and serviceArea)
  const [pickupCountryServiceTypes, setPickupCountryServiceTypes] = useState({});
  const [destinationCountryServiceTypes, setDestinationCountryServiceTypes] = useState({});
  const [serviceAreaCountryServiceTypes, setServiceAreaCountryServiceTypes] = useState({});

  // Helper function to get configured countries for specific address type
  const getConfiguredCountries = (addressType) => {
    const addressData = settings.preferences[addressType];
    if (!addressData) return [];

    // For serviceArea (cleaning service), use countries array like pickup/destination
    if (addressType === 'serviceArea') {
      return addressData.countries || [];
    }

    // For pickup and destination, prioritize countries array
    if (addressData.countries && Array.isArray(addressData.countries)) {
      console.log(`getConfiguredCountries(${addressType}) - using countries array:`, addressData.countries);
      return addressData.countries;
    }

    // Fallback to serviceArea if countries array doesn't exist
    if (addressData.serviceArea && typeof addressData.serviceArea === 'object') {
      const serviceAreaObj = addressData.serviceArea instanceof Map
        ? Object.fromEntries(addressData.serviceArea)
        : addressData.serviceArea;
      console.log(`getConfiguredCountries(${addressType}) - using serviceArea fallback:`, Object.keys(serviceAreaObj));
      return Object.keys(serviceAreaObj);
    }

    console.log(`getConfiguredCountries(${addressType}) - no data found, returning empty array`);
    return [];
  };

  // Helper function to get selected cities for a country from both old and new structures
  const getSelectedCitiesForCountry = (countryName, addressType) => {
    const addressData = settings.preferences[addressType];
    if (!addressData) return [];

    // For cleaning service (serviceArea), use citySettings format since we flattened the structure
    if (addressType === 'serviceArea' && addressData.citySettings) {
      const cityKeys = Object.keys(addressData.citySettings).filter(key =>
        key.startsWith(`${countryName}-`)
      );
      return cityKeys.map(key => key.split('-')[1]);
    }

    // For moving services (pickup/destination), use serviceArea structure
    if ((addressType === 'pickup' || addressType === 'destination') && addressData.serviceArea) {
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

    // Legacy fallback for moving service citySettings
    if (addressType !== 'serviceArea' && addressData.citySettings) {
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
    } else if (addressType === 'serviceArea') {
      serviceTypes = serviceAreaCountryServiceTypes;
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
    } else if (addressType === 'serviceArea') {
      setServiceTypes = setServiceAreaCountryServiceTypes;
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
      const currentCitySettings = currentPrefs.citySettings || {};

      if (serviceType === 'country') {
        // Set country to "whole country" mode - remove cities data
        const newServiceArea = {
          ...currentServiceArea,
          [countryName]: { type: 'country' }
        };

        // Clean citySettings by removing cities for this country
        const newCitySettings = { ...currentCitySettings };
        Object.keys(newCitySettings).forEach(cityKey => {
          if (cityKey.startsWith(`${countryName}-`)) {
            delete newCitySettings[cityKey];
          }
        });

        console.log(`Changed ${countryName} to WHOLE COUNTRY for ${addressType}`);

        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            [addressType]: {
              ...currentPrefs,
              citySettings: newCitySettings,
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

        console.log(`Changed ${countryName} to SPECIFIC CITIES for ${addressType}`);

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
    } else if (addressType === 'serviceArea') {
      setServiceTypes = setServiceAreaCountryServiceTypes;
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
      if (addressType === 'serviceArea') {
        // For cleaning service, manage both countries array AND serviceArea
        const currentCountries = prev.preferences[addressType].countries || [];
        const currentServiceArea = prev.preferences[addressType].serviceArea || {};

        let newCountries = [...currentCountries];
        const newServiceArea = { ...currentServiceArea };

        if (checked) {
          // Add country to countries array if not already in list
          if (!newCountries.includes(countryName)) {
            newCountries.push(countryName);
          }
          // Add country to serviceArea if not already exists
          if (!newServiceArea[countryName]) {
            newServiceArea[countryName] = {
              type: 'country',
              cities: {}
            };
          }
        } else {
          // Remove country from countries array
          newCountries = newCountries.filter(c => c !== countryName);
          // Remove country from serviceArea
          delete newServiceArea[countryName];
        }

        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            [addressType]: {
              ...prev.preferences[addressType],
              countries: newCountries,
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

      if (addressType === 'serviceArea') {
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

      if (addressType === 'serviceArea') {
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
          <div className="text-4xl mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
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
      label: isGerman ? 'Kontoeinstellungen' : 'Account Settings'
    },
    {
      id: 'services',
      label: isGerman ? 'Service-Präferenzen' : 'Service Preferences'
    },
    {
      id: 'pricing',
      label: isGerman ? 'Partner-Einstellungen' : 'Partner Settings'
    }
  ];

  const renderContactTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Information */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
            <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {isGerman ? 'Unternehmensinformationen' : 'Company Information'}
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
            <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {isGerman ? 'Adressinformationen' : 'Address Information'}
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

        {/* Lead Acceptance Settings */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
            <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            ⚡ {isGerman ? 'Lead-Annahme' : 'Lead Acceptance'}
          </h3>

          <div className="space-y-4">
            <label className="flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md"
              style={{
                borderColor: !settings.requireManualAcceptance ? '#3B82F6' : 'var(--theme-border)',
                backgroundColor: !settings.requireManualAcceptance ? 'rgba(59, 130, 246, 0.1)' : 'var(--theme-bg)'
              }}
            >
              <input
                type="checkbox"
                checked={!settings.requireManualAcceptance}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  requireManualAcceptance: !e.target.checked
                }))}
                className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  {isGerman
                    ? 'Leads automatisch akzeptieren'
                    : 'Automatically Accept Leads'}
                </div>
                <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman
                    ? 'Wenn aktiviert, werden Ihnen zugewiesene Leads automatisch akzeptiert. Sie müssen Leads nicht mehr manuell annehmen.'
                    : 'When enabled, leads assigned to you will be automatically accepted. You won\'t need to manually accept leads.'}
                </div>
                <div className="mt-2 text-xs px-3 py-2 rounded" style={{
                  backgroundColor: !settings.requireManualAcceptance ? '#DBEAFE' : '#FEF3C7',
                  color: !settings.requireManualAcceptance ? '#1E40AF' : '#92400E'
                }}>
                  {!settings.requireManualAcceptance
                    ? (isGerman ? '✓ Aktiviert: Leads werden automatisch akzeptiert' : '✓ Enabled: Leads will be auto-accepted')
                    : (isGerman ? '✗ Deaktiviert: Manuelle Annahme erforderlich' : '✗ Disabled: Manual acceptance required')
                  }
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Password Change Section */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
            <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {isGerman ? 'Passwort ändern' : 'Change Password'}
          </h3>

          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--theme-text)' }}>
              {isGerman
                ? 'Sie können Ihr Passwort jederzeit ändern. Nach dem Speichern erhalten Sie eine E-Mail mit Ihrem neuen Passwort.'
                : 'You can change your password at any time. After saving, you will receive an email with your new password.'
              }
            </p>

            <button
              onClick={handlePasswordResetRequest}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              {isGerman ? 'Passwort ändern' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderServicesTab = () => (
    <div key={`services-tab-${remountKey}`} className="space-y-6">

      {/* Moving Service Settings */}
      {(!currentService || currentService === 'moving') && (
        <div key={`moving-${remountKey}`} className="p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
            <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            {isGerman ? 'Umzugs-Einstellungen' : 'Moving Settings'}
          </h3>
          
          <div className="border rounded-lg p-4 mb-6" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
            <h4 className="font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Radius-Erklärung:' : 'Radius Explanation:'}
            </h4>
            <ul className="text-sm space-y-1" style={{ color: 'var(--theme-text)' }}>
              <li>• <strong>0 km:</strong> {isGerman ? 'Service nur innerhalb der Stadtgrenzen' : 'Service only within city boundaries'}</li>
              <li>• <strong>{isGerman ? 'Höhere Werte:' : 'Higher values:'}</strong> {isGerman ? 'Service-Radius um die Stadt herum' : 'Service radius around the city'}</li>
            </ul>
          </div>
          
          <div className="space-y-8">

            {/* Pickup Address Configuration - For Moving/Cleaning Partners Only */}
            {partnerServiceType !== 'security' && (
            <div className="border-l-4 p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: '#10b981' }}>
              <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
                📦 {isGerman ? 'Abholungsadresse-Konfiguration' : 'Pickup Address Configuration'}
              </h4>

              {/* Country Dropdown for Pickup */}
              <div className="rounded-lg border p-4 max-w-md mb-6" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
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
                          onClick={() => handleCountryToggle(countryName, false, 'pickup')}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          {isGerman ? 'Entfernen' : 'Remove'}
                        </button>
                      </div>
                      
                      {/* Service Type Toggle */}
                      <div className="mb-4 p-3 rounded-lg border" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
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
                                      {city}
                                    </span>
                                    <button
                                      onClick={() => handleCityToggle('moving', city, false, countryName, 'pickup')}
                                      className="text-red-500 hover:text-red-700 font-medium"
                                    >
                                      ✕
                                    </button>
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
            )}

            {/* Destination Address Configuration - For Moving/Cleaning Partners Only */}
            {partnerServiceType !== 'security' && (
            <div className="border-l-4 p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: '#3b82f6' }}>
              <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
                <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {isGerman ? 'Zieladresse-Konfiguration' : 'Destination Address Configuration'}
              </h4>

              {/* Country Dropdown for Destination */}
              <div className="rounded-lg border p-4 max-w-md mb-6" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
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
                          onClick={() => handleCountryToggle(countryName, false, 'destination')}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          {isGerman ? 'Entfernen' : 'Remove'}
                        </button>
                      </div>
                      
                      {/* Service Type Toggle */}
                      <div className="mb-4 p-3 rounded-lg border" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
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
                                      {city}
                                    </span>
                                    <button
                                      onClick={() => handleCityToggle('moving', city, false, countryName, 'destination')}
                                      className="text-red-500 hover:text-red-700 font-medium"
                                    >
                                      ✕
                                    </button>
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
            )}

            {/* Summary - Only for Moving/Cleaning Partners */}
            {partnerServiceType !== 'security' && (
              ((settings.preferences.pickup?.countries?.length || 0) > 0 ||
               (settings.preferences.destination?.countries?.length || 0) > 0 ||
               Object.keys(settings.preferences.pickup?.citySettings || {}).length > 0 ||
               Object.keys(settings.preferences.destination?.citySettings || {}).length > 0) ? (
                <div className="text-sm p-4 rounded-lg border" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-muted)' }}>
                  <strong>{isGerman ? 'Zusammenfassung:' : 'Summary:'}</strong><br/>
                  📦 {isGerman ? 'Abholung:' : 'Pickup:'} {settings.preferences.pickup?.countries?.length || 0} {isGerman ? 'Länder' : 'countries'}, {
                    Object.keys(settings.preferences.pickup?.serviceArea || {}).reduce((total, country) => {
                      const countryData = settings.preferences.pickup?.serviceArea?.[country];
                      return total + (countryData?.cities ? Object.keys(countryData.cities).length : 0);
                    }, 0)
                  } {isGerman ? 'Städte' : 'cities'}<br/>
                  {isGerman ? 'Lieferung:' : 'Destination:'} {settings.preferences.destination?.countries?.length || 0} {isGerman ? 'Länder' : 'countries'}, {
                    Object.keys(settings.preferences.destination?.serviceArea || {}).reduce((total, country) => {
                      const countryData = settings.preferences.destination?.serviceArea?.[country];
                      return total + (countryData?.cities ? Object.keys(countryData.cities).length : 0);
                    }, 0)
                  } {isGerman ? 'Städte' : 'cities'}
                </div>
              ) : null
            )}

          </div>
        </div>
      )}

    </div>
  );

  const renderPricingTab = () => (
    <div className="space-y-6">
      {/* Partner-specific Settings */}
      <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--theme-text)' }}>
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {isGerman ? 'Partner-spezifische Einstellungen' : 'Partner-specific Settings'}
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--theme-muted)' }}>
          {isGerman
            ? 'Verwalten Sie Ihre individuellen Preiseinstellungen. Diese Einstellungen gelten speziell für Ihr Partnerkonto und überschreiben die globalen Admin-Standardeinstellungen.'
            : 'Manage your custom pricing settings. These settings apply specifically to your partner account and override global admin default settings.'
          }
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Price per Lead */}
          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Preis pro Lead (€)' : 'Price per Lead (€)'}
            </label>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="number"
                value={settings.customPricing?.perLeadPrice || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  customPricing: {
                    ...prev.customPricing,
                    perLeadPrice: e.target.value ? parseFloat(e.target.value) : null
                  }
                }))}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
                placeholder={isGerman ? 'Wert eingeben...' : 'Enter value...'}
                min="1"
                step="0.01"
              />
              {settings.customPricing?.perLeadPrice ? (
                <span className="text-sm font-semibold px-3 py-2 rounded-lg" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                  ✓ {isGerman ? 'Benutzerdefiniert' : 'Custom'}
                </span>
              ) : (
                <span className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                  {isGerman ? 'Standard' : 'Default'}
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
              {isGerman
                ? 'Eindeutige Vergütung pro zugewiesenem Lead'
                : 'Unique compensation per assigned lead'
              }
            </p>
          </div>

          {/* Leads per Week */}
          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Leads pro Woche' : 'Leads per Week'}
            </label>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="number"
                value={settings.customPricing?.leadsPerWeek || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  customPricing: {
                    ...prev.customPricing,
                    leadsPerWeek: e.target.value ? parseInt(e.target.value) : null
                  }
                }))}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
                placeholder={isGerman ? 'Wert eingeben...' : 'Enter value...'}
                min="1"
                max="50"
              />
              {settings.customPricing?.leadsPerWeek ? (
                <span className="text-sm font-semibold px-3 py-2 rounded-lg" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                  ✓ {isGerman ? 'Benutzerdefiniert' : 'Custom'}
                </span>
              ) : (
                <span className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                  {isGerman ? 'Standard' : 'Default'}
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
              {isGerman
                ? 'Maximale Anzahl von Leads pro Woche (1-50)'
                : 'Maximum number of leads per week (1-50)'
              }
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 rounded-lg border-l-4" style={{ backgroundColor: 'var(--theme-bg)', borderLeftColor: '#10b981' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text)' }}>
            <strong>{isGerman ? '✓ Hinweis:' : '✓ Note:'}</strong> {isGerman
              ? ' Sie können Ihre Preiseinstellungen hier anpassen und speichern. Lassen Sie die Felder leer, um die globalen Admin-Standardeinstellungen zu verwenden.'
              : ' You can adjust your pricing settings here and save them. Leave fields empty to use global admin default settings.'
            }
          </p>
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
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            saving ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
          }`}
          style={{
            backgroundColor: 'var(--theme-button-bg)',
            color: 'var(--theme-button-text)'
          }}
        >
          {saving ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              <span>{isGerman ? 'Speichern...' : 'Saving...'}</span>
            </div>
          ) : (
            <><svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {isGerman ? 'Einstellungen speichern' : 'Save Settings'}</>
          )}
        </button>
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
      {activeTab === 'pricing' && renderPricingTab()}

      {/* Password Change Dialog */}
      {showPasswordDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => {
            setShowPasswordDialog(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
          }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"
            style={{ backgroundColor: 'var(--theme-bg-secondary)' }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Passwort ändern' : 'Change Password'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Neues Passwort' : 'New Password'}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: 'var(--theme-input-bg)',
                      borderColor: 'var(--theme-border)',
                      color: 'var(--theme-text)'
                    }}
                    placeholder={isGerman ? 'Mindestens 12 Zeichen' : 'At least 12 characters'}
                    disabled={changingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={changingPassword}
                  >
                    {showNewPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {/* Password Strength Indicator */}
                <PasswordStrengthIndicator password={passwordData.newPassword} isGerman={isGerman} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Passwort bestätigen' : 'Confirm Password'}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: 'var(--theme-input-bg)',
                      borderColor: 'var(--theme-border)',
                      color: 'var(--theme-text)'
                    }}
                    placeholder={isGerman ? 'Passwort wiederholen' : 'Repeat password'}
                    disabled={changingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={changingPassword}
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                  }}
                  disabled={changingPassword}
                  className="flex-1 px-4 py-2 border rounded-lg transition-colors"
                  style={{
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)',
                    backgroundColor: 'var(--theme-bg)'
                  }}
                >
                  {isGerman ? 'Abbrechen' : 'Cancel'}
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={changingPassword}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {changingPassword ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{isGerman ? 'Speichern...' : 'Saving...'}</span>
                    </div>
                  ) : (
                    isGerman ? 'Passwort ändern' : 'Change Password'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PartnerSettingsNew;