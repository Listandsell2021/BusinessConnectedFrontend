export const cleaningFormConfig = {
  id: 'cleaning',
  title: {
    de: 'Reinigungsservice anfragen',
    en: 'Request Cleaning Service'
  },
  description: {
    de: 'Finden Sie den passenden Reinigungsservice für Ihre Bedürfnisse',
    en: 'Find the right cleaning service for your needs'
  },
  steps: [
    {
      id: 'locationType',
      title: {
        de: 'Standort-Art',
        en: 'Location Type'
      },
      description: {
        de: 'Welche Art von Standort möchten Sie reinigen lassen?',
        en: 'What type of location do you want to have cleaned?'
      },
      type: 'radio',
      required: true,
      options: [
        {
          id: 'single',
          label: {
            de: 'Einzelner Standort',
            en: 'Single Location'
          },
          description: {
            de: 'Ein einzelner Standort oder Objekt',
            en: 'A single location or property'
          }
        },
        {
          id: 'regional',
          label: {
            de: 'Mehrere Standorte (Regional)',
            en: 'Multiple Locations (Regional)'
          },
          description: {
            de: 'Mehrere Standorte in einer Region',
            en: 'Multiple locations in one region'
          }
        },
        {
          id: 'nationwide',
          label: {
            de: 'Mehrere Standorte (Deutschlandweit)',
            en: 'Multiple Locations (Nationwide)'
          },
          description: {
            de: 'Standorte in ganz Deutschland',
            en: 'Locations throughout Germany'
          }
        }
      ]
    },
    {
      id: 'frequency',
      title: {
        de: 'Reinigungsfrequenz',
        en: 'Cleaning Frequency'
      },
      description: {
        de: 'Wie oft soll gereinigt werden?',
        en: 'How often should cleaning be done?'
      },
      type: 'radio',
      required: true,
      options: [
        {
          id: 'regular',
          label: {
            de: 'Regelmäßig',
            en: 'Regular'
          },
          description: {
            de: 'Wiederkehrende Reinigung (täglich, wöchentlich, monatlich)',
            en: 'Recurring cleaning (daily, weekly, monthly)'
          }
        },
        {
          id: 'oneTime',
          label: {
            de: 'Einmalig',
            en: 'One-time'
          },
          description: {
            de: 'Einmalige Reinigung',
            en: 'Single cleaning service'
          }
        },
        {
          id: 'asNeeded',
          label: {
            de: 'Bei Bedarf',
            en: 'As needed'
          },
          description: {
            de: 'Unregelmäßige Reinigung nach Bedarf',
            en: 'Irregular cleaning as required'
          }
        }
      ]
    },
    {
      id: 'objectType',
      title: {
        de: 'Objekt-Typ',
        en: 'Object/Space Type'
      },
      description: {
        de: 'Was für ein Objekt soll gereinigt werden?',
        en: 'What type of object/space needs to be cleaned?'
      },
      type: 'radio',
      required: true,
      options: [
        {
          id: 'office',
          label: {
            de: 'Büro',
            en: 'Office'
          },
          icon: '🏢'
        },
        {
          id: 'clinic',
          label: {
            de: 'Klinik/Praxis',
            en: 'Clinic/Practice'
          },
          icon: '🏥'
        },
        {
          id: 'lawFirm',
          label: {
            de: 'Anwaltskanzlei',
            en: 'Law Firm'
          },
          icon: '⚖️'
        },
        {
          id: 'store',
          label: {
            de: 'Geschäft/Filiale',
            en: 'Store/Branch'
          },
          icon: '🏪'
        },
        {
          id: 'kindergarten',
          label: {
            de: 'Kindergarten',
            en: 'Kindergarten'
          },
          icon: '👶'
        },
        {
          id: 'hotel',
          label: {
            de: 'Hotel/Pension',
            en: 'Hotel/Pension'
          },
          icon: '🏨'
        },
        {
          id: 'fitness',
          label: {
            de: 'Fitness/Wellness',
            en: 'Fitness/Wellness'
          },
          icon: '💪'
        },
        {
          id: 'gastronomy',
          label: {
            de: 'Gastronomie',
            en: 'Gastronomy'
          },
          icon: '🍽️'
        },
        {
          id: 'apartment',
          label: {
            de: 'Wohnung/Haus',
            en: 'Apartment/House'
          },
          icon: '🏠'
        },
        {
          id: 'other',
          label: {
            de: 'Sonstiges',
            en: 'Other'
          },
          icon: '📦'
        }
      ]
    },
    {
      id: 'services',
      title: {
        de: 'Reinigungsleistungen',
        en: 'Cleaning Services'
      },
      description: {
        de: 'Welche Reinigungsleistungen benötigen Sie?',
        en: 'Which cleaning services do you need?'
      },
      type: 'checkbox',
      required: true,
      options: [
        {
          id: 'maintenance',
          label: {
            de: 'Unterhaltsreinigung',
            en: 'Maintenance Cleaning'
          },
          description: {
            de: 'Regelmäßige Grundreinigung',
            en: 'Regular basic cleaning'
          }
        },
        {
          id: 'window',
          label: {
            de: 'Fensterreinigung',
            en: 'Window Cleaning'
          },
          description: {
            de: 'Innen- und Außenfenster',
            en: 'Interior and exterior windows'
          }
        },
        {
          id: 'deep',
          label: {
            de: 'Grundreinigung',
            en: 'Deep Cleaning'
          },
          description: {
            de: 'Intensive Tiefenreinigung',
            en: 'Intensive deep cleaning'
          }
        },
        {
          id: 'carpet',
          label: {
            de: 'Teppichreinigung',
            en: 'Carpet Cleaning'
          },
          description: {
            de: 'Professionelle Teppichpflege',
            en: 'Professional carpet care'
          }
        },
        {
          id: 'facade',
          label: {
            de: 'Fassadenreinigung',
            en: 'Facade Cleaning'
          },
          description: {
            de: 'Außenfassade und Gebäudehülle',
            en: 'Exterior facade and building envelope'
          }
        },
        {
          id: 'stairwell',
          label: {
            de: 'Treppenhaus',
            en: 'Stairwell Cleaning'
          },
          description: {
            de: 'Treppenhäuser und Hausflure',
            en: 'Stairwells and hallways'
          }
        },
        {
          id: 'roof',
          label: {
            de: 'Dachreinigung',
            en: 'Roof Cleaning'
          },
          description: {
            de: 'Dach und Dachrinnen',
            en: 'Roof and gutters'
          }
        },
        {
          id: 'winter',
          label: {
            de: 'Winterdienst',
            en: 'Winter Service'
          },
          description: {
            de: 'Schneeräumung und Streudienst',
            en: 'Snow removal and gritting service'
          }
        },
        {
          id: 'construction',
          label: {
            de: 'Baureinigung',
            en: 'Construction Cleaning'
          },
          description: {
            de: 'Nach Bau- oder Renovierungsarbeiten',
            en: 'After construction or renovation work'
          }
        },
        {
          id: 'other',
          label: {
            de: 'Sonstiges',
            en: 'Other'
          },
          description: {
            de: 'Weitere spezielle Reinigungsleistungen',
            en: 'Other special cleaning services'
          }
        }
      ]
    },
    {
      id: 'startDate',
      title: {
        de: 'Gewünschter Starttermin',
        en: 'Desired Start Date'
      },
      description: {
        de: 'Wann soll mit der Reinigung begonnen werden?',
        en: 'When should the cleaning start?'
      },
      type: 'radio',
      required: true,
      options: [
        {
          id: 'asap',
          label: {
            de: 'So schnell wie möglich',
            en: 'As soon as possible'
          },
          description: {
            de: 'Innerhalb der nächsten 2 Wochen',
            en: 'Within the next 2 weeks'
          }
        },
        {
          id: 'nextMonth',
          label: {
            de: 'Nächsten Monat',
            en: 'Next month'
          },
          description: {
            de: 'Im kommenden Monat',
            en: 'In the coming month'
          }
        },
        {
          id: 'flexible',
          label: {
            de: 'Später oder flexibel',
            en: 'Later or flexible'
          },
          description: {
            de: 'Zeitpunkt ist noch offen',
            en: 'Timing is still open'
          }
        }
      ]
    },
    {
      id: 'location',
      title: {
        de: 'Standort-Details',
        en: 'Location Details'
      },
      description: {
        de: 'Wo soll die Reinigung stattfinden?',
        en: 'Where should the cleaning take place?'
      },
      type: 'form',
      required: true,
      fields: [
        {
          id: 'address',
          type: 'text',
          label: {
            de: 'Adresse',
            en: 'Address'
          },
          placeholder: {
            de: 'Straße und Hausnummer',
            en: 'Street and house number'
          },
          required: true
        },
        {
          id: 'postalCode',
          type: 'text',
          label: {
            de: 'PLZ',
            en: 'Postal Code'
          },
          placeholder: {
            de: '12345',
            en: '12345'
          },
          required: true,
          pattern: /^\d{5}$/,
          maxLength: 5
        },
        {
          id: 'city',
          type: 'text',
          label: {
            de: 'Ort',
            en: 'City'
          },
          placeholder: {
            de: 'Stadt',
            en: 'City'
          },
          required: true
        },
        {
          id: 'area',
          type: 'select',
          label: {
            de: 'Reinigungsfläche (m²)',
            en: 'Cleaning Area (m²)'
          },
          required: true,
          options: [
            {
              id: 'under200',
              label: {
                de: 'Unter 200 m²',
                en: 'Under 200 m²'
              }
            },
            {
              id: '200to500',
              label: {
                de: '200 - 500 m²',
                en: '200 - 500 m²'
              }
            },
            {
              id: '500to1000',
              label: {
                de: '500 - 1.000 m²',
                en: '500 - 1,000 m²'
              }
            },
            {
              id: '1000to3000',
              label: {
                de: '1.000 - 3.000 m²',
                en: '1,000 - 3,000 m²'
              }
            },
            {
              id: '3000to10000',
              label: {
                de: '3.000 - 10.000 m²',
                en: '3,000 - 10,000 m²'
              }
            },
            {
              id: 'over10000',
              label: {
                de: 'Über 10.000 m²',
                en: 'Over 10,000 m²'
              }
            }
          ]
        }
      ]
    },
    {
      id: 'contact',
      title: {
        de: 'Kontaktdaten',
        en: 'Contact Information'
      },
      description: {
        de: 'Wie können wir Sie erreichen?',
        en: 'How can we contact you?'
      },
      type: 'form',
      required: true,
      fields: [
        {
          id: 'salutation',
          type: 'select',
          label: {
            de: 'Anrede',
            en: 'Salutation'
          },
          required: true,
          options: [
            {
              id: 'mr',
              label: {
                de: 'Herr',
                en: 'Mr.'
              }
            },
            {
              id: 'mrs',
              label: {
                de: 'Frau',
                en: 'Mrs.'
              }
            }
          ]
        },
        {
          id: 'firstName',
          type: 'text',
          label: {
            de: 'Vorname',
            en: 'First Name'
          },
          placeholder: {
            de: 'Ihr Vorname',
            en: 'Your first name'
          },
          required: true
        },
        {
          id: 'lastName',
          type: 'text',
          label: {
            de: 'Nachname',
            en: 'Last Name'
          },
          placeholder: {
            de: 'Ihr Nachname',
            en: 'Your last name'
          },
          required: true
        },
        {
          id: 'phone',
          type: 'tel',
          label: {
            de: 'Telefonnummer',
            en: 'Phone Number'
          },
          placeholder: {
            de: '+49 123 456789',
            en: '+49 123 456789'
          },
          required: true
        },
        {
          id: 'email',
          type: 'email',
          label: {
            de: 'E-Mail-Adresse',
            en: 'Email Address'
          },
          placeholder: {
            de: 'ihre.email@example.com',
            en: 'your.email@example.com'
          },
          required: true
        }
      ]
    },
    {
      id: 'consent',
      title: {
        de: 'Datenschutz & Einverständnis',
        en: 'Privacy & Consent'
      },
      description: {
        de: 'Bitte bestätigen Sie die folgenden Punkte',
        en: 'Please confirm the following points'
      },
      type: 'checkbox',
      required: true,
      options: [
        {
          id: 'privacy',
          label: {
            de: 'Ich stimme der Datenschutzerklärung zu',
            en: 'I agree to the privacy policy'
          },
          required: true
        },
        {
          id: 'contact',
          label: {
            de: 'Ich möchte Angebote von Reinigungsunternehmen erhalten',
            en: 'I want to receive offers from cleaning companies'
          },
          required: true
        },
        {
          id: 'marketing',
          label: {
            de: 'Ich möchte über weitere Angebote informiert werden (optional)',
            en: 'I want to be informed about additional offers (optional)'
          },
          required: false
        }
      ]
    }
  ]
};