// Form Configurations
// Centralized export of all form configs
// Actual configs are loaded from the database, these are fallbacks/defaults

import clientFormConfig from './client';
import companyFormConfig from './company';

export const formConfigs = {
  securityClient: clientFormConfig,
  securityCompany: companyFormConfig
};

/**
 * Get form configuration by type
 * @param {string} formType - Type of form (securityClient, securityCompany)
 * @returns {object} Form configuration
 */
export const getFormConfig = (formType) => {
  return formConfigs[formType] || null;
};

export default formConfigs;
