// Translation system for German/English
export const translations = {
  de: {
    // Move types
    moveTypes: {
      private: 'Privatumzug',
      business: 'Firmenumzug', 
      longDistance: 'Fernumzug',
      specialTransport: 'Spezialtransport'
    },
    
    // Common terms
    common: {
      next: 'Weiter',
      back: 'Zurück',
      submit: 'Anfrage senden',
      required: 'Pflichtfeld',
      optional: 'Optional',
      yes: 'Ja',
      no: 'Nein',
      street: 'Straße',
      postalCode: 'PLZ',
      city: 'Stadt',
      floor: 'Etage',
      elevator: 'Aufzug',
      date: 'Datum',
      phone: 'Telefon',
      email: 'E-Mail',
      fullName: 'Vollständiger Name',
      company: 'Unternehmen',
      volume: 'Volumen',
      weight: 'Gewicht',
      dimensions: 'Abmessungen'
    },

    // Step titles
    steps: {
      start: 'Umzugsart wählen',
      movingFrom: 'Auszugsadresse',
      movingTo: 'Einzugsadresse', 
      details: 'Umzugsdetails',
      furniture: 'Inventar & Volumen',
      services: 'Zusatzleistungen',
      contact: 'Kontaktdaten',
      companyInfo: 'Firmeninformationen',
      officeEquipment: 'Büroausstattung',
      itemDetails: 'Gegenstände',
      pickup: 'Abholung',
      delivery: 'Lieferung'
    },

    // Private move
    private: {
      selectPrivateMove: 'Privatumzug auswählen',
      livingSpace: 'Wohnfläche in m²',
      numberOfRooms: 'Anzahl Zimmer',
      movingDate: 'Umzugstermin',
      flexibility: 'Flexibilität bei Termin',
      flexible: 'Flexibel (+/- 7 Tage)',
      exact: 'Exakter Termin'
    },

    // Business move
    business: {
      selectBusinessMove: 'Firmenumzug auswählen',
      companyName: 'Firmenname',
      numberOfEmployees: 'Anzahl Mitarbeiter',
      officeType: 'Büroart',
      openSpace: 'Großraumbüro',
      multipleRooms: 'Mehrere Büros',
      warehouse: 'Lager/Werkstatt',
      weekendMove: 'Wochenendumzug'
    },

    // Services
    services: {
      packing: 'Ein-/Auspacken',
      assembly: 'Möbelmontage',
      storage: 'Zwischenlagerung',
      disposal: 'Entsorgung',
      insurance: 'Versicherung',
      customs: 'Zollabwicklung'
    },

    // Furniture items
    furniture: {
      sofa: 'Sofa',
      bed: 'Bett',
      wardrobe: 'Kleiderschrank',
      table: 'Tisch',
      chair: 'Stuhl',
      boxes: 'Umzugskartons'
    },

    // Validation messages
    validation: {
      required: 'Dieses Feld ist erforderlich',
      email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
      phone: 'Bitte geben Sie eine gültige Telefonnummer ein',
      minLength: 'Mindestens {min} Zeichen erforderlich',
      number: 'Bitte geben Sie eine gültige Zahl ein'
    },

    // GDPR
    gdpr: {
      consent: 'Ich stimme der Verarbeitung meiner Daten gemäß der Datenschutzerklärung zu',
      privacy: 'Datenschutzerklärung'
    }
  },

  en: {
    // Move types
    moveTypes: {
      private: 'Private Move',
      business: 'Business Move',
      longDistance: 'Long-Distance Move', 
      specialTransport: 'Special Transport'
    },

    // Common terms
    common: {
      next: 'Next',
      back: 'Back', 
      submit: 'Submit Request',
      required: 'Required',
      optional: 'Optional',
      yes: 'Yes',
      no: 'No',
      street: 'Street',
      postalCode: 'Postal Code',
      city: 'City',
      floor: 'Floor',
      elevator: 'Elevator',
      date: 'Date',
      phone: 'Phone',
      email: 'Email',
      fullName: 'Full Name',
      company: 'Company',
      volume: 'Volume',
      weight: 'Weight',
      dimensions: 'Dimensions'
    },

    // Step titles
    steps: {
      start: 'Choose Move Type',
      movingFrom: 'Moving From',
      movingTo: 'Moving To',
      details: 'Move Details',
      furniture: 'Inventory & Volume',
      services: 'Additional Services',
      contact: 'Contact Information',
      companyInfo: 'Company Information',
      officeEquipment: 'Office Equipment',
      itemDetails: 'Item Details',
      pickup: 'Pickup',
      delivery: 'Delivery'
    },

    // Private move
    private: {
      selectPrivateMove: 'Select Private Move',
      livingSpace: 'Living space in m²',
      numberOfRooms: 'Number of rooms',
      movingDate: 'Moving date',
      flexibility: 'Date flexibility',
      flexible: 'Flexible (+/- 7 days)',
      exact: 'Exact date'
    },

    // Business move
    business: {
      selectBusinessMove: 'Select Business Move',
      companyName: 'Company name',
      numberOfEmployees: 'Number of employees',
      officeType: 'Office type',
      openSpace: 'Open space',
      multipleRooms: 'Multiple rooms',
      warehouse: 'Warehouse',
      weekendMove: 'Weekend move'
    },

    // Services
    services: {
      packing: 'Packing/Unpacking',
      assembly: 'Furniture assembly',
      storage: 'Storage',
      disposal: 'Disposal',
      insurance: 'Insurance',
      customs: 'Customs clearance'
    },

    // Furniture items
    furniture: {
      sofa: 'Sofa',
      bed: 'Bed',
      wardrobe: 'Wardrobe',
      table: 'Table', 
      chair: 'Chair',
      boxes: 'Moving boxes'
    },

    // Validation messages
    validation: {
      required: 'This field is required',
      email: 'Please enter a valid email address',
      phone: 'Please enter a valid phone number',
      minLength: 'Minimum {min} characters required',
      number: 'Please enter a valid number'
    },

    // GDPR
    gdpr: {
      consent: 'I agree to the processing of my data according to the privacy policy',
      privacy: 'Privacy Policy'
    }
  }
};

export const useTranslation = (locale = 'de') => {
  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[locale];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    if (typeof value === 'string') {
      // Replace parameters in translation string
      return value.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] || match;
      });
    }
    
    return key;
  };

  return { t, locale };
};