const express = require('express');
const router = express.Router();
const CancelRequest = require('../models/CancelRequest');
const Lead = require('../models/Lead');
const Partner = require('../models/Partner');
const AdminLog = require('../models/AdminLog');
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const { validateObjectId, handleValidationErrors } = require('../middleware/validation');
const { createAuditLog } = require('../middleware/logging');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// @route   GET /api/cancel-requests
// @desc    Get all pending cancel requests
// @access  Private (Superadmin)
router.get('/',
  authenticateToken,
  requireSuperadmin,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status = 'pending',
        sortBy = 'requestedAt',
        sortOrder = 'desc'
      } = req.query;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const filter = {};
      if (status && status !== 'all') {
        filter.status = status;
      }

      const [requests, totalCount] = await Promise.all([
        CancelRequest.find(filter)
          .populate('lead', 'leadId serviceType createdAt actualValue')
          .populate('partner', 'companyName contactPerson.email')
          .populate('processedBy', 'email')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit)),
        CancelRequest.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          requests,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching cancel requests:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching cancel requests'
      });
    }
  }
);

// @route   GET /api/cancel-requests/:requestId
// @desc    Get specific cancel request details
// @access  Private (Superadmin)
router.get('/:requestId',
  authenticateToken,
  requireSuperadmin,
  validateObjectId('requestId'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const request = await CancelRequest.findById(req.params.requestId)
        .populate('lead', 'leadId serviceType createdAt actualValue formData user')
        .populate('partner', 'companyName contactPerson partnerType')
        .populate('processedBy', 'email');

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Cancel request not found'
        });
      }

      // Also get the lead with partner assignment details
      const leadWithAssignments = await Lead.findById(request.lead._id)
        .populate('partnerAssignments.partner', 'companyName')
        .populate('user', 'firstName lastName email phone');

      const partnerAssignment = leadWithAssignments.partnerAssignments.find(
        assignment => assignment.partner._id.toString() === request.partner._id.toString()
      );

      res.json({
        success: true,
        data: {
          request,
          leadDetails: leadWithAssignments,
          partnerAssignment
        }
      });

    } catch (error) {
      logger.error('Error fetching cancel request details:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching cancel request details'
      });
    }
  }
);

// @route   PUT /api/cancel-requests/:requestId/approve
// @desc    Approve a cancel request
// @access  Private (Superadmin)
router.put('/:requestId/approve',
  authenticateToken,
  requireSuperadmin,
  validateObjectId('requestId'),
  [
    body('adminNotes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Admin notes cannot exceed 1000 characters')
  ],
  handleValidationErrors,
  createAuditLog('cancel_request_approved'),
  async (req, res) => {
    try {
      const { adminNotes } = req.body;

      const cancelRequest = await CancelRequest.findById(req.params.requestId)
        .populate('lead', 'leadId serviceType')
        .populate('partner', 'companyName contactPerson.email');

      if (!cancelRequest) {
        return res.status(404).json({
          success: false,
          message: 'Cancel request not found'
        });
      }

      if (cancelRequest.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Cancel request has already been processed'
        });
      }

      // Approve the cancel request
      await cancelRequest.approve(req.user.id, adminNotes);

      // Update the lead partner assignment to cancelled
      const lead = await Lead.findById(cancelRequest.lead._id);
      const partnerAssignment = lead.partnerAssignments.find(
        assignment => assignment.partner.toString() === cancelRequest.partner._id.toString()
      );

      if (partnerAssignment) {
        partnerAssignment.status = 'cancelled';
        partnerAssignment.cancellationApproved = true;
        partnerAssignment.cancellationApprovedAt = new Date();
        await lead.save();
      }

      // Update partner metrics
      const partner = await Partner.findById(cancelRequest.partner._id);
      if (partner) {
        partner.metrics.totalLeadsCancelled += 1;
        if (partner.metrics.totalLeadsAccepted > 0) {
          partner.metrics.totalLeadsAccepted -= 1;
        }
        await partner.save();
      }

      logger.info(`Cancel request ${cancelRequest._id} approved by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Cancel request approved successfully',
        data: {
          requestId: cancelRequest._id,
          leadId: cancelRequest.lead.leadId,
          status: 'approved',
          processedAt: cancelRequest.processedAt,
          adminNotes
        }
      });

    } catch (error) {
      logger.error('Error approving cancel request:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while approving cancel request'
      });
    }
  }
);

// @route   PUT /api/cancel-requests/:requestId/reject
// @desc    Reject a cancel request
// @access  Private (Superadmin)
router.put('/:requestId/reject',
  authenticateToken,
  requireSuperadmin,
  validateObjectId('requestId'),
  [
    body('adminNotes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Admin notes cannot exceed 1000 characters')
  ],
  handleValidationErrors,
  createAuditLog('cancel_request_rejected'),
  async (req, res) => {
    try {
      const { adminNotes } = req.body;

      const cancelRequest = await CancelRequest.findById(req.params.requestId)
        .populate('lead', 'leadId serviceType')
        .populate('partner', 'companyName contactPerson.email');

      if (!cancelRequest) {
        return res.status(404).json({
          success: false,
          message: 'Cancel request not found'
        });
      }

      if (cancelRequest.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Cancel request has already been processed'
        });
      }

      // Reject the cancel request
      await cancelRequest.reject(req.user.id, adminNotes);

      // Update the lead partner assignment - remove cancellation flags
      const lead = await Lead.findById(cancelRequest.lead._id);
      const partnerAssignment = lead.partnerAssignments.find(
        assignment => assignment.partner.toString() === cancelRequest.partner._id.toString()
      );

      if (partnerAssignment) {
        partnerAssignment.cancellationRequested = false;
        partnerAssignment.cancellationReason = null;
        partnerAssignment.cancellationRequestedAt = null;
        await lead.save();
      }

      logger.info(`Cancel request ${cancelRequest._id} rejected by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Cancel request rejected successfully',
        data: {
          requestId: cancelRequest._id,
          leadId: cancelRequest.lead.leadId,
          status: 'rejected',
          processedAt: cancelRequest.processedAt,
          adminNotes
        }
      });

    } catch (error) {
      logger.error('Error rejecting cancel request:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while rejecting cancel request'
      });
    }
  }
);

// @route   GET /api/cancel-requests/stats
// @desc    Get cancel request statistics
// @access  Private (Superadmin)
router.get('/stats/overview',
  authenticateToken,
  requireSuperadmin,
  async (req, res) => {
    try {
      const [
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests
      ] = await Promise.all([
        CancelRequest.countDocuments({}),
        CancelRequest.countDocuments({ status: 'pending' }),
        CancelRequest.countDocuments({ status: 'approved' }),
        CancelRequest.countDocuments({ status: 'rejected' })
      ]);

      // Get recent requests
      const recentRequests = await CancelRequest.find()
        .populate('lead', 'leadId serviceType')
        .populate('partner', 'companyName')
        .sort({ requestedAt: -1 })
        .limit(5);

      res.json({
        success: true,
        data: {
          stats: {
            total: totalRequests,
            pending: pendingRequests,
            approved: approvedRequests,
            rejected: rejectedRequests,
            approvalRate: totalRequests > 0 ? Math.round((approvedRequests / (approvedRequests + rejectedRequests)) * 100) : 0
          },
          recentRequests
        }
      });

    } catch (error) {
      logger.error('Error fetching cancel request stats:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching cancel request statistics'
      });
    }
  }
);

module.exports = router;