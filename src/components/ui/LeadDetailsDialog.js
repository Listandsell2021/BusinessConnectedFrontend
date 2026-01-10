import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LeadDetailsDialog = ({
  isOpen,
  leadData,
  onClose,
  t,
  isGerman,
  isPartner = false
}) => {
  // Helper function to render complex data
  const renderValue = (value, depth = 0) => {
    // Safety checks
    if (value === null || value === undefined) return '-';
    if (React.isValidElement && React.isValidElement(value)) return value; // Don't process React elements
    if (depth > 2) return String(value).substring(0, 50) + '...'; // Prevent deep recursion

    if (typeof value === 'boolean') return value ? (isGerman ? 'Ja' : 'Yes') : (isGerman ? 'Nein' : 'No');
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.join(', ');

    if (typeof value === 'object') {
      try {
        // Handle address objects
        if (value.address && value.city) {
          return `${value.address}, ${value.postalCode || ''} ${value.city}, ${value.country || ''}`;
        }
        // Handle date objects
        if (value instanceof Date) {
          return value.toLocaleDateString('de-DE');
        }
        // Handle date strings
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
          try {
            return new Date(value).toLocaleDateString('de-DE');
          } catch (e) {
            return value;
          }
        }
        // Handle other objects by showing key-value pairs in a compact inline format
        const entries = Object.entries(value).filter(([k, v]) => v !== null && v !== undefined);
        if (entries.length > 0 && entries.length <= 6) {
          // Inline translations for nested object labels
          const nestedLabelTranslations = {
            'futurePropertyType': isGerman ? 'Zukünftiger Objekttyp' : 'Future Property Type',
            'elevatorAvailable': isGerman ? 'Aufzug verfügbar' : 'Elevator Available',
            'otherImportantInfo': isGerman ? 'Andere wichtige Infos' : 'Other Important Info',
            'startDate': isGerman ? 'Startdatum' : 'Start Date',
            'endDate': isGerman ? 'Enddatum' : 'End Date',
            'preferredWeekdays': isGerman ? 'Bevorzugte Wochentage' : 'Preferred Weekdays',
            'timeFlexibility': isGerman ? 'Zeitliche Flexibilität' : 'Time Flexibility'
          };

          // Inline translations for nested object values
          const nestedValueTranslations = {
            'own_home': isGerman ? 'Eigenheim' : 'Own Home',
            'own_house': isGerman ? 'Eigenhaus' : 'Own House',
            'own_apartment': isGerman ? 'Eigentumswohnung' : 'Own Apartment',
            'rental_apartment': isGerman ? 'Mietwohnung' : 'Rental Apartment',
            'rental_house': isGerman ? 'Miethaus' : 'Rental House',
            'true': isGerman ? 'Ja' : 'Yes',
            'false': isGerman ? 'Nein' : 'No',
            'monday': isGerman ? 'Montag' : 'Monday',
            'tuesday': isGerman ? 'Dienstag' : 'Tuesday',
            'wednesday': isGerman ? 'Mittwoch' : 'Wednesday',
            'thursday': isGerman ? 'Donnerstag' : 'Thursday',
            'friday': isGerman ? 'Freitag' : 'Friday',
            'saturday': isGerman ? 'Samstag' : 'Saturday',
            'sunday': isGerman ? 'Sonntag' : 'Sunday',
            'evening_preferred': isGerman ? 'Abends bevorzugt' : 'Evening Preferred',
            'morning_preferred': isGerman ? 'Morgens bevorzugt' : 'Morning Preferred',
            'afternoon_preferred': isGerman ? 'Nachmittags bevorzugt' : 'Afternoon Preferred'
          };

          return (
            <div className="space-y-1">
              {entries.map(([k, v]) => {
                const label = nestedLabelTranslations[k] || k.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase());
                let val;
                if (typeof v === 'boolean') {
                  val = v ? (isGerman ? 'Ja' : 'Yes') : (isGerman ? 'Nein' : 'No');
                } else if (typeof v === 'string' && nestedValueTranslations[v]) {
                  val = nestedValueTranslations[v];
                } else if (typeof v === 'string' && v.includes(',')) {
                  // Handle comma-separated values like weekdays
                  val = v.split(',').map(item => {
                    const trimmed = item.trim();
                    return nestedValueTranslations[trimmed] || trimmed.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  }).join(', ');
                } else if (typeof v === 'string') {
                  val = v.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                } else {
                  val = renderValue(v, depth + 1);
                }
                return (
                  <div key={k} className="flex flex-wrap">
                    <span className="font-medium mr-2" style={{ color: 'var(--theme-muted)' }}>
                      {label}:
                    </span>
                    <span style={{ color: 'var(--theme-text)' }} className="break-words">
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        }
        return isGerman ? '[Objekt]' : '[Object]';
      } catch (error) {
        console.warn('Error rendering value:', error);
        return isGerman ? '[Fehler beim Anzeigen]' : '[Display Error]';
      }
    }

    // Fallback: convert to string and truncate if too long
    const str = String(value);
    return str.length > 100 ? str.substring(0, 100) + '...' : str;
  };

  // Simple value formatter for nested objects (called before formatFormValue is defined)
  const formatSimpleValue = (key, value) => {
    if (value === null || value === undefined || value === '') return '';

    // Boolean values
    if (typeof value === 'boolean' || value === 'true' || value === 'false') {
      const boolVal = value === true || value === 'true';
      return boolVal ? (isGerman ? 'Ja' : 'Yes') : (isGerman ? 'Nein' : 'No');
    }

    // Property types
    const propertyTypes = {
      'own_home': isGerman ? 'Eigenheim' : 'Own Home',
      'own_house': isGerman ? 'Eigenhaus' : 'Own House',
      'own_apartment': isGerman ? 'Eigentumswohnung' : 'Own Apartment',
      'rental_apartment': isGerman ? 'Mietwohnung' : 'Rental Apartment',
      'rental_house': isGerman ? 'Miethaus' : 'Rental House'
    };

    if (typeof value === 'string' && propertyTypes[value]) {
      return propertyTypes[value];
    }

    // Default: replace underscores and capitalize
    if (typeof value === 'string') {
      return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    return value;
  };

  // Format and translate form values
  const formatFormValue = (key, value) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    // Handle date fields - format in German way (DD.MM.YYYY)
    if (key === 'desiredStartDate' || key === 'startDate' || key === 'endDate' || key === 'moveDate' || key === 'desiredMoveDate') {
      if (typeof value === 'string') {
        // Handle ISO date strings (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
          try {
            const date = new Date(value);
            return date.toLocaleDateString('de-DE', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
          } catch (e) {
            return value;
          }
        }
      } else if (value instanceof Date) {
        return value.toLocaleDateString('de-DE', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
    }

    // Handle time fields - format in German way (HH:mm)
    if (key === 'time' || key === 'appointmentTime' || key === 'preferredTime') {
      if (typeof value === 'string') {
        // Handle ISO time strings (HH:mm or HH:mm:ss)
        if (/^\d{1,2}:\d{2}/.test(value)) {
          try {
            const [hours, minutes] = value.split(':');
            return `${String(parseInt(hours)).padStart(2, '0')}:${String(parseInt(minutes)).padStart(2, '0')} ${isGerman ? 'Uhr' : ''}`.trim();
          } catch (e) {
            return value;
          }
        }
      }
    }

    // Property type translations
    if (key === 'propertyType' || key === 'currentPropertyType' || key === 'futurePropertyType') {
      const propertyTypes = {
        'rental_apartment': isGerman ? 'Mietwohnung' : 'Rental Apartment',
        'own_apartment': isGerman ? 'Eigentumswohnung' : 'Own Apartment',
        'own_house': isGerman ? 'Eigenhaus' : 'Own House',
        'own_home': isGerman ? 'Eigenheim' : 'Own Home',
        'rental_house': isGerman ? 'Miethaus' : 'Rental House',
        'office': isGerman ? 'Büro' : 'Office',
        'commercial': isGerman ? 'Gewerbe' : 'Commercial'
      };
      return propertyTypes[value] || value.replace(/_/g, ' ');
    }

    // Time preferences
    if (key === 'preferredContactTime' || key === 'timeFlexibility' || key === 'bestReachTime') {
      const timePrefs = {
        'morning_preferred': isGerman ? 'Morgens bevorzugt' : 'Morning Preferred',
        'afternoon_preferred': isGerman ? 'Nachmittags bevorzugt' : 'Afternoon Preferred',
        'evening_preferred': isGerman ? 'Abends bevorzugt' : 'Evening Preferred',
        'morning': isGerman ? 'Morgens' : 'Morning',
        'afternoon': isGerman ? 'Nachmittags' : 'Afternoon',
        'evening': isGerman ? 'Abends' : 'Evening',
        'anytime': isGerman ? 'Jederzeit' : 'Anytime',
        'flexible': isGerman ? 'Flexibel' : 'Flexible',
        'specific_time': isGerman ? 'Bestimmte Zeit' : 'Specific Time'
      };

      if (timePrefs[value]) {
        return timePrefs[value];
      }

      // Handle time ranges like "8-12", "12-16", "16-20"
      const timeRangeMatch = value.match(/^(\d{1,2})-(\d{1,2})$/);
      if (timeRangeMatch) {
        const startHour = parseInt(timeRangeMatch[1]);
        const endHour = parseInt(timeRangeMatch[2]);

        // Determine time period
        let timePeriod = '';
        if (startHour >= 6 && endHour <= 12) {
          timePeriod = isGerman ? ' (Morgens)' : ' (Morning)';
        } else if (startHour >= 12 && endHour <= 18) {
          timePeriod = isGerman ? ' (Nachmittags)' : ' (Afternoon)';
        } else if (startHour >= 18 || endHour <= 6) {
          timePeriod = isGerman ? ' (Abends)' : ' (Evening)';
        }

        if (isGerman) {
          return `${startHour}:00 - ${endHour}:00 Uhr${timePeriod}`;
        } else {
          // Convert to 12-hour format for English
          const formatHour = (h) => {
            if (h === 0 || h === 24) return '12:00 AM';
            if (h === 12) return '12:00 PM';
            if (h < 12) return `${h}:00 AM`;
            return `${h - 12}:00 PM`;
          };
          return `${formatHour(startHour)} - ${formatHour(endHour)}${timePeriod}`;
        }
      }

      return value.replace(/_/g, ' ');
    }

    // Move date flexibility
    if (key === 'moveDateType' || key === 'flexibility') {
      const flexibility = {
        'flexible': isGerman ? 'Flexibel' : 'Flexible',
        'fixed': isGerman ? 'Fest' : 'Fixed',
        'urgent': isGerman ? 'Dringend' : 'Urgent',
        'within_week': isGerman ? 'Innerhalb einer Woche' : 'Within a Week',
        'within_month': isGerman ? 'Innerhalb eines Monats' : 'Within a Month'
      };
      return flexibility[value] || value.replace(/_/g, ' ');
    }

    // Boolean values
    if (key === 'elevatorAvailable' || key === 'elevator') {
      return value === true || value === 'yes' || value === 'Yes' ?
        (isGerman ? 'Ja' : 'Yes') :
        (isGerman ? 'Nein' : 'No');
    }

    // Support needed (helper count)
    if (key === 'supportNeeded' || key === 'helpersNeeded') {
      if (value.includes('under_')) {
        const num = value.replace('under_', '');
        return isGerman ? `Unter ${num}` : `Under ${num}`;
      }
      if (value.includes('over_')) {
        const num = value.replace('over_', '');
        return isGerman ? `Über ${num}` : `Over ${num}`;
      }
      return value.replace(/_/g, ' ');
    }

    // Salutation
    if (key === 'salutation') {
      const salutations = {
        'mr': isGerman ? 'Herr' : 'Mr.',
        'mr.': isGerman ? 'Herr' : 'Mr.',
        'mrs': isGerman ? 'Frau' : 'Mrs.',
        'mrs.': isGerman ? 'Frau' : 'Mrs.',
        'ms': isGerman ? 'Frau' : 'Ms.',
        'ms.': isGerman ? 'Frau' : 'Ms.',
        'dr': isGerman ? 'Dr.' : 'Dr.',
        'dr.': isGerman ? 'Dr.' : 'Dr.',
        'prof': isGerman ? 'Prof.' : 'Prof.',
        'prof.': isGerman ? 'Prof.' : 'Prof.',
        'mister': isGerman ? 'Herr' : 'Mister',
        'miss': isGerman ? 'Fräulein' : 'Miss',
        'man': isGerman ? 'Mann' : 'Man',
        'men': isGerman ? 'Mann' : 'Man',
        'woman': isGerman ? 'Frau' : 'Woman',
        'women': isGerman ? 'Frau' : 'Woman'
      };
      return salutations[value.toLowerCase()] || value.charAt(0).toUpperCase() + value.slice(1);
    }

    // Services field (like basic_cleaning, deep_cleaning, etc.)
    if (key === 'services' || key === 'serviceTypes' || key === 'service_types' || key === 'service' || key === 'additionalServices' || key === 'servicesWanted') {
      const serviceTranslations = {
        'packing_boxes': isGerman ? 'Kartons packen' : 'Packing Boxes',
        'unpacking_service': isGerman ? 'Auspacken Service' : 'Unpacking Service',
        'packaging_material': isGerman ? 'Verpackungsmaterial' : 'Packaging Material',
        'furniture_lift': isGerman ? 'Möbellift' : 'Furniture Lift',
        'furniture_removal': isGerman ? 'Möbelabbau' : 'Furniture Removal',
        'furniture_assembly': isGerman ? 'Möbelaufbau' : 'Furniture Assembly',
        'kitchen_dismantling': isGerman ? 'Küchenabbau' : 'Kitchen Dismantling',
        'kitchen_assembly': isGerman ? 'Küchenaufbau' : 'Kitchen Assembly',
        'cellar_contents': isGerman ? 'Kellerinhalte' : 'Cellar Contents',
        'intermediate_storage': isGerman ? 'Zwischenlagerung' : 'Intermediate Storage'
      };

      if (typeof value === 'string') {
        return serviceTranslations[value] || value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      if (Array.isArray(value)) {
        return value.map(v => serviceTranslations[v] || v.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ');
      }
      return value;
    }

    // Weekdays
    if (key === 'preferredWeekdays' || key.includes('weekday')) {
      const weekdays = {
        'monday': isGerman ? 'Montag' : 'Monday',
        'tuesday': isGerman ? 'Dienstag' : 'Tuesday',
        'wednesday': isGerman ? 'Mittwoch' : 'Wednesday',
        'thursday': isGerman ? 'Donnerstag' : 'Thursday',
        'friday': isGerman ? 'Freitag' : 'Friday',
        'saturday': isGerman ? 'Samstag' : 'Saturday',
        'sunday': isGerman ? 'Sonntag' : 'Sunday'
      };
      if (Array.isArray(value)) {
        return value.map(day => weekdays[day] || day).join(', ');
      }
      return weekdays[value] || value;
    }

    // Service types
    if (key === 'serviceType') {
      const serviceTypes = {
        'moving': isGerman ? 'Umzugsservice' : 'Moving Service',
        'security': isGerman ? 'Sicherheitsservice' : 'Security Service',
        'cleaning': isGerman ? 'Reinigungsservice' : 'Cleaning Service',
        'cancellation': isGerman ? 'Stornierung' : 'Cancellation'
      };
      return serviceTypes[value] || value;
    }

    // Move types
    if (key === 'moveType' || key === 'movingType') {
      const moveTypes = {
        'private': isGerman ? 'Privat' : 'Private',
        'business': isGerman ? 'Geschäftlich' : 'Business',
        'long_distance': isGerman ? 'Fernumzug' : 'Long Distance',
        'special_transport': isGerman ? 'Spezialtransport' : 'Special Transport'
      };
      return moveTypes[value.toLowerCase()] || moveTypes[value] || value;
    }

    // Building types
    if (key === 'buildingType' || key === 'building_type') {
      const buildingTypes = {
        'apartment': isGerman ? 'Wohnung' : 'Apartment',
        'rental_apartment': isGerman ? 'Mietwohnung' : 'Rental Apartment',
        'own_apartment': isGerman ? 'Eigentumswohnung' : 'Own Apartment',
        'house': isGerman ? 'Haus' : 'House',
        'rental_house': isGerman ? 'Miethaus' : 'Rental House',
        'own_house': isGerman ? 'Eigenhaus' : 'Own House',
        'own_home': isGerman ? 'Eigenheim' : 'Own Home',
        'office': isGerman ? 'Büro' : 'Office',
        'commercial': isGerman ? 'Gewerbe' : 'Commercial',
        'studio': isGerman ? 'Studio' : 'Studio',
        'villa': isGerman ? 'Villa' : 'Villa',
        'flat': isGerman ? 'Wohnung' : 'Flat',
        'room': isGerman ? 'Zimmer' : 'Room'
      };
      return buildingTypes[value.toLowerCase()] || buildingTypes[value] || value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Common boolean/yes-no values
    if (typeof value === 'boolean') {
      return value ? (isGerman ? 'Ja' : 'Yes') : (isGerman ? 'Nein' : 'No');
    }

    // Arrays (join with commas)
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    // Default: check for common translations, then replace underscores with spaces and capitalize
    if (typeof value === 'string') {
      // Common value translations
      const commonTranslations = {
        'yes': isGerman ? 'Ja' : 'Yes',
        'no': isGerman ? 'Nein' : 'No',
        'true': isGerman ? 'Ja' : 'Yes',
        'false': isGerman ? 'Nein' : 'No',
        'pending': isGerman ? 'Ausstehend' : 'Pending',
        'accepted': isGerman ? 'Akzeptiert' : 'Accepted',
        'rejected': isGerman ? 'Abgelehnt' : 'Rejected',
        'assigned': isGerman ? 'Zugewiesen' : 'Assigned',
        'cancelled': isGerman ? 'Storniert' : 'Cancelled',
        'completed': isGerman ? 'Abgeschlossen' : 'Completed',
        'business': isGerman ? 'Geschäftlich' : 'Business',
        'private': isGerman ? 'Privat' : 'Private',
        'apartment': isGerman ? 'Wohnung' : 'Apartment',
        'rental_apartment': isGerman ? 'Mietwohnung' : 'Rental Apartment',
        'own_apartment': isGerman ? 'Eigentumswohnung' : 'Own Apartment',
        'house': isGerman ? 'Haus' : 'House',
        'rental_house': isGerman ? 'Miethaus' : 'Rental House',
        'own_house': isGerman ? 'Eigenhaus' : 'Own House',
        'own_home': isGerman ? 'Eigenheim' : 'Own Home',
        'office': isGerman ? 'Büro' : 'Office',
        'commercial': isGerman ? 'Gewerbe' : 'Commercial',
        'man': isGerman ? 'Mann' : 'Man',
        'woman': isGerman ? 'Frau' : 'Woman',
        'women': isGerman ? 'Frau' : 'Woman',
        'men': isGerman ? 'Mann' : 'Man',
        'mister': isGerman ? 'Herr' : 'Mister',
        'miss': isGerman ? 'Fräulein' : 'Miss',
        // Time/Date related
        'next month': isGerman ? 'Nächsten Monat' : 'Next Month',
        'next_month': isGerman ? 'Nächsten Monat' : 'Next Month',
        'this month': isGerman ? 'Diesen Monat' : 'This Month',
        'this_month': isGerman ? 'Diesen Monat' : 'This Month',
        'asap': isGerman ? 'So bald wie möglich' : 'ASAP',
        'flexible': isGerman ? 'Flexibel' : 'Flexible',
        'fixed': isGerman ? 'Fest' : 'Fixed',
        // Location types
        'single location': isGerman ? 'Einzelner Standort' : 'Single Location',
        'single_location': isGerman ? 'Einzelner Standort' : 'Single Location',
        'multiple locations': isGerman ? 'Mehrere Standorte' : 'Multiple Locations',
        'multiple_locations': isGerman ? 'Mehrere Standorte' : 'Multiple Locations',
        // Frequency
        'unique': isGerman ? 'Einmalig' : 'Unique',
        'one-time': isGerman ? 'Einmalig' : 'One-Time',
        'one_time': isGerman ? 'Einmalig' : 'One-Time',
        'weekly': isGerman ? 'Wöchentlich' : 'Weekly',
        'biweekly': isGerman ? 'Zweiwöchentlich' : 'Biweekly',
        'monthly': isGerman ? 'Monatlich' : 'Monthly',
        'daily': isGerman ? 'Täglich' : 'Daily',
        // Budget Scope
        'up_to_5k': isGerman ? 'Bis zu €5.000' : 'Up to €5,000',
        'up to €5.000': isGerman ? 'Bis zu €5.000' : 'Up to €5,000',
        'up to 5k': isGerman ? 'Bis zu €5.000' : 'Up to €5,000',
        '5k_to_10k': isGerman ? '€5.000 - €10.000' : '€5,000 - €10,000',
        '€5.000 - €10.000': isGerman ? '€5.000 - €10.000' : '€5,000 - €10,000',
        '5k to 10k': isGerman ? '€5.000 - €10.000' : '€5,000 - €10,000',
        '10k_to_25k': isGerman ? '€10.000 - €25.000' : '€10,000 - €25,000',
        '€10.000 - €25.000': isGerman ? '€10.000 - €25.000' : '€10,000 - €25,000',
        '10k to 25k': isGerman ? '€10.000 - €25.000' : '€10,000 - €25,000',
        '25k_to_50k': isGerman ? '€25.000 - €50.000' : '€25,000 - €50,000',
        '€25.000 - €50.000': isGerman ? '€25.000 - €50.000' : '€25,000 - €50,000',
        '25k to 50k': isGerman ? '€25.000 - €50.000' : '€25,000 - €50,000',
        '50k_plus': isGerman ? 'Über €50.000' : 'Over €50,000',
        'über €50.000': isGerman ? 'Über €50.000' : 'Over €50,000',
        '50k plus': isGerman ? 'Über €50.000' : 'Over €50,000'
      };

      // Check if the lowercase value has a translation
      const lowerValue = value.toLowerCase();
      if (commonTranslations[lowerValue]) {
        return commonTranslations[lowerValue];
      }

      // Don't capitalize email addresses - return as-is
      if (key === 'email' || key.toLowerCase().includes('email')) {
        return value;
      }

      return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    return value;
  };

  // Translate field labels to German
  const translateLabel = (key) => {
    const labelTranslations = {
      'salutation': isGerman ? 'Anrede' : 'Salutation',
      'firstName': isGerman ? 'Vorname' : 'First Name',
      'lastName': isGerman ? 'Nachname' : 'Last Name',
      'email': isGerman ? 'E-Mail' : 'Email',
      'phone': isGerman ? 'Telefon' : 'Phone',
      'moveDateType': isGerman ? 'Umzugsdatum-Typ' : 'Move Date Type',
      'moveDate': isGerman ? 'Umzugsdatum' : 'Move Date',
      'desiredMoveDate': isGerman ? 'Gewünschtes Umzugsdatum' : 'Desired Move Date',
      'additionalServices': isGerman ? 'Zusätzliche Dienste' : 'Additional Services',
      'specialInstructions': isGerman ? 'Besondere Anweisungen' : 'Special Instructions',
      'movingType': isGerman ? 'Umzugsart' : 'Moving Type',
      'buildingType': isGerman ? 'Gebäudetyp' : 'Building Type',
      'roomCount': isGerman ? 'Zimmeranzahl' : 'Room Count',
      'flexiblePeriod': isGerman ? 'Flexibler Zeitraum' : 'Flexible Period',
      'bestReachTime': isGerman ? 'Beste Erreichbarkeit' : 'Best Reach Time',
      'estimatedCommercialArea': isGerman ? 'Geschätzte Gewerbefläche' : 'Estimated Commercial Area',
      'startDate': isGerman ? 'Startdatum' : 'Start Date',
      'endDate': isGerman ? 'Enddatum' : 'End Date',
      'desiredStartDate': isGerman ? 'Gewünschtes Startdatum' : 'Desired Start Date',
      'duration': isGerman ? 'Dauer' : 'Duration',
      'budgetScope': isGerman ? 'Budget bis maximal' : 'Budget Scope',
      'projectDescription': isGerman ? 'Kurze Beschreibung des Projekts' : 'Project Description',
      'services': isGerman ? 'Dienste' : 'Services',
      'serviceTypes': isGerman ? 'Diensttypen' : 'Service Types',
      'servicesWanted': isGerman ? 'Gewünschte Dienste' : 'Services Wanted',
      'propertyType': isGerman ? 'Objekttyp' : 'Property Type',
      'surfaceArea': isGerman ? 'Fläche' : 'Surface Area',
      'preferredContactTime': isGerman ? 'Bevorzugte Kontaktzeit' : 'Preferred Contact Time',
      'frequency': isGerman ? 'Häufigkeit' : 'Frequency',
      'objectType': isGerman ? 'Objekttyp' : 'Object Type',
      'desiredStart': isGerman ? 'Gewünschter Beginn' : 'Desired Start',
      'serviceAddress': isGerman ? 'Serviceadresse' : 'Service Address',
      'venueType': isGerman ? 'Veranstaltungsort' : 'Venue Type',
      'areaSize': isGerman ? 'Flächengröße' : 'Area Size',
      'address': isGerman ? 'Adresse' : 'Address',
      'locationType': isGerman ? 'Standorttyp' : 'Location Type',
      'startDate': isGerman ? 'Startdatum' : 'Start Date',
      'endDate': isGerman ? 'Enddatum' : 'End Date',
      'fixedDate': isGerman ? 'Festes Datum' : 'Fixed Date',
      'transportType': isGerman ? 'Transportart' : 'Transport Type',
      'roomsIncluded': isGerman ? 'Zimmer inbegriffen' : 'Rooms Included',
      'estimatedLivingSpace': isGerman ? 'Geschätzte Wohnfläche' : 'Estimated Living Space',
      'costCoverage': isGerman ? 'Kostenübernahme' : 'Cost Coverage',
      'company': isGerman ? 'Unternehmen' : 'Company',
      'location_address': isGerman ? 'Straße und Hausnummer' : 'Address',
      'location_city': isGerman ? 'Stadt' : 'City',
      'location_postalCode': isGerman ? 'Postleitzahl' : 'Postal Code',
      'location_country': isGerman ? 'Land' : 'Country'
    };

    if (labelTranslations[key]) {
      return labelTranslations[key];
    }

    // Default: convert camelCase to readable format
    return key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase());
  };

  const TableRow = ({ label, value, isContactInfo = false }) => {
    // Hide contact info for partners until lead is accepted
    if (isContactInfo && isPartner && leadData?.partnerStatus !== 'accepted') {
      return (
        <tr>
          <td className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)', width: '140px', minWidth: '140px' }}>
            {label}:
          </td>
          <td className="px-3 py-2 text-sm" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
            {isGerman ? 'Details nach Akzeptanz verfügbar' : 'Details available after acceptance'}
          </td>
        </tr>
      );
    }

    return (
      <tr>
        <td className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)', width: '140px', minWidth: '140px' }}>
          {label}:
        </td>
        <td className="px-3 py-2 text-sm" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
          {typeof value === 'object' ? renderValue(value) : (value || '-')}
        </td>
      </tr>
    );
  };

  if (!isOpen || !leadData) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        style={{ paddingLeft: '10rem', paddingTop: '2rem' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="rounded-lg border flex flex-col overflow-hidden"
          style={{
            borderColor: 'var(--theme-border)',
            backgroundColor: 'var(--theme-bg-secondary)',
            width: '1126px',
            height: '80vh',
            maxHeight: '800px',
            marginTop: '50px'
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Back Button */}
          <div className="px-4 py-3 border-b flex items-center justify-between bg-opacity-100" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg-secondary)' }}>
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                style={{ color: 'var(--theme-text)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--theme-text)' }}>
                  {t('leads.leadDetails')}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                    {leadData.leadId}
                  </span>
                  {(() => {
                    // For partners, show partner-specific status; for admins, show general lead status
                    const displayStatus = isPartner ? (leadData.partnerStatus || leadData.status) : leadData.status;

                    return (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${
                        displayStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                        displayStatus === 'accepted' ? 'bg-green-100 text-green-800 border-green-400' :
                        displayStatus === 'rejected' ? 'bg-red-100 text-red-800 border-red-300' :
                        displayStatus === 'partial_assigned' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                        displayStatus === 'assigned' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        displayStatus === 'cancelled' || displayStatus === 'cancellation_approved' ? 'bg-red-100 text-red-800 border-red-300' :
                        displayStatus === 'cancellationRequested' || displayStatus === 'cancel_requested' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                        'bg-gray-100 text-gray-800 border-gray-300'
                      }`}>
                        {displayStatus === 'pending' ? (isGerman ? 'Ausstehend' : 'Pending') :
                         displayStatus === 'accepted' ? (isGerman ? 'Akzeptiert' : 'Accepted') :
                         displayStatus === 'rejected' ? (isGerman ? 'Abgelehnt' : 'Rejected') :
                         displayStatus === 'partial_assigned' ? (isGerman ? 'Teilweise zugewiesen' : 'Partially Assigned') :
                         displayStatus === 'assigned' ? (isGerman ? 'Zugewiesen' : 'Assigned') :
                         displayStatus === 'cancelled' || displayStatus === 'cancellation_approved' ? (isGerman ? 'Storniert' : 'Cancelled') :
                         displayStatus === 'cancellationRequested' || displayStatus === 'cancel_requested' ? (isGerman ? 'Stornierung angefragt' : 'Cancellation Requested') :
                         displayStatus}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            {/* Lead Details - 2 Column Layout */}
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--theme-border)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column - Customer Information */}
              <div>
                <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                  {t('leads.customerInfo')}
                </h4>
                <div>
                  <table className="w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
                    <tbody>
                      <TableRow
                        label={t('leads.leadId')}
                        value={leadData.leadId}
                      />
                      <TableRow
                        label={t('common.name')}
                        value={leadData.name}
                      />
                      <TableRow
                        label={t('common.email')}
                        value={leadData.email}
                        isContactInfo={true}
                      />
                      {leadData.user?.phone && (
                        <TableRow
                          label={t('common.phone')}
                          value={leadData.user.phone}
                          isContactInfo={true}
                        />
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column - Service & Additional Information */}
              <div>
                <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Dienst & Details' : 'Service & Details'}
                </h4>
                <div>
                  <table className="w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
                    <tbody>
                      <TableRow
                        label={t('leads.service')}
                        value={
                          `${t(`services.${leadData.serviceType}`)}${leadData.moveType ? ` - ${leadData.moveType.replace('_', ' ')}` : ''}`
                        }
                      />
                      {leadData.sourceDomain && (
                        <TableRow
                          label={t('leads.sourceDomain')}
                          value={leadData.sourceDomain}
                        />
                      )}
                      {(() => {
                        const city = leadData.formData?.location?.city || leadData.city;
                        const postalCode = leadData.formData?.location?.postalCode || leadData.postalCode;
                        const country = leadData.formData?.location?.country || leadData.country || 'Germany';

                        return city || postalCode ? (
                          <TableRow
                            label={isGerman ? 'Standort' : 'Location'}
                            value={`${city || ''}${postalCode ? ` ${postalCode}` : ''}, ${country}`}
                          />
                        ) : null;
                      })()}
                      {leadData.assignedPartner && (
                        <TableRow
                          label={t('leads.assignedPartner')}
                          value={
                            typeof leadData.assignedPartner === 'object'
                              ? (typeof leadData.assignedPartner.companyName === 'object'
                                  ? leadData.assignedPartner.companyName?.companyName || leadData.assignedPartner.companyName?._id || 'N/A'
                                  : leadData.assignedPartner.companyName || leadData.assignedPartner._id || 'N/A')
                              : leadData.assignedPartner
                          }
                        />
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Form Data and User Details - 2 Column Layout */}
          {((leadData.formData && Object.keys(leadData.formData).length > 0) || leadData.user) && (
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Form Data */}
                {leadData.formData && Object.keys(leadData.formData).length > 0 && (
                  <div>
                    <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                      {isGerman ? 'Formulardetails' : 'Form Details'}
                    </h4>
                    <div>
                      <table className="w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
                        <tbody>
                          {Object.entries(leadData.formData).map(([key, value]) => {
                            // Skip empty values and internal fields
                            if (value === null || value === undefined || value === '' || key.startsWith('_')) {
                              return null;
                            }

                            // Skip consent fields that are not in the form
                            const consentFields = [
                              'gdprConsent',
                              'dataProcessingConsent',
                              'marketingConsent'
                            ];
                            if (consentFields.includes(key)) return null;

                            // Skip duplicate/redundant fields (prefer more specific names)
                            const redundantFields = [
                              'address', // Skip if serviceAddress exists
                              'areaSize', // Skip if surfaceArea exists
                              'serviceTypes', // Skip if services exists
                              'service_types' // Skip if services exists
                            ];

                            // Check if this is a redundant field that has a preferred alternative
                            if (key === 'address' && leadData.formData.serviceAddress) return null;
                            if (key === 'areaSize' && leadData.formData.surfaceArea) return null;
                            if ((key === 'serviceTypes' || key === 'service_types') && leadData.formData.services) return null;
                            if (key === 'services' && (leadData.formData.serviceTypes || leadData.formData.service_types)) {
                              // Prefer services over serviceTypes, so don't skip
                            }

                            // Format the label with translation
                            const label = translateLabel(key);

                            return (
                              <TableRow
                                key={key}
                                label={label}
                                value={formatFormValue(key, value)}
                              />
                            );
                          }).filter(Boolean)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* User Details & Timestamps - Skip for security leads (already shown in Form Details) */}
                <div>
                  {leadData.user && leadData.serviceType !== 'security' && (
                    <>
                      <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Zusätzliche Benutzerdetails' : 'Additional User Details'}
                      </h4>
                      <div className="mb-6">
                        <table className="w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
                          <tbody>
                            {leadData.user.salutation && (
                              <TableRow
                                label={isGerman ? 'Anrede' : 'Salutation'}
                                value={formatFormValue('salutation', leadData.user.salutation)}
                                isContactInfo={true}
                              />
                            )}
                            {leadData.user.firstName && (
                              <TableRow
                                label={isGerman ? 'Vorname' : 'First Name'}
                                value={leadData.user.firstName}
                                isContactInfo={true}
                              />
                            )}
                            {leadData.user.lastName && (
                              <TableRow
                                label={isGerman ? 'Nachname' : 'Last Name'}
                                value={leadData.user.lastName}
                                isContactInfo={true}
                              />
                            )}
                            {leadData.user.preferredContactTime && (
                              <TableRow
                                label={isGerman ? 'Bevorzugte Kontaktzeit' : 'Preferred Contact Time'}
                                value={formatFormValue('preferredContactTime', leadData.user.preferredContactTime)}
                                isContactInfo={true}
                              />
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* Timestamps */}
                  <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Zeitstempel' : 'Timestamps'}
                  </h4>
                  <div>
                    <table className="w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
                      <tbody>
                        <TableRow
                          label={t('leads.createdAt')}
                          value={new Date(leadData.createdAt).toLocaleString('de-DE')}
                        />
                        {leadData.assignedAt && (
                          <TableRow
                            label={isGerman ? 'Zugewiesen am' : 'Assigned At'}
                            value={new Date(leadData.assignedAt).toLocaleString('de-DE')}
                          />
                        )}
                        {leadData.acceptedAt && (
                          <TableRow
                            label={isGerman ? 'Akzeptiert am' : 'Accepted At'}
                            value={new Date(leadData.acceptedAt).toLocaleString('de-DE')}
                          />
                        )}
                        {leadData.updatedAt && leadData.updatedAt !== leadData.createdAt && (
                          <TableRow
                            label={isGerman ? 'Zuletzt aktualisiert' : 'Last Updated'}
                            value={new Date(leadData.updatedAt).toLocaleString('de-DE')}
                          />
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LeadDetailsDialog;