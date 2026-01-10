// Security Client Form Configuration - German Only
// Single page form with exact field labels and layout

export const securityClientFormConfig = {
  id: 'securityClient',
  title: 'Sicherheitsanfrage',
  description: 'Füllen Sie das Formular aus und finden Sie den richtigen Sicherheitsdienst für Ihre Anforderungen.',
  heroBadge: 'Sicherheitslösungen',
  heroTitle: 'Den richtigen Sicherheitspartner finden',
  heroDescription: 'Wir werden den richtigen Sicherheitsdienst oder Sicherheitsprojekt für Sie finden. Geben Sie Ihre Details ein und wir werden Sie mit geeigneten Angeboten kontaktieren. Unser Service ist kostenlos, es sei denn, ein Vertrag wird abgeschlossen. Gebühren werden transparent im Voraus mitgeteilt.',
  steps: [
    // Single Step: Client Details
    {
      id: 'client_details',
      type: 'form',
      title: 'Kundendetails',
      description: 'Ihre persönlichen und geschäftlichen Daten',
      fields: [
        // Row 1: Name & Company
        {
          id: 'firstName',
          type: 'text',
          label: 'Name',
          placeholder: 'Name eingeben',
          required: true,
          gridCol: 1
        },
        {
          id: 'company',
          type: 'text',
          label: 'Unternehmen',
          placeholder: 'Unternehmen eingeben',
          required: true,
          gridCol: 2
        },

        // Row 2: Email & Phone
        {
          id: 'email',
          type: 'email',
          label: 'E-Mail',
          placeholder: 'example@email.com',
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

        // Row 3: Location - Address with Autocomplete (Street & City auto-filled)
        {
          id: 'location_address',
          type: 'text',
          label: 'Straße und Hausnummer',
          placeholder: 'Straße 123',
          required: true,
          gridCol: 'full'
        },

        // Hidden field - lastName (auto-filled from firstName)
        {
          id: 'lastName',
          type: 'text',
          hidden: true
        },

        // Hidden fields - auto-filled from address selection (not displayed)
        {
          id: 'location_city',
          type: 'text',
          hidden: true
        },
        {
          id: 'location_postalCode',
          type: 'text',
          hidden: true
        },
        {
          id: 'location_country',
          type: 'text',
          hidden: true
        },

        // Row 5: Desired Start Date & Duration
        {
          id: 'desiredStartDate',
          type: 'date',
          label: 'Gewünschtes Startdatum',
          placeholder: 'Datum wählen',
          required: true,
          gridCol: 1
        },
        {
          id: 'duration',
          type: 'select',
          label: 'Dauer',
          placeholder: 'Dauer wählen',
          required: true,
          gridCol: 2,
          options: [
            {
              id: 'einmalig',
              label: 'Einmalig'
            },
            {
              id: '1',
              label: '1 Monat'
            },
            {
              id: '3',
              label: '3 Monate'
            },
            {
              id: '6',
              label: '6 Monate'
            },
            {
              id: '12',
              label: '12 Monate'
            },
            {
              id: 'other',
              label: 'Sonstiges'
            }
          ]
        },

        // Row 6: Budget Scope (Full Width)
        {
          id: 'budgetScope',
          type: 'select',
          label: 'Budget bis maximal',
          placeholder: 'Budget wählen',
          required: true,
          gridCol: 'full',
          options: [
            {
              id: 'up_to_5k',
              label: 'Bis zu €5.000'
            },
            {
              id: '5k_to_10k',
              label: '€5.000 - €10.000'
            },
            {
              id: '10k_to_25k',
              label: '€10.000 - €25.000'
            },
            {
              id: '25k_to_50k',
              label: '€25.000 - €50.000'
            },
            {
              id: '50k_plus',
              label: 'Über €50.000'
            }
          ]
        },

        // Row 6: Project Description (Full Width)
        {
          id: 'projectDescription',
          type: 'textarea',
          label: 'Kurze Beschreibung des Projekts',
          placeholder: 'Projektbeschreibung eingeben...',
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
  successMessage: 'Ihre Anfrage wurde erfolgreich eingereicht!'
};

export default securityClientFormConfig;
