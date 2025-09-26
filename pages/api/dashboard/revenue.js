import axios from 'axios';
import { API_BASE_URL } from '../../../src/lib/config';

// Use dynamic API base URL from config

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { range = '7d', service } = req.query;

    // Get auth token from request headers
    const token = req.headers.authorization;

    // Make request to your backend API
    const config = {
      headers: token ? { Authorization: token } : {}
    };

    // Fetch revenue data from your backend
    const response = await axios.get(`${API_BASE_URL}/revenue?range=${range}&service=${service || 'all'}`, config);

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching revenue data:', error);

    // Return default data if backend is not available
    const { range = '7d' } = req.query;
    let days;
    let labels;

    switch (range) {
      case '7d':
        days = 7;
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        break;
      case '30d':
        days = 30;
        labels = Array.from({length: days}, (_, i) => `${i + 1}`);
        break;
      case '90d':
        days = 90;
        labels = Array.from({length: days}, (_, i) => `${i + 1}`);
        break;
      default:
        days = 7;
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    }

    const defaultData = {
      labels,
      moving: Array(days).fill(0),
      cleaning: Array(days).fill(0)
    };

    res.status(200).json(defaultData);
  }
}