export const movingFormConfig = {
  id: 'moving',
  title: {
    de: 'Umzugsservice anfragen',
    en: 'Request Moving Service'
  },
  description: {
    de: 'Finden Sie das passende Umzugsunternehmen für Ihren Umzug',
    en: 'Find the right moving company for your move'
  },
  steps: [
    {
      id: 'moveType',
      title: {
        de: 'Umzugsart',
        en: 'Move Type'
      },
      type: 'radio',
      required: true,
      options: [
        {
          id: 'private',
          label: {
            de: 'Privater Umzug',
            en: 'Private Move'
          },
          description: {
            de: 'Haushaltsumzug für Privatpersonen',
            en: 'Household move for individuals'
          },
          icon: '🏠'
        },
        {
          id: 'business',
          label: {
            de: 'Geschäftsumzug',
            en: 'Business Move'
          },
          description: {
            de: 'Umzug für Unternehmen und Büros',
            en: 'Moving services for businesses and offices'
          },
          icon: '🏢'
        },
        {
          id: 'longDistance',
          label: {
            de: 'Fernumzug',
            en: 'Long Distance Move'
          },
          description: {
            de: 'Fernumzug innerhalb und außerhalb Deutschlands',
            en: 'Long-distance moving within and outside Germany'
          },
          icon: '🌍'
        },
        {
          id: 'specialTransport',
          label: {
            de: 'Spezialtransport',
            en: 'Special Transport'
          },
          description: {
            de: 'Transport spezieller Gegenstände',
            en: 'Transport of special items'
          },
          icon: '📦'
        }
      ]
    },
    {
      id: 'moveSize',
      title: {
        de: 'Umzugsgröße',
        en: 'Move Size'
      },
      description: {
        de: 'Wie groß ist Ihr Umzug?',
        en: 'What is the size of your move?'
      },
      type: 'radio',
      required: true,
      options: [
        {
          id: 'studio',
          label: {
            de: '1-Zimmer-Wohnung',
            en: 'Studio Apartment'
          },
          description: {
            de: 'Bis 30 m²',
            en: 'Up to 30 m²'
          }
        },
        {
          id: 'small',
          label: {
            de: '2-3 Zimmer',
            en: '2-3 Rooms'
          },
          description: {
            de: '30-60 m²',
            en: '30-60 m²'
          }
        },
        {
          id: 'medium',
          label: {
            de: '4-5 Zimmer',
            en: '4-5 Rooms'
          },
          description: {
            de: '60-100 m²',
            en: '60-100 m²'
          }
        },
        {
          id: 'large',
          label: {
            de: '6+ Zimmer',
            en: '6+ Rooms'
          },
          description: {
            de: 'Über 100 m²',
            en: 'Over 100 m²'
          }
        },
        {
          id: 'house',
          label: {
            de: 'Einfamilienhaus',
            en: 'Single Family House'
          },
          description: {
            de: 'Ganzes Haus',
            en: 'Entire house'
          }
        }
      ]
    },
    {
      id: 'services',
      title: {
        de: 'Umzugsleistungen',
        en: 'Moving Services'
      },
      description: {
        de: 'Welche Leistungen benötigen Sie?',
        en: 'Which services do you need?'
      },
      type: 'checkbox',
      required: true,
      options: [
        {
          id: 'transport',
          label: {
            de: 'Transport',
            en: 'Transport'
          },
          description: {
            de: 'Fahrzeug und Fahrer',
            en: 'Vehicle and driver'
          }
        },
        {
          id: 'packing',
          label: {
            de: 'Ein-/Auspackservice',
            en: 'Packing/Unpacking'
          },
          description: {
            de: 'Professionelles Verpacken',
            en: 'Professional packing'
          }
        },
        {
          id: 'assembly',
          label: {
            de: 'Möbelmontage',
            en: 'Furniture Assembly'
          },
          description: {
            de: 'Ab- und Aufbau von Möbeln',
            en: 'Disassembly and assembly of furniture'
          }
        },
        {
          id: 'storage',
          label: {
            de: 'Zwischenlagerung',
            en: 'Storage'
          },
          description: {
            de: 'Temporäre Lagerung',
            en: 'Temporary storage'
          }
        },
        {
          id: 'cleaning',
          label: {
            de: 'Endreinigung',
            en: 'Final Cleaning'
          },
          description: {
            de: 'Reinigung der alten Wohnung',
            en: 'Cleaning of the old apartment'
          }
        },
        {
          id: 'disposal',
          label: {
            de: 'Entsorgung',
            en: 'Disposal'
          },
          description: {
            de: 'Entsorgung alter Gegenstände',
            en: 'Disposal of old items'
          }
        },
        {
          id: 'piano',
          label: {
            de: 'Klaviertransport',
            en: 'Piano Transport'
          },
          description: {
            de: 'Spezialtransport für Klavier',
            en: 'Special transport for piano'
          }
        },
        {
          id: 'holding',
          label: {
            de: 'Halteverbotszone',
            en: 'No Parking Zone'
          },
          description: {
            de: 'Einrichtung einer Halteverbotszone',
            en: 'Setting up a no parking zone'
          }
        }
      ]
    },
    {
      id: 'moveDate',
      title: {
        de: 'Umzugstermin',
        en: 'Moving Date'
      },
      description: {
        de: 'Wann soll der Umzug stattfinden?',
        en: 'When should the move take place?'
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
          id: 'specific',
          label: {
            de: 'Bestimmtes Datum',
            en: 'Specific Date'
          },
          description: {
            de: 'Ich habe einen festen Termin',
            en: 'I have a fixed date'
          }
        },
        {
          id: 'flexible',
          label: {
            de: 'Flexibel',
            en: 'Flexible'
          },
          description: {
            de: 'Datum ist noch offen',
            en: 'Date is still open'
          }
        }
      ]
    },
    {
      id: 'addresses',
      title: {
        de: 'Umzugsadressen',
        en: 'Moving Addresses'
      },
      description: {
        de: 'Von wo nach wo ziehen Sie um?',
        en: 'Where are you moving from and to?'
      },
      type: 'form',
      required: true,
      fields: [
        {
          id: 'fromAddress',
          type: 'group',
          label: {
            de: 'Aktuelle Adresse (Von)',
            en: 'Current Address (From)'
          },
          fields: [
            {
              id: 'street',
              type: 'text',
              label: {
                de: 'Straße und Hausnummer',
                en: 'Street and house number'
              },
              placeholder: {
                de: 'Musterstraße 123',
                en: 'Example Street 123'
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
                de: 'Stadt',
                en: 'City'
              },
              placeholder: {
                de: 'Musterstadt',
                en: 'Example City'
              },
              required: true
            },
            {
              id: 'floor',
              type: 'select',
              label: {
                de: 'Etage',
                en: 'Floor'
              },
              options: [
                { id: 'ground', label: { de: 'Erdgeschoss', en: 'Ground Floor' } },
                { id: '1', label: { de: '1. Etage', en: '1st Floor' } },
                { id: '2', label: { de: '2. Etage', en: '2nd Floor' } },
                { id: '3', label: { de: '3. Etage', en: '3rd Floor' } },
                { id: '4', label: { de: '4. Etage', en: '4th Floor' } },
                { id: '5plus', label: { de: '5+ Etage', en: '5+ Floor' } }
              ]
            },
            {
              id: 'elevator',
              type: 'select',
              label: {
                de: 'Aufzug vorhanden',
                en: 'Elevator available'
              },
              options: [
                { id: 'yes', label: { de: 'Ja', en: 'Yes' } },
                { id: 'no', label: { de: 'Nein', en: 'No' } }
              ]
            }
          ]
        },
        {
          id: 'toAddress',
          type: 'group',
          label: {
            de: 'Neue Adresse (Nach)',
            en: 'New Address (To)'
          },
          fields: [
            {
              id: 'street',
              type: 'text',
              label: {
                de: 'Straße und Hausnummer',
                en: 'Street and house number'
              },
              placeholder: {
                de: 'Neue Straße 456',
                en: 'New Street 456'
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
                de: '54321',
                en: '54321'
              },
              required: true,
              pattern: /^\d{5}$/,
              maxLength: 5
            },
            {
              id: 'city',
              type: 'text',
              label: {
                de: 'Stadt',
                en: 'City'
              },
              placeholder: {
                de: 'Neue Stadt',
                en: 'New City'
              },
              required: true
            },
            {
              id: 'floor',
              type: 'select',
              label: {
                de: 'Etage',
                en: 'Floor'
              },
              options: [
                { id: 'ground', label: { de: 'Erdgeschoss', en: 'Ground Floor' } },
                { id: '1', label: { de: '1. Etage', en: '1st Floor' } },
                { id: '2', label: { de: '2. Etage', en: '2nd Floor' } },
                { id: '3', label: { de: '3. Etage', en: '3rd Floor' } },
                { id: '4', label: { de: '4. Etage', en: '4th Floor' } },
                { id: '5plus', label: { de: '5+ Etage', en: '5+ Floor' } }
              ]
            },
            {
              id: 'elevator',
              type: 'select',
              label: {
                de: 'Aufzug vorhanden',
                en: 'Elevator available'
              },
              options: [
                { id: 'yes', label: { de: 'Ja', en: 'Yes' } },
                { id: 'no', label: { de: 'Nein', en: 'No' } }
              ]
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
        },
        {
          id: 'preferredContactTime',
          type: 'select',
          label: {
            de: 'Bevorzugte Kontaktzeit',
            en: 'Preferred Contact Time'
          },
          required: false,
          options: [
            {
              id: '8-12',
              label: {
                de: '8:00 - 12:00 Uhr (Morgens)',
                en: '8:00 AM - 12:00 PM (Morning)'
              }
            },
            {
              id: '12-16',
              label: {
                de: '12:00 - 16:00 Uhr (Nachmittags)',
                en: '12:00 PM - 4:00 PM (Afternoon)'
              }
            },
            {
              id: '16-20',
              label: {
                de: '16:00 - 20:00 Uhr (Abends)',
                en: '4:00 PM - 8:00 PM (Evening)'
              }
            }
          ]
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
            de: 'Ich möchte Angebote von Umzugsunternehmen erhalten',
            en: 'I want to receive offers from moving companies'
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