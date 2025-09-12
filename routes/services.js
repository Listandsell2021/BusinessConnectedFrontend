// Service Routes - MVC Architecture
const express = require('express');
const router = express.Router();
const {
  getAllServices,
  getServiceByType,
  getServiceFormFields,
  createService,
  updateService,
  deactivateService
} = require('../controllers/serviceController');

// @route   GET /api/services// @desc    Get all available services// @access  Public
router.get('/', getAllServices);

// @route   GET /api/services/:serviceType// @desc    Get service configuration// @access  Public
router.get('/:serviceType', getServiceByType);

// @route   GET /api/services/:serviceType/form-fields// @desc    Get form fields for service// @access  Public
router.get('/:serviceType/form-fields', getServiceFormFields);

// @route   POST /api/services// @desc    Create a new service// @access  Admin
router.post('/', createService);

// @route   PUT /api/services/:serviceType// @desc    Update a service// @access  Admin
router.put('/:serviceType', updateService);

// @route   DELETE /api/services/:serviceType// @desc    Deactivate a service// @access  Admin
router.delete('/:serviceType', deactivateService);

module.exports = router;