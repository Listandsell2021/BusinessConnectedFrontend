const Service = require('../models/Service');

// @desc    Get all available services
// @route   GET /api/services
// @access  Public
const getAllServices = async (req, res) => {
  try {
    const services = await Service.getAllActive();
    res.json({
      success: true,
      services: services.map(service => ({
        id: service.type,
        type: service.type,
        name: service.name,
        domain: service.domain,
        providerCount: service.providerCount,
        active: service.active
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get services', 
      error: error.message 
    });
  }
};

// @desc    Get service configuration by type
// @route   GET /api/services/:serviceType
// @access  Public
const getServiceByType = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const service = await Service.getByType(serviceType);
    
    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found' 
      });
    }

    res.json({
      success: true,
      service: {
        type: service.type,
        name: service.name,
        domain: service.domain,
        providerCount: service.providerCount,
        fields: service.fields
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get service', 
      error: error.message 
    });
  }
};

// @desc    Get form fields for service
// @route   GET /api/services/:serviceType/form-fields
// @access  Public
const getServiceFormFields = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const service = await Service.getByType(serviceType);
    
    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found' 
      });
    }

    res.json({
      success: true,
      fields: service.fields,
      serviceName: service.name
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get form fields', 
      error: error.message 
    });
  }
};

// @desc    Create a new service
// @route   POST /api/services
// @access  Admin
const createService = async (req, res) => {
  try {
    const service = new Service(req.body);
    await service.save();
    
    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Service type or domain already exists' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Failed to create service', 
      error: error.message 
    });
  }
};

// @desc    Update a service
// @route   PUT /api/services/:serviceType
// @access  Admin
const updateService = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const service = await Service.findOneAndUpdate(
      { type: serviceType },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to update service', 
      error: error.message 
    });
  }
};

// @desc    Deactivate a service
// @route   DELETE /api/services/:serviceType
// @access  Admin
const deactivateService = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const service = await Service.findOneAndUpdate(
      { type: serviceType },
      { active: false },
      { new: true }
    );
    
    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Service deactivated successfully',
      service
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to deactivate service', 
      error: error.message 
    });
  }
};

module.exports = {
  getAllServices,
  getServiceByType,
  getServiceFormFields,
  createService,
  updateService,
  deactivateService
};