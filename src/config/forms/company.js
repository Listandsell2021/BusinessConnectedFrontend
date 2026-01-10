// Security Company Form Configuration - Single Step Design - German Only
// All fields on one page matching Figma design

export const securityCompanyFormConfig = {
  id: 'securityCompany',
  title: 'Sicherheitsunternehmen Registrierung',
  description: 'Registrieren Sie Ihr Sicherheitsunternehmen und erhalten Sie Zugang zu neuen Kundenanfragen.',
  heroBadge: 'Partner werden',
  heroTitle: 'Sicherheitsunternehmen registrieren',
  heroDescription: 'Geben Sie Ihre Unternehmensdetails ein und werden Sie Teil unseres Netzwerks. Wir verbinden Sie mit Kunden, die Ihre Sicherheitsdienste benötigen. Unser Service ist kostenlos. Gebühren werden transparent im Voraus mitgeteilt.',
  steps: [
    // Single Step: All Company Details
    {
      id: 'company_details',
      type: 'form',
      title: 'Sicherheitsunternehmen Details',
      description: 'Ihre persönlichen und geschäftlichen Daten',
      fields: [
        // Company Information Section
        {
          id: 'companyName',
          type: 'text',
          label: 'Unternehmensname',
          placeholder: 'Unternehmensname eingeben',
          required: true,
          gridCol: 'full'
        },
        {
          id: 'contactPerson',
          type: 'text',
          label: 'Kontaktperson',
          placeholder: 'Name der Kontaktperson',
          required: true,
          gridCol: 'full'
        },
        {
          id: 'email',
          type: 'email',
          label: 'E-Mail',
          placeholder: 'example@company.com',
          required: true,
          gridCol: 1
        },
        {
          id: 'phone',
          type: 'tel',
          label: 'Telefon',
          placeholder: '+49 123 456789',
          required: true,
          gridCol: 2
        },

        // Service Regions
        {
          id: 'regions',
          type: 'checkbox',
          label: 'In welchen Regionen sind Einsätze möglich?',
          description: 'Wählen Sie alle Regionen aus, in denen Sie tätig sind',
          required: true,
          gridCol: 'full',
          columns: 3,
          options: [
            { id: 'bw', label: 'Baden-Württemberg' },
            { id: 'by', label: 'Bayern' },
            { id: 'be', label: 'Berlin' },
            { id: 'bb', label: 'Brandenburg' },
            { id: 'hb', label: 'Bremen' },
            { id: 'hh', label: 'Hamburg' },
            { id: 'he', label: 'Hessen' },
            { id: 'mv', label: 'Mecklenburg-Vorpommern' },
            { id: 'ni', label: 'Niedersachsen' },
            { id: 'nrw', label: 'Nordrhein-Westfalen' },
            { id: 'rp', label: 'Rheinland-Pfalz' },
            { id: 'sl', label: 'Saarland' },
            { id: 'sn', label: 'Sachsen' },
            { id: 'st', label: 'Sachsen-Anhalt' },
            { id: 'sh', label: 'Schleswig-Holstein' },
            { id: 'th', label: 'Thüringen' },
            { id: 'nationwide', label: 'Bundesweit' }
          ]
        },

        // Capacity & Availability
        {
          id: 'availableEmployees',
          type: 'select',
          label: 'Anzahl verfügbarer Mitarbeiter',
          placeholder: 'Bitte wählen...',
          required: true,
          gridCol: 1,
          options: [
            { id: '1_5', label: '1 - 5 Mitarbeiter' },
            { id: '6_10', label: '6 - 10 Mitarbeiter' },
            { id: '11_25', label: '11 - 25 Mitarbeiter' },
            { id: '26_50', label: '26 - 50 Mitarbeiter' },
            { id: '51_plus', label: '51+ Mitarbeiter' }
          ]
        },
        {
          id: 'periodOfAvailability',
          type: 'select',
          label: 'Verfügbarkeitszeitraum',
          placeholder: 'Bitte wählen...',
          required: true,
          gridCol: 2,
          options: [
            { id: 'next_1_month', label: '1 Monat' },
            { id: 'next_3_months', label: 'bis zu 3 Monate' },
            { id: 'next_6_months', label: 'bis zu 6 Monate' },
            { id: 'ongoing', label: 'Dauerhaft verfügbar' },
            { id: 'seasonal', label: 'Saisonal' }
          ]
        },

        // Services / Specializations
        {
          id: 'budgetScope',
          type: 'checkbox',
          label: 'Wählen Sie alle Leistungen aus, die Sie erbringen können',
          required: true,
          gridCol: 'full',
          columns: 3,
          responsive: true,
          options: [
            { id: 'security_service', label: 'Sicherheitsdienst' },
            { id: 'property_protection', label: 'Objektschutz' },
            { id: 'industrial_security', label: 'Werkschutz' },
            { id: 'construction_security', label: 'Baustellenbewachung' },
            { id: 'patrol_service', label: 'Revierdienst' },
            { id: 'city_patrol', label: 'Citystreife' },
            { id: 'doorkeeper', label: 'Pförtner' },
            { id: 'reception_service', label: 'Empfangsdienst' },
            { id: 'personal_security', label: 'Personenschutz' },
            { id: 'doorman', label: 'Türsteher' },
            { id: 'security_dog_handler', label: 'Diensthundeführer' },
            { id: 'detective', label: 'Detektiv' },
            { id: 'event_security', label: 'Veranstaltungsschutz' },
            { id: 'refugee_security', label: 'Flüchtlingsheimbewachung' },
            { id: 'fire_watch', label: 'Brandwache' }
          ]
        },

        // Comments and Notes
        {
          id: 'companyDescription',
          type: 'textarea',
          label: 'Kommentare und Notizen',
          placeholder: 'Kommentare und Notizen...',
          required: true,
          gridCol: 'full',
          rows: 6
        }
      ]
    }
  ],

  // Validation messages
  validationMessages: {
    required: 'Dieses Feld ist erforderlich',
    email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
    phone: 'Bitte geben Sie eine gültige Telefonnummer ein',
    selectCheckbox: 'Bitte wählen Sie mindestens eine Option'
  },

  // Success message
  successMessage: 'Ihre Registrierung wurde erfolgreich eingereicht!'
};

export default securityCompanyFormConfig;
