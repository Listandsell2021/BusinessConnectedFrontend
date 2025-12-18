/**
 * German Date & Time Formatter
 * Ensures all dates follow German standard: DD.MM.YYYY, HH:MM
 * Reference: https://en.wikipedia.org/wiki/Date_format_by_country#Germany
 */

/**
 * Format date as DD.MM.YYYY
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date in DD.MM.YYYY format
 */
export const formatDateGerman = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    return d.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * Format time as HH:MM (24-hour format)
 * @param {Date|string|number} date - Date/time to format
 * @returns {string} Formatted time in HH:MM format
 */
export const formatTimeGerman = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    return d.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return '-';
  }
};

/**
 * Format date and time as DD.MM.YYYY, HH:MM
 * @param {Date|string|number} date - Date/time to format
 * @returns {string} Formatted date and time
 */
export const formatDateTimeGerman = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    return d.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Error formatting date and time:', error);
    return '-';
  }
};

/**
 * Format date range as DD.MM.YYYY - DD.MM.YYYY
 * @param {Date|string|number} startDate - Start date
 * @param {Date|string|number} endDate - End date
 * @returns {string} Formatted date range
 */
export const formatDateRangeGerman = (startDate, endDate) => {
  if (!startDate || !endDate) return '-';

  const start = formatDateGerman(startDate);
  const end = formatDateGerman(endDate);

  return `${start} - ${end}`;
};

/**
 * Get German month name
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} Month name in German
 */
export const getGermanMonthName = (monthIndex) => {
  const months = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  return months[monthIndex] || '';
};

/**
 * Format month and year as "Dezember 2025"
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {string} Formatted month and year
 */
export const formatMonthYearGerman = (month, year) => {
  const monthName = getGermanMonthName(month - 1);
  return `${monthName} ${year}`;
};

/**
 * Format date with long format: "17. Dezember 2025"
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date
 */
export const formatDateLongGerman = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    return d.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * Format date and time with long format: "17. Dezember 2025, 14:02 Uhr"
 * @param {Date|string|number} date - Date/time to format
 * @returns {string} Formatted date and time
 */
export const formatDateTimeLongGerman = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    const dateStr = d.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const timeStr = d.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return `${dateStr}, ${timeStr} Uhr`;
  } catch (error) {
    console.error('Error formatting date and time:', error);
    return '-';
  }
};

export default {
  formatDateGerman,
  formatTimeGerman,
  formatDateTimeGerman,
  formatDateRangeGerman,
  getGermanMonthName,
  formatMonthYearGerman,
  formatDateLongGerman,
  formatDateTimeLongGerman
};
