// Validation Middleware - Input Validation
const { body, param, query, validationResult } = require('express-validator');
const { getService } = require('../config/services');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// Common validations
const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Valid email is required');

const validatePhone = body('phone')
  .notEmpty()
  .trim()
  .withMessage('Phone number is required');

const validateName = (field) => body(field)
  .isLength({ min: 2, max: 50 })
  .trim()
  .withMessage(`${field} must be 2-50 characters`);

// Lead form validation - Dynamic based on service
const validateLeadForm = (serviceType) => {
  const service = getService(serviceType);
  if (!service) {
    return [body('serviceType').custom(() => {
      throw new Error('Invalid service type');
    })];
  }

  const validations = [];
  
  // Validate each required field based on service config
  service.fields.forEach(field => {
    if (field.required) {
      switch (field.type) {
        case 'email':
          validations.push(
            body(`formData.${field.name}`)
              .isEmail()
              .withMessage(`${field.label} must be a valid email`)
          );
          break;
        case 'text':
          validations.push(
            body(`formData.${field.name}`)
              .notEmpty()
              .trim()
              .withMessage(`${field.label} is required`)
          );
          break;
        case 'number':
          validations.push(
            body(`formData.${field.name}`)
              .isNumeric()
              .withMessage(`${field.label} must be a number`)
          );
          break;
        case 'select':
        case 'boolean':
          validations.push(
            body(`formData.${field.name}`)
              .notEmpty()
              .withMessage(`${field.label} is required`)
          );
          break;
        case 'array':
          validations.push(
            body(`formData.${field.name}`)
              .isArray({ min: 1 })
              .withMessage(`${field.label} must have at least one selection`)
          );
          break;
      }
    }
  });

  return validations;
};

// Partner validation
const validatePartner = [
  body('companyName')
    .notEmpty()
    .trim()
    .withMessage('Company name is required'),
  body('contactPerson.firstName')
    .notEmpty()
    .trim()
    .withMessage('First name is required'),
  body('contactPerson.lastName')
    .notEmpty()
    .trim()
    .withMessage('Last name is required'),
  body('contactPerson.email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('contactPerson.phone')
    .notEmpty()
    .trim()
    .withMessage('Phone is required'),
  body('address.street')
    .notEmpty()
    .trim()
    .withMessage('Street address is required'),
  body('address.city')
    .notEmpty()
    .trim()
    .withMessage('City is required'),
  body('services')
    .isString()
    .withMessage('Service must be a string')
    .notEmpty()
    .withMessage('Service is required')
    .isIn(['moving', 'cleaning'])
    .withMessage('Invalid service type')
];

// Login validation
const validateLogin = [
  validateEmail,
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

// Parameter validation
const validateObjectId = (paramName) => 
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`);

// Query validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

module.exports = {
  handleValidationErrors,
  validateEmail,
  validatePhone,
  validateName,
  validateLeadForm,
  validatePartner,
  validateLogin,
  validateObjectId,
  validatePagination
};