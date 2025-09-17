import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { tokens } = response.data;
          const newToken = tokens?.accessToken || response.data.token;
          const newRefreshToken = tokens?.refreshToken;
          
          if (newToken) {
            localStorage.setItem('token', newToken);
            if (newRefreshToken) {
              localStorage.setItem('refreshToken', newRefreshToken);
            }
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            
            processQueue(null, newToken);
            
            originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
            return api(originalRequest);
          }
        }
        
        // If refresh fails, logout
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        delete api.defaults.headers.common['Authorization'];
        
        processQueue(error, null);
        window.location.href = '/auth/login';
        
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        delete api.defaults.headers.common['Authorization'];
        
        window.location.href = '/auth/login';
      } finally {
        isRefreshing = false;
      }
    }
    
    // Don't show error toast for 401s as they're handled above
    // Also don't show automatic toasts for partner creation and lead access to avoid duplicates
    if (error.response?.status !== 401 && !error.config?.url?.includes('/partners') && !error.config?.url?.includes('/leads/')) {
      if (error.response?.data?.message) {
        // Show shorter message for access denied errors
        if (error.response?.status === 403 && error.response?.data?.message?.toLowerCase().includes('access')) {
          toast.error('Accept first to see details');
        } else {
          toast.error(error.response.data.message);
        }
      } else if (error.message && !error.message.includes('Network Error')) {
        toast.error(error.message);
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token })
};

export const leadsAPI = {
  getAll: (params) => api.get('/leads', { params }),
  getById: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  getAvailablePartners: (id) => api.get(`/leads/${id}/available-partners`),
  assign: (id, partnerId) => api.put(`/leads/${id}/assign`, { partnerId }),
  accept: (id) => api.put(`/leads/${id}/accept`),
  updateStatus: (id, status) => api.patch(`/leads/${id}/status`, { status }),
  export: (format, filters) => api.get(`/leads/export/${format}`, { 
    params: filters,
    responseType: 'blob'
  }),
  getStats: () => api.get('/leads/stats'),
  createMovingLead: (data) => api.post('/leads/moving', data),
  createCleaningLead: (data) => api.post('/leads/cleaning', data),
  // Cancel requests APIs
  getCancelledRequests: (params) => api.get('/leads/cancel-requests', { params }),
  createCancelRequest: (leadId, data) => api.post(`/leads/${leadId}/cancel-request`, data),
  approveCancelRequest: (requestId) => api.put(`/leads/cancel-requests/${requestId}/approve`),
  cancelLead: (leadId, data) => api.post(`/leads/${leadId}/cancel`, data),
  rejectCancelRequest: (requestId, reason) => api.put(`/leads/cancel-requests/${requestId}/reject`, { reason })
};

export const partnersAPI = {
  getAll: (params) => api.get('/partners', { params }),
  search: (params) => api.get('/partners/search', { params }),
  getById: (id) => api.get(`/partners/${id}`),
  create: (data) => api.post('/partners', data),
  update: (id, data) => api.put(`/partners/${id}`, data),
  delete: (id) => api.delete(`/partners/${id}`),
  updateStatus: (id, status) => api.put(`/partners/${id}/status`, { status }),
  updateType: (id, partnerType) => api.put(`/partners/${id}/type`, { partnerType }),
  updateServiceStatus: (id, serviceType, status, reason) => api.put(`/partners/${id}/services/${serviceType}/status`, { status, reason }),
  approveService: (id, serviceType) => api.put(`/partners/${id}/services/${serviceType}/status`, { status: 'active' }),
  rejectService: (id, serviceType, reason) => api.put(`/partners/${id}/services/${serviceType}/status`, { status: 'rejected', reason }),
  getStats: () => api.get('/partners/stats'),
  getLeads: (id, params) => api.get(`/partners/${id}/leads`, { params }),
  export: (format) => api.get(`/partners/export/${format}`, { responseType: 'blob' })
};

export const dashboardAPI = {
  getStats: (role) => api.get(`/dashboard/stats/${role}`),
  getCharts: (role, period) => api.get(`/dashboard/charts/${role}`, { params: { period } }),
  getRecentActivity: (role, limit) => api.get(`/dashboard/activity/${role}`, { params: { limit } })
};

export const logsAPI = {
  getAll: (params) => api.get('/logs', { params }),
  getPartnerLogs: (partnerId, params) => api.get(`/logs/partner/${partnerId}`, { params }),
  getLeadTimeline: (leadId) => api.get(`/logs/lead/${leadId}`),
  getAnalytics: (params) => api.get('/logs/analytics', { params }),
  export: (format, filters) => api.get(`/logs/export/${format}`, { 
    params: filters,
    responseType: 'blob'
  })
};

export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  markPaid: (id) => api.patch(`/invoices/${id}/paid`),
  generatePDF: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  getStats: () => api.get('/invoices/stats'),
  export: (format, filters) => api.get(`/invoices/export/${format}`, { 
    params: filters,
    responseType: 'blob'
  })
};

export const revenueAPI = {
  getAll: (params) => api.get('/revenue', { params }),
  getPartnerRevenue: (partnerId, params) => api.get(`/revenue/partner/${partnerId}`, { params }),
  create: (data) => api.post('/revenue', data),
  updateStatus: (id, data) => api.put(`/revenue/${id}/status`, data),
  getAnalytics: (params) => api.get('/revenue/analytics', { params }),
  export: (format, filters) => api.get(`/revenue/export`, { 
    params: { format, ...filters },
    responseType: format === 'csv' ? 'blob' : 'json'
  })
};

export const servicesAPI = {
  getMovingServices: () => api.get('/services/moving'),
  getCleaningServices: () => api.get('/services/cleaning'),
  calculateQuote: (data) => api.post('/services/calculate-quote', data)
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data)
};

export default api;