// Authentication Middleware - JWT & Role-based Access
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Partner = require('../models/Partner');
const logger = require('../utils/logger');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details based on role
    let user;
    if (decoded.role === 'partner') {
      if (decoded.selectedService) {
        // Find the specific partner document for the selected service
        user = await Partner.findOne({ 
          _id: decoded.id,
          serviceType: decoded.selectedService
        });
      } else {
        // First try to find by ID
        user = await Partner.findById(decoded.id);
        
        // If not found, the ID might be from old structure
        // Try to find any partner document with the email from the JWT
        if (!user && decoded.email) {
          user = await Partner.findOne({ 'contactPerson.email': decoded.email });
        }
      }
    } else {
      user = await User.findById(decoded.id);
    }

    // Check user existence and status based on role
    if (!user) {
      return res.status(401).json({ message: 'Invalid user' });
    }
    
    // For partners with new single-service structure
    if (decoded.role === 'partner') {
      if (user.status !== 'active') {
        return res.status(401).json({ message: 'Service not active' });
      }
    } else {
      // For non-partners (superadmin/users), use overall status
      if (!user.isActive && user.status !== 'active') {
        return res.status(401).json({ message: 'Inactive user account' });
      }
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: user.contactPerson?.email || user.email
    };
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
};

// Check if user is superadmin
const requireSuperadmin = authorize('superadmin');

// Check if user is partner or superadmin
const requirePartnerOrAdmin = authorize('partner', 'superadmin');

// Check if user owns resource or is admin
const requireOwnershipOrAdmin = (resourceKey = 'partnerId') => {
  return (req, res, next) => {
    if (req.user.role === 'superadmin') {
      return next();
    }

    if (req.user.role === 'partner') {
      const resourceId = req.params[resourceKey] || req.body[resourceKey];
      if (resourceId && resourceId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    next();
  };
};

// Optional authentication - sets req.user if token provided, otherwise continues
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided - continue without setting req.user
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user details based on role
    let user;
    if (decoded.role === 'partner') {
      if (decoded.selectedService) {
        user = await Partner.findOne({
          _id: decoded.id,
          serviceType: decoded.selectedService
        });
      } else {
        user = await Partner.findById(decoded.id);
        if (!user && decoded.email) {
          user = await Partner.findOne({ 'contactPerson.email': decoded.email });
        }
      }
    } else {
      user = await User.findById(decoded.id);
    }

    // If user found and active, set req.user
    if (user) {
      if (decoded.role === 'partner') {
        if (user.status === 'active') {
          req.user = {
            id: decoded.id,
            role: decoded.role,
            email: user.contactPerson?.email || user.email
          };
        }
      } else {
        if (user.isActive || user.status === 'active') {
          req.user = {
            id: decoded.id,
            role: decoded.role,
            email: user.contactPerson?.email || user.email
          };
        }
      }
    }

    next();
  } catch (error) {
    // Token invalid - continue without setting req.user
    next();
  }
};

module.exports = {
  authenticateToken,
  authorize,
  requireSuperadmin,
  requirePartnerOrAdmin,
  requireOwnershipOrAdmin,
  optionalAuth
};