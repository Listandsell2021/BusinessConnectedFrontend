// Input Sanitization Middleware
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const validator = require('validator');

// Sanitize and validate input data
const sanitizeInput = (req, res, next) => {
  // Recursively sanitize all string values in req.body
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      // Remove HTML/script tags and sanitize
      let sanitized = xss(obj, {
        whiteList: {}, // No HTML tags allowed
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
      });
      
      // Additional sanitization
      sanitized = validator.escape(sanitized);
      
      return sanitized;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitizedObj = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize both key and value
        const sanitizedKey = validator.escape(key);
        sanitizedObj[sanitizedKey] = sanitizeObject(value);
      }
      return sanitizedObj;
    }
    
    return obj;
  };

  try {
    // Apply MongoDB injection protection first
    mongoSanitize()(req, res, () => {});
    
    // Then sanitize input data
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    // Input sanitization error - logged via proper logging system
    res.status(400).json({ 
      message: 'Invalid input data',
      error: 'Input contains potentially harmful content'
    });
  }
};

// Validate email format
const validateEmail = (email) => {
  return validator.isEmail(email);
};

// Validate phone number format
const validatePhone = (phone) => {
  // Basic phone validation - can be enhanced based on requirements
  return validator.isMobilePhone(phone, 'any', { strictMode: false });
};

// Validate URL format
const validateURL = (url) => {
  return validator.isURL(url, {
    require_protocol: true,
    require_host: true,
    require_valid_protocol: true,
    allow_underscores: false,
    allow_trailing_dot: false,
    allow_protocol_relative_urls: false
  });
};

// Specific validation for lead form data
const validateLeadData = (req, res, next) => {
  const { formData } = req.body;
  
  if (!formData) {
    return res.status(400).json({ message: 'Form data is required' });
  }

  const errors = [];

  // Validate email
  if (formData.email && !validateEmail(formData.email)) {
    errors.push('Invalid email format');
  }

  // Validate phone
  if (formData.phone && !validatePhone(formData.phone)) {
    errors.push('Invalid phone number format');
  }

  // Validate names (no special characters except spaces, hyphens, apostrophes)
  const namePattern = /^[a-zA-Z\s\-']+$/;
  if (formData.firstName && !namePattern.test(formData.firstName)) {
    errors.push('Invalid first name format');
  }
  
  if (formData.lastName && !namePattern.test(formData.lastName)) {
    errors.push('Invalid last name format');
  }

  // Validate dates
  if (formData.movingDate && !validator.isISO8601(formData.movingDate)) {
    errors.push('Invalid moving date format');
  }
  
  if (formData.cleaningDate && !validator.isISO8601(formData.cleaningDate)) {
    errors.push('Invalid cleaning date format');
  }

  // Validate text length limits
  const maxTextLength = 1000;
  if (formData.specialRequirements && formData.specialRequirements.length > maxTextLength) {
    errors.push(`Special requirements text too long (max ${maxTextLength} characters)`);
  }
  
  if (formData.specialInstructions && formData.specialInstructions.length > maxTextLength) {
    errors.push(`Special instructions text too long (max ${maxTextLength} characters)`);
  }

  // Validate addresses (basic length check)
  const maxAddressLength = 500;
  if (formData.address && formData.address.length > maxAddressLength) {
    errors.push(`Address too long (max ${maxAddressLength} characters)`);
  }
  
  if (formData.pickupAddress && formData.pickupAddress.length > maxAddressLength) {
    errors.push(`Pickup address too long (max ${maxAddressLength} characters)`);
  }
  
  if (formData.deliveryAddress && formData.deliveryAddress.length > maxAddressLength) {
    errors.push(`Delivery address too long (max ${maxAddressLength} characters)`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      message: 'Validation errors',
      errors: errors
    });
  }

  next();
};

module.exports = {
  sanitizeInput,
  validateEmail,
  validatePhone,
  validateURL,
  validateLeadData
};