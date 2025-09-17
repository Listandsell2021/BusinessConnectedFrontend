import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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

    // Fetch partner performance data from your backend
    const response = await axios.get(`${API_BASE_URL}/partners/performance?service=${service || 'all'}`, config);

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching partner performance:', error);

    // Return default data if backend is not available
    const defaultData = [];

    res.status(200).json(defaultData);
  }
}