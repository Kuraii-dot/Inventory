// frontend/src/api/allocations.js
import client from './client.js';

export const fetchAllocations   = (params) => client.get('/allocations', { params }).then(r => r.data);
export const fetchAllocationById = (id)    => client.get(`/allocations/${id}`).then(r => r.data);
export const createAllocation   = (data)   => client.post('/allocations', data).then(r => r.data);
export const updateAllocation   = (id, data) => client.put(`/allocations/${id}`, data).then(r => r.data);
export const deleteAllocation   = (id)     => client.delete(`/allocations/${id}`).then(r => r.data);
export const returnAllocation   = (id, data) => client.post(`/allocations/${id}/return`, data).then(r => r.data);

// frontend/src/api/distributions.js
export const fetchDistributions   = (params)   => client.get('/distributions', { params }).then(r => r.data);
export const fetchDistributionById = (id)      => client.get(`/distributions/${id}`).then(r => r.data);
export const createDistribution   = (data)     => client.post('/distributions', data).then(r => r.data);
export const updateDistribution   = (id, data) => client.put(`/distributions/${id}`, data).then(r => r.data);
export const deleteDistribution   = (id)       => client.delete(`/distributions/${id}`).then(r => r.data);
export const returnDistribution   = (id, data) => client.post(`/distributions/${id}/return`, data).then(r => r.data);