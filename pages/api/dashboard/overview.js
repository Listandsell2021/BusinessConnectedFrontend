import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get auth token from request headers
    const token = req.headers.authorization;

    // Make request to your backend API
    const config = {
      headers: token ? { Authorization: token } : {}
    };

    // Fetch overview data from your backend
    const response = await axios.get(`${API_BASE_URL}/dashboard/overview`, config);

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);

    // Return default data if backend is not available
    const defaultOverview = {
      lastUpdated: new Date(),
      summary: {
        totalLeads: 0,
        totalRevenue: 0,
        activePartners: 0,
        conversionRate: 0
      },
      recentActivity: []
    };

    res.status(200).json(defaultOverview);
  }
}