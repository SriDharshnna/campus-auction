/**
 * API SERVICE LAYER
 *
 * Provides a clean interface for frontend components to interact with the backend API.
 * In later modules, real backend routes (/api/auth, /api/auctions, etc.) will be connected here.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const api = {
  // Health
  checkHealth: async () => {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // Auth placeholders (will connect to Module 3 backend)
  login: async (credentials) => {
    // Will call POST /api/auth/login
    console.log('[API] Login called with:', credentials.email);
    return { ok: true };
  },

  register: async (userData) => {
    // Will call POST /api/auth/register
    console.log('[API] Register called with:', userData.email);
    return { ok: true };
  },

  // Auctions placeholders (will connect to Module 4 & 5 backend)
  getAuctions: async (filters = {}) => {
    // In Module 4, this calls GET /api/auctions?category=...&search=...
    console.log('[API] getAuctions called with filters:', filters);
    return null;
  },

  getAuctionById: async (id) => {
    // In Module 4, this calls GET /api/auctions/:id
    console.log('[API] getAuctionById called with id:', id);
    return null;
  },

  createListing: async (listingData) => {
    // In Module 4, this calls POST /api/auctions
    console.log('[API] createListing called with:', listingData);
    return { ok: true };
  },

  placeBid: async (auctionId, amount) => {
    // In Module 5, this calls POST /api/auctions/:id/bids
    console.log('[API] placeBid called:', { auctionId, amount });
    return { ok: true };
  }
};
