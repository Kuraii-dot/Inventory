// frontend/src/api/allocations.js
import client from './client.js';
import { cachedGet, invalidateApiCache } from './cache.js';

const stockPrefixes = ['/items', '/dashboard', '/allocations', '/distributions'];
const mutate = async request => { const response = await request; invalidateApiCache(stockPrefixes); return response.data; };

export const fetchAllocations = (params, options = {}) => cachedGet('/allocations', { params, ttl: 15_000, ...options });
export const fetchAllocationById = (id, options = {}) => cachedGet(`/allocations/${id}`, { ttl: 15_000, ...options });
export const createAllocation = (data) => mutate(client.post('/allocations', data));
export const updateAllocation = (id, data) => mutate(client.put(`/allocations/${id}`, data));
export const deleteAllocation = (id) => mutate(client.delete(`/allocations/${id}`));
export const returnAllocation = (id, data) => mutate(client.post(`/allocations/${id}/return`, data));

// frontend/src/api/distributions.js
export const fetchDistributions = (params, options = {}) => cachedGet('/distributions', { params, ttl: 15_000, ...options });
export const fetchDistributionById = (id, options = {}) => cachedGet(`/distributions/${id}`, { ttl: 15_000, ...options });
export const createDistribution = (data) => mutate(client.post('/distributions', data));
export const updateDistribution = (id, data) => mutate(client.put(`/distributions/${id}`, data));
export const deleteDistribution = (id) => mutate(client.delete(`/distributions/${id}`));
export const returnDistribution = (id, data) => mutate(client.post(`/distributions/${id}/return`, data));
