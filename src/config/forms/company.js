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
          label: 'E-Mail Id',
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
          options: [
            { id: 'be', label: 'Berlin' },
            { id: 'bb', label: 'Brandenburg' },
            { id: 'hh', label: 'Hamburg' },
            { id: 'nrw', label: 'Nordrhein-Westfalen' },
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
            { id: 'next_1_month', label: 'Nächsten 1 Monat' },
            { id: 'next_3_months', label: 'Nächsten 3 Monate' },
            { id: 'next_6_months', label: 'Nächsten 6 Monate' },
            { id: 'ongoing', label: 'Dauerhaft verfügbar' },
            { id: 'seasonal', label: 'Saisonal' }
          ]
        },

        // Budget Scope / Specializations
        {
          id: 'budgetScope',
          type: 'checkbox',
          label: 'Budget-Umfang bis zu einem Maximum von',
          description: 'Wählen Sie alle Leistungen aus, die Sie erbringen können',
          required: true,
          gridCol: 'full',
          options: [
            { id: 'property_protection', label: 'Objektschutz' },
            { id: 'personal_security', label: 'Personenschutz' },
            { id: 'construction_security', label: 'Baustellensicherheit' },
            { id: 'event_security', label: 'Veranstaltungssicherheit' },
            { id: 'other', label: 'Sonstiges' }
          ]
        },

        // Project Description
        {
          id: 'companyDescription',
          type: 'textarea',
          label: 'Kurzbeschreibung des Projekts',
          placeholder: 'Kurzbeschreibung des Projekts...',
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
