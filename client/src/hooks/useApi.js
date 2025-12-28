import { useState, useCallback } from 'react';

const API_BASE = '';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  const get = useCallback((endpoint) => request(endpoint), [request]);

  const post = useCallback(
    (endpoint, data) =>
      request(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    [request]
  );

  const put = useCallback(
    (endpoint, data) =>
      request(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    [request]
  );

  const del = useCallback(
    (endpoint) =>
      request(endpoint, {
        method: 'DELETE',
      }),
    [request]
  );

  return { get, post, put, del, loading, error };
}

// Inventory API
export function useInventory() {
  const { get, post, put, del, loading, error } = useApi();

  return {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return get(`/inventory${query ? `?${query}` : ''}`);
    },
    getOne: (id) => get(`/inventory/${id}`),
    create: (data) => post('/inventory', data),
    update: (id, data) => put(`/inventory/${id}`, data),
    remove: (id) => del(`/inventory/${id}`),
    loading,
    error,
  };
}

// Sales API
export function useSales() {
  const { get, post, put, del, loading, error } = useApi();

  return {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return get(`/sales${query ? `?${query}` : ''}`);
    },
    getStats: () => get('/sales/stats'),
    getByPlatform: () => get('/sales/by-platform'),
    getByCategory: () => get('/sales/by-category'),
    getMonthly: () => get('/sales/monthly'),
    getRecent: (limit = 10) => get(`/sales/recent?limit=${limit}`),
    create: (data) => post('/sales', data),
    update: (id, data) => put(`/sales/${id}`, data),
    remove: (id) => del(`/sales/${id}`),
    loading,
    error,
  };
}

// Overhead API
export function useOverhead() {
  const { get, post, put, del, loading, error } = useApi();

  return {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return get(`/overhead${query ? `?${query}` : ''}`);
    },
    getMonthly: () => get('/overhead/monthly'),
    getCurrentMonth: () => get('/overhead/current-month'),
    create: (data) => post('/overhead', data),
    update: (id, data) => put(`/overhead/${id}`, data),
    remove: (id) => del(`/overhead/${id}`),
    loading,
    error,
  };
}

// Settings API
export function useSettings() {
  const { get, put, del, loading, error } = useApi();

  return {
    getAll: () => get('/settings'),
    update: (key, value) => put(`/settings/${key}`, { value }),
    getSkuNames: () => get('/settings/sku-names'),
    updateSkuName: (sku, short_name) => put(`/settings/sku-names/${sku}`, { short_name }),
    deleteSkuName: (sku) => del(`/settings/sku-names/${sku}`),
    exportData: () => get('/settings/export'),
    exportCsv: (type) => `/settings/export/csv?type=${type}`,
    loading,
    error,
  };
}

// API Status
export function useApiStatus() {
  const { get, loading, error } = useApi();

  return {
    checkStatus: () => get('/api/status'),
    loading,
    error,
  };
}
