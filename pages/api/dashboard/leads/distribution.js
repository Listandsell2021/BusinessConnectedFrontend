import axios from 'axios';
import { API_BASE_URL } from '../../../../src/lib/config';

// Use dynamic API base URL from config

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { service } = req.query;

    // Get auth token from request headers
    const token = req.headers.authorization;

    // Make request to your backend API
    const config = {
      headers: token ? { Authorization: token } : {}
    };

    // Fetch lead distribution data from your backend
    const response = await axios.get(`${API_BASE_URL}/leads/distribution?service=${service || 'all'}`, config);

    res.status(200).json(response.data);
  } catch (error) {
    // Only log errors that aren't authentication errors (401)
    if (error?.response?.status !== 401) {
      console.error('Error fetching lead distribution:', error.message || error);
    }

    // Return default data if backend is not available
    const statusColors = {
      'pending': '#3b82f6',
      'assigned': '#8b5cf6',
      'accepted': '#10b981',
      'cancelled': '#f59e0b',
      'rejected': '#ef4444'
    };

    const serviceColors = {
      'moving': '#667eea',
      'cleaning': '#f093fb'
    };

    const allStatuses = ['pending', 'assigned', 'accepted', 'cancelled', 'rejected'];
    const byStatus = allStatuses.map(status => ({
      status,
      count: 0,
      color: statusColors[status]
    }));

    const allServices = ['moving', 'cleaning'];
    const byService = allServices.map(serviceType => ({
      service: serviceType,
      count: 0,
      color: serviceColors[serviceType]
    }));

    const defaultData = {
      byStatus,
      byService,
      total: 0
    };

    res.status(200).json(defaultData);
  }
}