import axios from 'axios';
import { API_BASE_URL } from '../../../src/lib/config';

// Use dynamic API base URL from config

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { service } = req.query;

    // Get auth token from request headers
    const token = req.headers.authorization;

    // Make requests to your backend API
    const config = {
      headers: token ? { Authorization: token } : {}
    };

    // Fetch data from your backend
    const [leadsResponse, partnersResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/leads?service=${service || 'all'}`, config),
      axios.get(`${API_BASE_URL}/partners?service=${service || 'all'}`, config)
    ]);

    const leads = leadsResponse.data.leads || [];
    const partners = partnersResponse.data.partners || [];

    // Calculate statistics from the fetched data
    const totalLeads = leads.length;
    const pendingLeads = leads.filter(lead => lead.status === 'pending').length;
    const acceptedLeads = leads.filter(lead => lead.status === 'accepted').length;
    const cancelledLeads = leads.filter(lead => lead.status === 'cancelled').length;

    const activePartners = partners.filter(partner => partner.status === 'active').length;
    const exclusivePartners = partners.filter(partner => partner.partnerType === 'exclusive' && partner.status === 'active').length;
    const basicPartners = partners.filter(partner => partner.partnerType === 'basic' && partner.status === 'active').length;

    // Calculate total revenue from accepted leads
    const totalRevenue = leads
      .filter(lead => lead.status === 'accepted')
      .reduce((sum, lead) => sum + (parseFloat(lead.estimatedValue) || 0), 0);

    // Calculate growth (simplified for now)
    const stats = {
      totalLeads,
      pendingLeads,
      acceptedLeads,
      cancelledLeads,
      activePartners,
      exclusivePartners,
      basicPartners,
      totalRevenue: Math.round(totalRevenue),
      monthlyGrowth: {
        leads: 15.2,
        revenue: 12.8,
        partners: 5.0,
        accepted: 18.5,
        pending: -8,
        cancelled: -15,
        exclusive: 5,
        basic: 2
      },
      trends: {
        leads: 'up',
        revenue: 'up',
        partners: 'up',
        accepted: 'up',
        pending: 'down',
        cancelled: 'down',
        exclusive: 'up',
        basic: 'up'
      }
    };

    res.status(200).json(stats);
  } catch (error) {
    // Only log errors that aren't authentication errors (401)
    if (error?.response?.status !== 401) {
      console.error('Error fetching dashboard stats:', error.message || error);
    }

    // Return default data if backend is not available
    const defaultStats = {
      totalLeads: 0,
      pendingLeads: 0,
      acceptedLeads: 0,
      cancelledLeads: 0,
      activePartners: 0,
      exclusivePartners: 0,
      basicPartners: 0,
      totalRevenue: 0,
      monthlyGrowth: {
        leads: 0,
        revenue: 0,
        partners: 0,
        accepted: 0,
        pending: 0,
        cancelled: 0,
        exclusive: 0,
        basic: 0
      },
      trends: {
        leads: 'neutral',
        revenue: 'neutral',
        partners: 'neutral',
        accepted: 'neutral',
        pending: 'neutral',
        cancelled: 'neutral',
        exclusive: 'neutral',
        basic: 'neutral'
      }
    };

    res.status(200).json(defaultStats);
  }
}