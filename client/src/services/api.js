/**
 * API SERVICE LAYER
 *
 * Real HTTP client connected to the Express backend.
 * Uses credentialed requests (cookies) + Bearer token support.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const getAuthHeaders = () => {
  const token = localStorage.getItem('campus_auction_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const errorMsg = data?.message || `HTTP Error ${res.status}: ${res.statusText}`;
    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const api = {
  // Health
  checkHealth: async () => {
    const res = await fetch(`${API_BASE}/api/health`);
    return handleResponse(res);
  },

  // Auth Endpoints (Module 3 - Connected to Real Backend)
  register: async (userData) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },

  login: async (credentials) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials)
    });
    return handleResponse(res);
  },

  logout: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      return handleResponse(res);
    } catch {
      // In case network fails, still resolve locally
      return { ok: true };
    }
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    return handleResponse(res);
  },

  // Auctions Endpoints (Module 4 - Connected to Real Backend)
  getAuctions: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, val);
      }
    });
    const queryString = params.toString();
    const url = `${API_BASE}/api/auctions${queryString ? `?${queryString}` : ''}`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  getAuctionById: async (id) => {
    const res = await fetch(`${API_BASE}/api/auctions/${id}`);
    return handleResponse(res);
  },

  createListing: async (listingData) => {
    const res = await fetch(`${API_BASE}/api/auctions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(listingData)
    });
    return handleResponse(res);
  },

  updateListing: async (id, updateData) => {
    const res = await fetch(`${API_BASE}/api/auctions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(updateData)
    });
    return handleResponse(res);
  },

  cancelListing: async (id, reason = 'Seller cancelled listing') => {
    const res = await fetch(`${API_BASE}/api/auctions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  // Image Upload Endpoint (multipart/form-data)
  uploadImages: async (files) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
    const token = localStorage.getItem('campus_auction_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData
    });
    return handleResponse(res);
  },

  askQuestion: async (id, questionData) => {
    const res = await fetch(`${API_BASE}/api/auctions/${id}/questions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(questionData)
    });
    return handleResponse(res);
  },

  // Module 5: Bidding Endpoints
  placeBid: async (auctionId, amount) => {
    const res = await fetch(`${API_BASE}/api/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ amount: Number(amount) })
    });
    return handleResponse(res);
  },

  getBidHistory: async (auctionId) => {
    const res = await fetch(`${API_BASE}/api/auctions/${auctionId}/bids`);
    return handleResponse(res);
  },

  // Module 7: Transactions & Campus Handover Endpoints
  getTransactions: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, val);
      }
    });
    const queryString = params.toString();
    const res = await fetch(`${API_BASE}/api/transactions${queryString ? `?${queryString}` : ''}`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    return handleResponse(res);
  },

  getMyBids: async () => {
    const res = await fetch(`${API_BASE}/api/transactions/my-bids`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    return handleResponse(res);
  },

  getTransactionById: async (id) => {
    const res = await fetch(`${API_BASE}/api/transactions/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    return handleResponse(res);
  },

  approveTransaction: async (id) => {
    const res = await fetch(`${API_BASE}/api/transactions/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    return handleResponse(res);
  },

  selectPaymentMethod: async (id, method) => {
    const res = await fetch(`${API_BASE}/api/transactions/${id}/payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ method })
    });
    return handleResponse(res);
  },

  verifyUpiPayment: async (id, referenceId) => {
    const res = await fetch(`${API_BASE}/api/transactions/${id}/verify-upi`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ referenceId })
    });
    return handleResponse(res);
  },

  rejectTransaction: async (id, reason) => {
    const res = await fetch(`${API_BASE}/api/transactions/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  confirmHandover: async (id, notes) => {
    const res = await fetch(`${API_BASE}/api/transactions/${id}/handover`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ notes })
    });
    return handleResponse(res);
  },

  reportFailedPickup: async (id, reason) => {
    const res = await fetch(`${API_BASE}/api/transactions/${id}/fail-pickup`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  cancelTransaction: async (id, reason) => {
    const res = await fetch(`${API_BASE}/api/transactions/${id}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  // Module 7: Notification Endpoints
  getNotifications: async (unreadOnly = false) => {
    const res = await fetch(`${API_BASE}/api/notifications${unreadOnly ? '?unreadOnly=true' : ''}`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    return handleResponse(res);
  },

  markNotificationRead: async (id) => {
    const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    return handleResponse(res);
  },

  markAllNotificationsRead: async () => {
    const res = await fetch(`${API_BASE}/api/notifications/mark-all-read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    return handleResponse(res);
  }
};
