import api from './api';

/**
 * Address Service
 * API calls for user saved addresses + India Post pincode lookup.
 */

export const addressService = {
  list: async () => {
    const res = await api.get('/addresses');
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/addresses', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/addresses/${id}`, data);
    return res.data;
  },

  setDefault: async (id) => {
    const res = await api.patch(`/addresses/${id}/default`);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/addresses/${id}`);
    return res.data;
  },

  /**
   * Look up city + state from an Indian pincode using the free India Post API.
   * Returns { city, state } or null if not found.
   */
  lookupPincode: async (pincode) => {
    if (!/^\d{6}$/.test(pincode)) return null;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        return {
          city: po.District || po.Name,
          state: po.State
        };
      }
      return null;
    } catch {
      return null;
    }
  }
};
